import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

// Safe HTTP methods don't need CSRF protection
const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Public auth endpoints that are allowed without a CSRF token (user isn't logged
// in yet, so they haven't received a csrf_token cookie yet)
const CSRF_EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/register', '/api/auth/csrf']);

/**
 * Double Submit Cookie CSRF protection.
 *
 * On state-mutating requests (POST/PUT/PATCH/DELETE) the frontend reads the
 * `csrf_token` cookie via JS and echoes it back in the `X-CSRF-Token` header.
 * An attacker's site cannot read your cookies cross-origin, so they can't forge
 * this header — blocking cross-site request forgery.
 */
export const csrfProtect = (req: Request, res: Response, next: NextFunction): void => {
  // Safe methods and exempt paths bypass the check
  // Use originalUrl (strip query string) — req.path can be mangled by mount points
  const urlPath = req.originalUrl.split('?')[0];
  if (CSRF_SAFE_METHODS.has(req.method) || CSRF_EXEMPT_PATHS.has(urlPath)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.csrf_token as string | undefined;
  const headerToken = req.headers['x-csrf-token'] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    next(new ForbiddenError('Invalid or missing CSRF token'));
    return;
  }

  next();
};
