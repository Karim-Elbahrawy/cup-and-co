/**
 * IndexedDB-backed offline queue for kiosk orders (K5.1).
 *
 * Design choices:
 *   - Native IndexedDB API (no `idb` library) — keeps the kiosk bundle
 *     small, and the API surface here is intentionally narrow (5 ops).
 *   - One database, one store. Schema versioning via `DB_VERSION` so a
 *     future kiosk update can migrate without losing pending orders.
 *   - Each entry holds the FULL POST body that would have been sent to
 *     /orders, plus retry metadata. We replay the same body verbatim on
 *     reconnect so the server sees exactly the order the customer
 *     intended.
 *   - Client-generated temp pickup code (4 digits) so the customer has
 *     something to show the cashier. Server replaces it with the canonical
 *     pickup code on sync — but the temp code is what the cashier sees on
 *     the kiosk screen until then.
 *
 * The wrapper is intentionally framework-free — `useOfflineQueue.ts`
 * layers React + zustand on top.
 */

const DB_NAME = 'cup-co-kiosk';
const DB_VERSION = 1;
const STORE = 'pending_orders';

/** Body shape sent to POST /orders. Loose-typed by design — the kiosk
 * only needs to roundtrip it intact, not understand its shape. */
export type QueuedOrderBody = Record<string, unknown>;

export interface QueuedOrder {
  tempId: string;
  tempPickupCode: string;
  body: QueuedOrderBody;
  /**
   * If the user identified via OTP, we stash their JWT so we can attribute
   * the order on sync. JWTs survive PWA cold-start since they're written
   * to IndexedDB along with the body — but Karim's K4.4 useIdentified
   * store is in-memory only, so the next session won't have the JWT
   * anyway. That's fine: a JWT here is best-effort.
   */
  userJwt?: string;
  /** ms since epoch when the customer placed the order. */
  createdAt: number;
  /** Last attempted sync time, ms since epoch (0 = never). */
  lastAttemptAt: number;
  /** How many flush attempts have failed for this entry. */
  retryCount: number;
  /** Last error message (for debugging on the kiosk; user never sees it). */
  lastError: string | null;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'tempId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
  });
  return dbPromise;
}

function tx(
  mode: IDBTransactionMode,
): Promise<{ store: IDBObjectStore; done: Promise<void> }> {
  return openDb().then((db) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const done = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('IDB transaction failed'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('IDB transaction aborted'));
    });
    return { store, done };
  });
}

function newTempId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 4-digit pickup code, prefixed digit ≠ 0 so it reads naturally. */
export function generateTempPickupCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Append a new pending order. Returns the row written. */
export async function enqueueOrder(args: {
  body: QueuedOrderBody;
  userJwt?: string;
}): Promise<QueuedOrder> {
  const row: QueuedOrder = {
    tempId: newTempId(),
    tempPickupCode: generateTempPickupCode(),
    body: args.body,
    userJwt: args.userJwt,
    createdAt: Date.now(),
    lastAttemptAt: 0,
    retryCount: 0,
    lastError: null,
  };
  const { store, done } = await tx('readwrite');
  store.put(row);
  await done;
  return row;
}

/** Read every pending order, sorted oldest-first (FIFO). */
export async function peekAll(): Promise<QueuedOrder[]> {
  const { store, done } = await tx('readonly');
  const rows: QueuedOrder[] = [];
  const req = store.openCursor();
  return new Promise<QueuedOrder[]>((resolve, reject) => {
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        rows.push(cursor.value as QueuedOrder);
        cursor.continue();
      } else {
        done.then(() => resolve(rows.sort((a, b) => a.createdAt - b.createdAt))).catch(reject);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Number of pending entries. Cheap variant of peekAll for UI counters. */
export async function pendingCount(): Promise<number> {
  const { store, done } = await tx('readonly');
  return new Promise<number>((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => done.then(() => resolve(req.result)).catch(reject);
    req.onerror = () => reject(req.error);
  });
}

/** Remove a synced order by temp id. */
export async function removeOrder(tempId: string): Promise<void> {
  const { store, done } = await tx('readwrite');
  store.delete(tempId);
  await done;
}

/** Update retry metadata on a row that just failed to sync. */
export async function recordFailure(
  tempId: string,
  error: string,
): Promise<void> {
  const { store, done } = await tx('readwrite');
  const req = store.get(tempId);
  await new Promise<void>((resolve, reject) => {
    req.onsuccess = () => {
      const row = req.result as QueuedOrder | undefined;
      if (!row) return resolve();
      row.lastAttemptAt = Date.now();
      row.retryCount += 1;
      row.lastError = error;
      store.put(row);
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
  await done;
}

/** Test/debug — wipe the queue. Not exported via the queue store (the UI
 *  has no use for "clear all"); kept here so devtools / Cypress can call it. */
export async function clearQueue(): Promise<void> {
  const { store, done } = await tx('readwrite');
  store.clear();
  await done;
}
