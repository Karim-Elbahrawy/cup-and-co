'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QrCanvasProps {
  value: string;
  size?: number;
  /** Caption shown under the canvas (visible when printed). */
  caption?: string;
}

/**
 * Renders a printable QR code using the `qrcode` library. Drawn into a canvas
 * at 2× density so it stays sharp on receipt printers.
 */
export function QrCanvas({ value, size = 224, caption }: QrCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1C1917',
        light: '#FFFFFF',
      },
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Could not render QR.');
    });
  }, [value, size]);

  return (
    <figure className="inline-flex flex-col items-center gap-2 rounded-card border border-cup-stroke bg-white p-4 shadow-card print:border-0 print:shadow-none">
      <canvas
        ref={canvasRef}
        width={size * 2}
        height={size * 2}
        style={{ width: size, height: size }}
        aria-label="Receipt QR code"
        role="img"
      />
      {caption && (
        <figcaption className="font-mono text-xs text-cup-brown-700">{caption}</figcaption>
      )}
      {error && <p className="text-xs text-cup-error">{error}</p>}
    </figure>
  );
}
