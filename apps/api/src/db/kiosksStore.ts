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
 * In-memory + process-local for now. Persisted to Supabase later (migration
 * 0013_kiosks.sql is the next step; we ship the store first so the API
 * surface and admin UI can light up immediately on the existing fallback
 * path).
 */

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

/** Default human-readable name when a kiosk first checks in. */
function defaultName(kioskId: string): string {
  return `Kiosk ${kioskId.slice(0, 8)}`;
}

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
  const now = Date.now();
  const existing = kiosks.get(args.kioskId);
  if (existing) {
    existing.lastSeenAt = now;
    existing.lastState = args.state;
    existing.version = args.version ?? existing.version;
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
  return created;
}

/** Return all kiosks, freshest heartbeat first. */
export function listKiosks(): Kiosk[] {
  return Array.from(kiosks.values()).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}

export function getKiosk(id: string): Kiosk | undefined {
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
  const k = kiosks.get(id);
  if (!k) return null;
  if (patch.name !== undefined) k.name = patch.name;
  if (patch.active !== undefined) k.active = patch.active;
  return k;
}

/** Test helper — wipe registry between describe blocks. */
export function resetKiosksForTests(): void {
  kiosks.clear();
}
