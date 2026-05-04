import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole, VerificationStatus } from '@cup-and-co/types';
import { config } from '../config.js';

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
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice(7);
      const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;
      req.user = decoded;
      return next();
    }

    if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
      const id = req.header('x-user-id');
      const role = (req.header('x-user-role') ?? 'student') as UserRole;
      const verificationStatus = (req.header('x-verification-status') ?? 'approved') as VerificationStatus;
      const phone = req.header('x-user-phone') ?? '+201000000001';
      if (id) {
        req.user = { id, phone, role, verificationStatus, phoneVerified: true };
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
