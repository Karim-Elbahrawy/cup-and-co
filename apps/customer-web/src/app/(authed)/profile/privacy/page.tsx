'use client';

/**
 * Privacy & Data — Phase 1.3 of docs/UPGRADE-PLAN.md.
 *
 * Two flows:
 *   1. Download my data    — POST /me/data/export → download link
 *   2. Delete my account   — request OTP → confirm OTP → soft-delete with
 *                             30-day grace; can be cancelled by signing
 *                             in and tapping "Cancel deletion".
 *
 * Apple App Store guideline 5.1.1(v) requires in-app account deletion
 * for accounts that can be created in-app. Egypt PDPL Law 151 of 2020
 * grants the right to erasure and the right to data portability.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Trash2, ShieldAlert, RefreshCcw } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

type AccountStatus =
  | { status: 'active' }
  | {
      status: 'deletion_requested' | 'deletion_pending';
      deletionRequestedAt?: string;
      deletedAt?: string | null;
      graceUntil?: string;
      graceDays?: number;
    };

type ExportState =
  | { kind: 'idle' }
  | { kind: 'preparing' }
  | { kind: 'ready'; downloadUrl: string; expiresAt: string | null }
  | { kind: 'rate-limited' }
  | { kind: 'error'; message: string };

type DeleteFlow =
  | { stage: 'idle' }
  | { stage: 'awaiting-code'; expiresAt: string; devCode?: string }
  | { stage: 'confirming' }
  | { stage: 'success'; graceUntil: string; graceDays: number }
  | { stage: 'error'; message: string };

export default function PrivacyPage() {
  const { t, language } = useT();
  const router = useRouter();
  const logout = useSession((s) => s.logout);

  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [exportState, setExportState] = useState<ExportState>({ kind: 'idle' });
  const [deleteFlow, setDeleteFlow] = useState<DeleteFlow>({ stage: 'idle' });
  const [code, setCode] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Load account status on mount.
  useEffect(() => {
    let cancelled = false;
    api
      .accountStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        if (!cancelled) setStatus({ status: 'active' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleExport() {
    setExportState({ kind: 'preparing' });
    try {
      const res = await api.requestDataExport();
      if (res.status !== 'done') {
        // For now the API completes synchronously, so anything else is a
        // server hiccup we can retry by re-tapping.
        setExportState({ kind: 'error', message: t('privacy.error') });
        return;
      }
      setExportState({
        kind: 'ready',
        downloadUrl: res.downloadUrl,
        expiresAt: res.expiresAt,
      });
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err?.status === 429) {
        setExportState({ kind: 'rate-limited' });
      } else {
        setExportState({ kind: 'error', message: t('privacy.error') });
      }
    }
  }

  async function handleRequestCode() {
    try {
      const res = await api.requestAccountDeletion();
      setDeleteFlow({
        stage: 'awaiting-code',
        expiresAt: res.expiresAt,
        devCode: res.devCode,
      });
    } catch {
      setDeleteFlow({ stage: 'error', message: t('privacy.error') });
    }
  }

  async function handleConfirmDelete() {
    if (!/^\d{6}$/.test(code)) {
      setDeleteFlow({ stage: 'error', message: t('privacy.invalidCode') });
      return;
    }
    setDeleteFlow({ stage: 'confirming' });
    try {
      const res = await api.confirmAccountDeletion(code);
      setDeleteFlow({
        stage: 'success',
        graceUntil: res.graceUntil,
        graceDays: res.graceDays,
      });
      // After a moment, sign out and bounce to login. The user can return
      // within `graceDays` to cancel.
      setTimeout(() => {
        logout();
        router.push('/auth/login');
      }, 4000);
    } catch (e: unknown) {
      const err = e as { status?: number };
      if (err?.status === 401) {
        setDeleteFlow({ stage: 'error', message: t('privacy.invalidCode') });
      } else {
        setDeleteFlow({ stage: 'error', message: t('privacy.error') });
      }
    }
  }

  async function handleCancelDeletion() {
    setCancelling(true);
    try {
      await api.cancelAccountDeletion();
      setStatus({ status: 'active' });
    } catch {
      // No state change; user can retry.
    } finally {
      setCancelling(false);
    }
  }

  const formatDate = (iso?: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--cup-paper)] px-4 pb-24 pt-6">
        <div className="mx-auto max-w-xl space-y-5">
          <header className="flex items-center justify-between">
            <Link
              href="/profile"
              aria-label={t('common.back')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-subtle text-[var(--cup-cocoa)] hover:text-[var(--cup-primary)] transition-colors"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
            <h1 className="font-heading text-lg font-bold text-[var(--cup-espresso)]">
              {t('privacy.title')}
            </h1>
            <span className="h-10 w-10" aria-hidden="true" />
          </header>

          <p className="text-sm text-[var(--cup-cocoa)]">{t('privacy.intro')}</p>

          {/* Pending-deletion banner */}
          {status?.status === 'deletion_pending' && (
            <section className="rounded-card border border-[var(--cup-error)]/20 bg-[var(--cup-error)]/5 p-5 shadow-card">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  className="mt-0.5 flex-shrink-0 text-[var(--cup-error)]"
                  size={20}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-base font-bold text-[var(--cup-error)]">
                    {t('privacy.deletePendingTitle')}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--cup-cocoa)]">
                    {t('privacy.deletePendingBody')}
                  </p>
                  {status.graceUntil && (
                    <p className="mt-2 text-xs font-medium text-[var(--cup-muted)]">
                      {t('privacy.deletePendingGraceUntil')}: {formatDate(status.graceUntil)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleCancelDeletion}
                disabled={cancelling}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-[var(--cup-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-warm-glow transition-opacity disabled:opacity-50"
              >
                <RefreshCcw size={16} aria-hidden="true" />
                {t('privacy.deleteUndoButton')}
              </button>
            </section>
          )}

          {/* Download data section */}
          <section className="rounded-card bg-white p-5 shadow-card">
            <div className="flex items-start gap-3">
              <Download
                className="mt-0.5 flex-shrink-0 text-[var(--cup-primary)]"
                size={20}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-base font-bold text-[var(--cup-espresso)]">
                  {t('privacy.exportSection')}
                </h2>
                <p className="mt-1 text-sm text-[var(--cup-cocoa)]">
                  {t('privacy.exportDescription')}
                </p>
              </div>
            </div>

            <div className="mt-4">
              {exportState.kind === 'idle' && (
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 rounded-pill border border-[var(--cup-primary)] px-4 py-2 text-sm font-semibold text-[var(--cup-primary)] hover:bg-[var(--cup-primary)] hover:text-white transition-colors"
                >
                  {t('privacy.exportButton')}
                </button>
              )}
              {exportState.kind === 'preparing' && (
                <p className="text-sm text-[var(--cup-muted)]">
                  {t('privacy.exportPreparing')}
                </p>
              )}
              {exportState.kind === 'ready' && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--cup-success)]">
                    {t('privacy.exportReady')}
                  </p>
                  <a
                    href={exportState.downloadUrl}
                    download
                    className="inline-flex items-center gap-2 rounded-pill bg-[var(--cup-primary)] px-4 py-2 text-sm font-semibold text-white shadow-warm-glow"
                  >
                    <Download size={16} aria-hidden="true" />
                    {t('privacy.exportDownload')}
                  </a>
                </div>
              )}
              {exportState.kind === 'rate-limited' && (
                <p className="text-sm text-[var(--cup-warning)]">
                  {t('privacy.exportRateLimited')}
                </p>
              )}
              {exportState.kind === 'error' && (
                <p className="text-sm text-[var(--cup-error)]">{exportState.message}</p>
              )}
            </div>
          </section>

          {/* Delete section — hidden when already pending */}
          {status?.status !== 'deletion_pending' && (
            <section className="rounded-card border border-[var(--cup-error)]/20 bg-white p-5 shadow-card">
              <div className="flex items-start gap-3">
                <Trash2
                  className="mt-0.5 flex-shrink-0 text-[var(--cup-error)]"
                  size={20}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-base font-bold text-[var(--cup-error)]">
                    {t('privacy.deleteSection')}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--cup-cocoa)]">
                    {t('privacy.deleteDescription')}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {deleteFlow.stage === 'idle' && (
                  <button
                    onClick={() =>
                      setDeleteFlow({ stage: 'awaiting-code', expiresAt: '' })
                    }
                    className="inline-flex items-center gap-2 rounded-pill border border-[var(--cup-error)] px-4 py-2 text-sm font-semibold text-[var(--cup-error)] hover:bg-[var(--cup-error)] hover:text-white transition-colors"
                  >
                    {t('privacy.deleteButton')}
                  </button>
                )}

                {deleteFlow.stage === 'awaiting-code' && (
                  <div className="space-y-3 rounded-2xl border border-[var(--cup-stroke)] bg-[var(--cup-paper)] p-4">
                    <h3 className="font-heading text-sm font-bold text-[var(--cup-espresso)]">
                      {t('privacy.deleteConfirmTitle')}
                    </h3>
                    <p className="text-sm text-[var(--cup-cocoa)]">
                      {t('privacy.deleteConfirmBody')}
                    </p>
                    {!deleteFlow.expiresAt ? (
                      <button
                        onClick={handleRequestCode}
                        className="inline-flex items-center gap-2 rounded-pill bg-[var(--cup-primary)] px-4 py-2 text-sm font-semibold text-white"
                      >
                        {t('privacy.deleteSendCode')}
                      </button>
                    ) : (
                      <>
                        <p className="text-xs text-[var(--cup-muted)]">
                          {t('privacy.deleteConfirmGrace')}
                        </p>
                        {deleteFlow.devCode && (
                          <p className="font-mono text-xs text-[var(--cup-warning)]">
                            DEV code: {deleteFlow.devCode}
                          </p>
                        )}
                        <label className="block">
                          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--cup-muted)]">
                            {t('privacy.deleteCodeLabel')}
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="\d{6}"
                            maxLength={6}
                            value={code}
                            onChange={(e) =>
                              setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                            }
                            placeholder={t('privacy.deleteCodePlaceholder')}
                            className="mt-1.5 w-full rounded-2xl border border-[var(--cup-stroke)] bg-white px-3 py-2 font-mono text-base text-[var(--cup-espresso)] outline-none focus:border-[var(--cup-primary)]"
                            autoComplete="one-time-code"
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setDeleteFlow({ stage: 'idle' });
                              setCode('');
                            }}
                            className="flex-1 rounded-pill border border-[var(--cup-stroke)] px-4 py-2 text-sm font-semibold text-[var(--cup-cocoa)]"
                          >
                            {t('privacy.deleteCancelButton')}
                          </button>
                          <button
                            onClick={handleConfirmDelete}
                            disabled={code.length !== 6}
                            className="flex-1 rounded-pill bg-[var(--cup-error)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {t('privacy.deleteFinalConfirm')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {deleteFlow.stage === 'confirming' && (
                  <p className="text-sm text-[var(--cup-muted)]">…</p>
                )}

                {deleteFlow.stage === 'success' && (
                  <div className="rounded-2xl bg-[var(--cup-error)]/5 p-4">
                    <p className="text-sm font-semibold text-[var(--cup-error)]">
                      {t('privacy.deletePendingTitle')}
                    </p>
                    <p className="mt-1 text-sm text-[var(--cup-cocoa)]">
                      {t('privacy.deletePendingBody')}
                    </p>
                    <p className="mt-2 text-xs text-[var(--cup-muted)]">
                      {t('privacy.deletePendingGraceUntil')}:{' '}
                      {formatDate(deleteFlow.graceUntil)}
                    </p>
                  </div>
                )}

                {deleteFlow.stage === 'error' && (
                  <p className="mt-2 text-sm text-[var(--cup-error)]">
                    {deleteFlow.message}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
