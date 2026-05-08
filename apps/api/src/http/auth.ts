import jwt from 'jsonwebtoken';
import * as Sentry from '@sentry/node';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole, VerificationStatus } from '@cup-and-co/types';
import { config } from '../config.js';
import { identify as identifyAnalytics } from '../services/analytics.js';

export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  phoneVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      /**
       * Phase K1.12 — kiosk that authenticated this request, populated only
       * for kiosk-bearer auth. Reading req.user.id alone is enough to know
       * it was a kiosk (the synthetic id starts with 'kiosk:'), but having
       * the bare uuid handy avoids reparsing throughout the codebase.
       */
      kioskId?: string;
    }
  }
}

export function signSession(user: AuthUser): string {
  return jwt.sign(user, config.jwt.secret, { expiresIn: '30d' });
}

/**
 * Require an authenticated session. Reads the bearer token from
 * `Authorization: Bearer <jwt>`, or in dev allows `x-user-id` etc. headers
 * for fast manual testing.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const auth = req.header('authorization');

    // Phase K1.12 — kiosk-bearer auth. A single shared KIOSK_BEARER_TOKEN
    // env var authorises the entire kiosk fleet; per-device identity is
    // provided by the x-kiosk-id header. We resolve to a synthetic
    // AuthUser with id 'kiosk:<uuid>' and role 'student' so the rest of
    // the user-scoped query layer keeps working without case branches.
    const kioskBearer = process.env.KIOSK_BEARER_TOKEN;
    if (
      kioskBearer &&
      auth?.startsWith('Bearer ') &&
      auth.slice(7) === kioskBearer
    ) {
      const kioskId = req.header('x-kiosk-id');
      if (!kioskId) {
        res.status(401).json({ error: 'x-kiosk-id required for kiosk auth.' });
        return;
      }
      const syntheticId = `kiosk:${kioskId}`;
      req.kioskId = kioskId;
      req.user = {
        id: syntheticId,
        phone: 'kiosk',
        role: 'student',
        verificationStatus: 'approved',
        phoneVerified: true,
      };
      Sentry.setUser({ id: syntheticId });
      // Don't call identifyAnalytics — kiosk traffic is anonymous and the
      // PostHog identity should remain unset. Channel attribution is done
      // via placement_source on the order itself.
      return next();
    }

    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;
      req.user = decoded;
      // Phase 1.1: tag Sentry scope with user_id only — no phone/role in error reports.
      Sentry.setUser({ id: decoded.id });
      // Phase 1.2: identify for PostHog analytics with role only — no PII.
      identifyAnalytics(decoded.id, { role: decoded.role });
      return next();
    }

    if (process.env.ALLOW_HEADER_AUTH_BYPASS === '1') {
      const id = req.header('x-user-id');
      const role = (req.header('x-user-role') ?? 'student') as UserRole;
      const verificationStatus = (req.header('x-verification-status') ?? 'approved') as VerificationStatus;
      const phone = req.header('x-user-phone') ?? '+201000000001';
      if (id) {
        req.user = { id, phone, role, verificationStatus, phoneVerified: true };
        Sentry.setUser({ id });
        identifyAnalytics(id, { role });
        return next();
      }
    }

    res.status(401).json({ error: 'Authentication required.' });
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.user.role !== 'owner' && req.user.role !== 'barista') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  next();
}

export function getRequestUser(req: Request): AuthUser {
  if (!req.user) throw new Error('No authenticated user on request.');
  return req.user;
}

export function getAdminRole(req: Request): 'owner' | 'barista' {
  const user = getRequestUser(req);
  if (user.role !== 'owner' && user.role !== 'barista') {
    throw new Error('Admin access required.');
  }
  return user.role;
}
