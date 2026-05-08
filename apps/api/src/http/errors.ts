import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    // Build a human-readable summary of which field(s) failed so the
    // client toast says "orderId is required" instead of just
    // "Validation error". Falls back to "Validation error" only if
    // Zod produced no field-level info.
    const fieldErrors = err.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : null;
        return path ? `${path}: ${issue.message}` : issue.message;
      })
      .filter(Boolean);
    const summary = fieldErrors.length > 0
      ? `Invalid input — ${fieldErrors.join('; ')}`
      : 'Validation error';
    res.status(400).json({ error: summary, details: err.flatten() });
    return;
  }
  const status = (err as { status?: number })?.status ?? 500;
  const message = (err as Error)?.message ?? 'Unknown error';
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[api]', message, err);
  }
  res.status(status).json({ error: message });
}
