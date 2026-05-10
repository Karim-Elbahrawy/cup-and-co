/**
 * Phase K6.1 — kiosks registry.
 *
 * Tracks every iPad that has called in. Entries are auto-created on the
 * first heartbeat for that x-kiosk-id (zero-config bootstrap), then admin
 * can rename them via PATCH /admin/kiosks/:id.
 *
 * State that lives here:
 *   - id (uuid, the value the kiosk sends in x-kiosk-id)
 *   - name (display name; admin-editable)
 *   - active (bool; admins can disable a retired iPad)
 *   - lastSeenAt (ms since epoch; populated on every heartbeat)
 *   - lastState (which screen the customer is on — 'attract' | 'browsing'
 *     | 'customizing' | 'checkout' | 'confirmation' | 'cleaning')
 *   - version (kiosk app build sha; useful when rolling out staged updates)
 *
 * Persistence (SHIP-PLAN Phase 2.1):
 *   - Source of truth in process is the `kiosks` Map below — kept hot for
 *     sync access from the catalog/order hot path.
 *   - When SUPABASE is configured, the Map hydrates lazily on first read
 *     from the `kiosk_devices` table, and every mutation is mirrored back
 *     fire-and-forget. Survives a Render redeploy.
 *   - When SUPABASE is unset (dev / vitest), the Map IS the truth.
 */
import { config } from '../config.js';
import { getServiceClient } from './supabase.js';

export type KioskState =
  | 'attract'
  | 'browsing'
  | 'customizing'
  | 'checkout'
  | 'confirmation'
  | 'cleaning'
  | 'unknown';

export interface Kiosk {
  id: string;
  name: string;
  active: boolean;
  lastSeenAt: number;
  lastState: KioskState;
  version: string | null;
  createdAt: number;
}

const kiosks = new Map<string, Kiosk>();

// Lazy hydrate: we only hit Supabase the first time something asks. After
// that the Map is hot. A second instance scaling up will hit `select` once
// to catch up; subsequent writes from the other instance won't be visible
// until that instance restarts (acceptable — kiosk state is owned by the
// kiosk's heartbeat which always lands on its own pod first).
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

/** Default human-readable name when a kiosk first checks in. */
function defaultName(kioskId: string): string {
  return `Kiosk ${kioskId.slice(0, 8)}`;
}

/**
 * Whether Supabase is configured in a way that makes a remote read safe.
 * Mirrors `catalogRepo.isSupabaseReady` to keep behavior consistent across
 * the in-memory-fallback codebase.
 */
function isSupabaseReady(): boolean {
  return !!(
    config.supabase.serviceRoleKey &&
    config.supabase.url &&
    !config.supabase.url.includes('127.0.0.1:54321')
  );
}

/** ─── Row mapping (DB ↔ Kiosk) ────────────────────────────────────────── */

interface KioskDeviceRow {
  id: string;
  name: string;
  active: boolean;
  last_seen_at: string;
  last_state: KioskState;
  version: string | null;
  created_at: string;
}

function rowToKiosk(row: KioskDeviceRow): Kiosk {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    lastSeenAt: new Date(row.last_seen_at).getTime(),
    lastState: row.last_state,
    version: row.version,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function kioskToRow(k: Kiosk): KioskDeviceRow {
  return {
    id: k.id,
    name: k.name,
    active: k.active,
    last_seen_at: new Date(k.lastSeenAt).toISOString(),
    last_state: k.lastState,
    version: k.version,
    created_at: new Date(k.createdAt).toISOString(),
  };
}

/** ─── Hydration + write-through ──────────────────────────────────────── */

/**
 * Pull every kiosk row from Supabase into the in-memory Map. Idempotent —
 * subsequent calls are no-ops once `hydrated` is true. The lazy gate keeps
 * the cost off the cold-path of dev/test runs that never touch Supabase.
 */
function hydrateOnce(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (!isSupabaseReady()) {
    hydrated = true;
    return Promise.resolve();
  }
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const sb = getServiceClient();
      const { data, error } = await sb.from('kiosk_devices').select('*');
      if (error) throw error;
      for (const row of (data ?? []) as KioskDeviceRow[]) {
        // Don't clobber a hot-write that landed during hydration.
        if (!kiosks.has(row.id)) kiosks.set(row.id, rowToKiosk(row));
      }
      hydrated = true;
    } catch (err) {
      // Swallow — the API survives without persistence; surfacing the
      // error would 500 every kiosk endpoint. Log once and carry on.
      // eslint-disable-next-line no-console
      console.error('[kiosksStore] hydrate from Supabase failed:', err);
      hydrated = true;
    } finally {
      hydratePromise = null;
    }
  })();
  return hydratePromise;
}

/**
 * Write-through: persist a row asynchronously. Fire-and-forget — the in-
 * memory Map already has the truth and the caller has its response. We
 * log on failure so an outage shows up in Sentry/console without breaking
 * the hot path.
 */
function persist(kiosk: Kiosk): void {
  if (!isSupabaseReady()) return;
  const sb = getServiceClient();
  void sb
    .from('kiosk_devices')
    .upsert(kioskToRow(kiosk), { onConflict: 'id' })
    .then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[kiosksStore] persist failed:', error.message);
      }
    });
}

/** ─── Public API (sync, unchanged signatures) ────────────────────────── */

/**
 * Record a heartbeat. Auto-creates the row on first contact so a fresh
 * iPad doesn't need any pre-provisioning step. Returns the (possibly new)
 * Kiosk record.
 */
export function recordHeartbeat(args: {
  kioskId: string;
  state: KioskState;
  version: string | null;
}): Kiosk {
  // Hydrate-on-first-touch — non-blocking, the in-memory write below is
  // authoritative for this request.
  void hydrateOnce();

  const now = Date.now();
  const existing = kiosks.get(args.kioskId);
  if (existing) {
    existing.lastSeenAt = now;
    existing.lastState = args.state;
    existing.version = args.version ?? existing.version;
    persist(existing);
    return existing;
  }
  const created: Kiosk = {
    id: args.kioskId,
    name: defaultName(args.kioskId),
    active: true,
    lastSeenAt: now,
    lastState: args.state,
    version: args.version,
    createdAt: now,
  };
  kiosks.set(args.kioskId, created);
  persist(created);
  return created;
}

/** Return all kiosks, freshest heartbeat first. */
export function listKiosks(): Kiosk[] {
  void hydrateOnce();
  return Array.from(kiosks.values()).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}

export function getKiosk(id: string): Kiosk | undefined {
  void hydrateOnce();
  return kiosks.get(id);
}

/**
 * Admin update. Only mutable fields are name + active — id and lastSeen
 * fields are owned by the kiosk itself.
 */
export function updateKiosk(
  id: string,
  patch: { name?: string; active?: boolean },
): Kiosk | null {
  void hydrateOnce();
  const k = kiosks.get(id);
  if (!k) return null;
  if (patch.name !== undefined) k.name = patch.name;
  if (patch.active !== undefined) k.active = patch.active;
  persist(k);
  return k;
}

/** Test helper — wipe registry between describe blocks. */
export function resetKiosksForTests(): void {
  kiosks.clear();
  hydrated = false;
  hydratePromise = null;
}
