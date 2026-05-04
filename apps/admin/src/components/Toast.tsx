'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ToastKind = 'info' | 'success' | 'error';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastCtx = createContext<{ push: (kind: ToastKind, message: string) => void } | null>(null);

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((kind: ToastKind, message: string) => {
    setItems((prev) => [...prev, { id: Date.now() + Math.random(), kind, message }]);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-50 flex max-w-sm flex-col gap-2"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => setItems((p) => p.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const styles =
    item.kind === 'error'
      ? 'border-cup-error bg-white text-cup-error'
      : item.kind === 'success'
        ? 'border-cup-success bg-white text-cup-success'
        : 'border-cup-stroke bg-white text-cup-brown-900';

  return (
    <div
      role={item.kind === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto rounded-card border px-4 py-3 text-sm shadow-card ${styles}`}
    >
      {item.message}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within <ToastHost>');
  return ctx.push;
}
