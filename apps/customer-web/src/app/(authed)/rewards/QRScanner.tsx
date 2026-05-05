'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n';

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (pointsAwarded: number) => void;
}

type ScanState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'scanning' }
  | { kind: 'submitting'; code: string }
  | { kind: 'success'; points: number }
  | { kind: 'error'; message: string }
  | { kind: 'unsupported' };

export function QRScanner({ open, onClose, onSuccess }: QRScannerProps) {
  const { t, language } = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<ScanState>({ kind: 'idle' });

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setState({ kind: 'idle' });
    onClose();
  }, [stopCamera, onClose]);

  // Start the camera when open. We attempt scanning even without
  // BarcodeDetector — jsQR fallback covers iOS Safari < 17 and older browsers.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setState({ kind: 'requesting' });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setState({ kind: 'scanning' });
      } catch {
        if (!cancelled) {
          setState({ kind: 'error', message: 'Camera permission denied. Please allow camera access and try again.' });
        }
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, stopCamera]);

  // Scan loop: prefer native BarcodeDetector, fall back to jsQR for older browsers.
  useEffect(() => {
    if (state.kind !== 'scanning' || !videoRef.current) return;

    let cancelled = false;

    async function handleCode(code: string) {
      if (cancelled) return;
      setState({ kind: 'submitting', code });
      try {
        const result = await api.redeemQr(code);
        if (!cancelled) {
          setState({ kind: 'success', points: result.pointsAwarded });
          onSuccess(result.pointsAwarded);
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: e instanceof ApiError ? e.message : 'Failed to redeem QR code',
          });
        }
      }
    }

    // Native BarcodeDetector path
    if ('BarcodeDetector' in window) {
      const BarcodeDetectorCtor = (window as unknown as Record<string, unknown>).BarcodeDetector as
        new (opts: { formats: string[] }) => { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };
      const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
      const interval = setInterval(async () => {
        if (cancelled || !videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0 && !cancelled) {
            clearInterval(interval);
            await handleCode(barcodes[0].rawValue);
          }
        } catch {
          // Detection can fail on some frames, ignore
        }
      }, 500);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    // jsQR fallback (iOS Safari < 17, older Chrome)
    let interval: ReturnType<typeof setInterval> | null = null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    void import('jsqr').then(({ default: jsQR }) => {
      if (cancelled || !ctx) return;
      interval = setInterval(() => {
        if (cancelled || !videoRef.current || videoRef.current.readyState < 2) return;
        const w = videoRef.current.videoWidth;
        const h = videoRef.current.videoHeight;
        if (!w || !h) return;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(videoRef.current, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const found = jsQR(imageData.data, w, h);
        if (found && !cancelled) {
          if (interval) clearInterval(interval);
          void handleCode(found.data);
        }
      }, 500);
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [state.kind, onSuccess]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-cup-stroke bg-white shadow-elevated"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cup-stroke px-5 py-4">
              <h2 className="font-heading text-base font-semibold text-cup-brown-900">
                Scan QR Code
              </h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label={language === 'ar' ? 'إغلاق الماسح' : 'Close scanner'}
                className="grid h-8 w-8 place-items-center rounded-full bg-cup-paper text-cup-brown-900 transition active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Camera viewport */}
            <div className="relative aspect-square w-full bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {state.kind === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-2xl border-2 border-white/60" />
                  <motion.div
                    className="absolute left-1/2 h-0.5 w-48 -translate-x-1/2 bg-cup-orange-600"
                    animate={{ y: [-96, 96] }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
                  />
                </div>
              )}
            </div>

            {/* Status area */}
            <div className="px-5 py-4">
              {state.kind === 'requesting' && (
                <p className="text-center text-sm text-cup-muted">
                  Requesting camera access...
                </p>
              )}

              {state.kind === 'scanning' && (
                <p className="text-center text-sm text-cup-muted">
                  Point your camera at a receipt QR code
                </p>
              )}

              {state.kind === 'submitting' && (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-cup-orange-600 border-t-transparent" />
                  <p className="text-sm text-cup-muted">{t('loyalty.redeeming')}</p>
                </div>
              )}

              {state.kind === 'success' && (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="h-8 w-8 text-cup-teal-600" />
                  <p className="font-heading text-base font-semibold text-cup-brown-900">
                    +{state.points} {language === 'ar' ? 'نقاط مكتسبة!' : 'points earned!'}
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-1 rounded-full bg-cup-orange-600 px-6 py-2.5 font-heading text-sm font-semibold text-white shadow-subtle transition active:scale-95"
                  >
                    {t('common.done')}
                  </button>
                </div>
              )}

              {state.kind === 'error' && (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-8 w-8 text-cup-error" />
                  <p className="text-center text-sm text-cup-error">{state.message}</p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-1 rounded-full bg-cup-paper px-6 py-2.5 font-heading text-sm font-semibold text-cup-brown-900 transition active:scale-95"
                  >
                    Close
                  </button>
                </div>
              )}

              {state.kind === 'unsupported' && (
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-8 w-8 text-cup-muted" />
                  <p className="text-center text-sm text-cup-muted">
                    QR scanning is not supported in this browser. Please use Chrome or Safari on mobile.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-1 rounded-full bg-cup-paper px-6 py-2.5 font-heading text-sm font-semibold text-cup-brown-900 transition active:scale-95"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
