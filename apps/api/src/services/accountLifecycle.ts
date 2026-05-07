/**
 * Account lifecycle service — Phase 1.3 of UPGRADE-PLAN.md.
 *
 * Two responsibilities:
 *   1. Delete-confirmation OTPs   — separate from login OTP so a "delete
 *                                    code" can never be intercepted and
 *                                    reused as a login.
 *   2. In-memory deletion state   — mirror of the Supabase column that
 *                                    `requireAuth` and request handlers
 *                                    consult. Real prod reads from
 *                                    Supabase via RLS; the in-memory
 *                                    layer is for dev/test parity.
 *
 * The cron job (`anonymize_user(uid)` in Postgres) handles the actual
 * hard-delete on day 30. This module never modifies user PII directly.
 */
import { randomUUID } from 'node:crypto';

const DELETE_OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const GRACE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXPORT_RATE_LIMIT_MS = 7 * MS_PER_DAY;

/** Delete-confirmation OTP — keyed by userId, NOT phone. */
const deleteOtps = new Map<string, { code: string; expiresAt: number }>();

/** Per-user deletion state. Cleared on cancel; persisted at hard-delete. */
interface DeletionState {
  deletionRequestedAt: string;
  deletedAt: string | null; // null until confirm; set once confirmed
}
const deletionState = new Map<string, DeletionState>();

/** Per-user export jobs. */
export interface ExportJob {
  id: string;
  userId: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  storagePath: string | null;
  expiresAt: string | null;
  doneAt: string | null;
  error: string | null;
  createdAt: string;
  /**
   * Inline payload for dev/demo runs. Production replaces this with a
   * Supabase Storage signed URL; the in-memory copy goes away.
   */
  payload?: unknown;
}
const exportJobs = new Map<string, ExportJob>();
const exportsByUser = new Map<string, string[]>();

// ============================================================
// Delete OTP
// ============================================================

export function generateDeleteCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function issueDeleteOtp(userId: string): { code: string; expiresAt: number } {
  const code = generateDeleteCode();
  const expiresAt = Date.now() + DELETE_OTP_TTL_MS;
  deleteOtps.set(userId, { code, expiresAt });
  return { code, expiresAt };
}

export function verifyDeleteOtp(userId: string, code: string): boolean {
  const entry = deleteOtps.get(userId);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    deleteOtps.delete(userId);
    return false;
  }
  if (entry.code !== code) return false;
  // Consume on success — single-use.
  deleteOtps.delete(userId);
  return true;
}

// ============================================================
// Deletion state
// ============================================================

/**
 * Mark a user as deletion-pending. Idempotent — a second confirm call
 * within grace just refreshes the timestamp.
 */
export function markDeletionConfirmed(userId: string): DeletionState {
  const now = new Date().toISOString();
  const existing = deletionState.get(userId);
  const state: DeletionState = {
    deletionRequestedAt: existing?.deletionRequestedAt ?? now,
    deletedAt: now,
  };
  deletionState.set(userId, state);
  return state;
}

export function cancelDeletion(userId: string): void {
  deletionState.delete(userId);
}

export function getDeletionState(userId: string): DeletionState | null {
  return deletionState.get(userId) ?? null;
}

/**
 * `true` if this user's account is in the deletion-pending state. Used
 * by request handlers that should reject normal activity (place order,
 * scan QR, etc.) while still allowing the user to sign in once and
 * cancel deletion.
 */
export function isAccountDeleted(userId: string): boolean {
  const s = deletionState.get(userId);
  return s !== null && s !== undefined && s.deletedAt !== null;
}

export function deletionGraceUntil(state: DeletionState): string {
  const requested = new Date(state.deletionRequestedAt).getTime();
  return new Date(requested + GRACE_DAYS * MS_PER_DAY).toISOString();
}

export const ACCOUNT_GRACE_DAYS = GRACE_DAYS;

// ============================================================
// Data exports
// ============================================================

/**
 * Returns true if the user hasn't requested an export in the last 7 days.
 * Used by `POST /me/data/export` to throw 429.
 */
export function canRequestExport(userId: string): boolean {
  const ids = exportsByUser.get(userId) ?? [];
  const now = Date.now();
  for (const id of ids) {
    const job = exportJobs.get(id);
    if (!job) continue;
    if (now - new Date(job.createdAt).getTime() < EXPORT_RATE_LIMIT_MS) {
      if (job.status === 'pending' || job.status === 'running' || job.status === 'done') {
        return false;
      }
    }
  }
  return true;
}

export function createExportJob(userId: string): ExportJob {
  const id = randomUUID();
  const job: ExportJob = {
    id,
    userId,
    status: 'pending',
    storagePath: null,
    expiresAt: null,
    doneAt: null,
    error: null,
    createdAt: new Date().toISOString(),
  };
  exportJobs.set(id, job);
  const list = exportsByUser.get(userId) ?? [];
  list.push(id);
  exportsByUser.set(userId, list);
  return job;
}

export function completeExportJob(id: string, payload: unknown): ExportJob | null {
  const job = exportJobs.get(id);
  if (!job) return null;
  job.status = 'done';
  job.doneAt = new Date().toISOString();
  job.expiresAt = new Date(Date.now() + 7 * MS_PER_DAY).toISOString();
  job.payload = payload;
  // In production this is a Supabase Storage path; in dev we synthesize one
  // for transparency in the API response.
  job.storagePath = `data-exports/${job.userId}/${id}.json`;
  return job;
}

export function failExportJob(id: string, error: string): ExportJob | null {
  const job = exportJobs.get(id);
  if (!job) return null;
  job.status = 'failed';
  job.error = error;
  return job;
}

export function getExportJob(id: string, userId: string): ExportJob | null {
  const job = exportJobs.get(id);
  if (!job) return null;
  if (job.userId !== userId) return null;
  return job;
}
