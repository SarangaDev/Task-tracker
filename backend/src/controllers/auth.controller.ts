import { Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler';
import { authService } from '../services/auth.service';
import { RegisterDto, LoginDto } from '../schemas/auth.schema';
import { NotFoundError } from '../utils/errors';
import { config } from '../config/env';

// Cookie lifetime matches the JWT expiry (7 days in ms)
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Generates a cryptographically random CSRF token and sets it in two cookies:
 *   - `access_token`  → HttpOnly (JS cannot read, immune to XSS)
 *   - `csrf_token`    → readable by JS so the frontend can echo it back as
 *                        the `X-CSRF-Token` header (Double Submit Cookie pattern)
 */
const setAuthCookies = (res: Response, accessToken: string): string => {
  const csrfToken = crypto.randomBytes(32).toString('hex');

  const cookieBase = {
    httpOnly: false,
    secure: config.isProduction,
    // 'lax' is sufficient — it blocks cross-site POST/XHR (CSRF protection)
    // while allowing same-site navigations. 'strict' can break dev proxies.
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
  };

  // HttpOnly — invisible to JS, can only be sent by the browser automatically
  res.cookie('access_token', accessToken, { ...cookieBase, httpOnly: true });

  // Readable by JS — frontend reads this and sends as X-CSRF-Token header
  res.cookie('csrf_token', csrfToken, cookieBase);

  return csrfToken;
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie('access_token', { httpOnly: true, sameSite: 'lax' });
  res.clearCookie('csrf_token', { sameSite: 'lax' });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

export const register = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.body as RegisterDto;
  const result = await authService.register(dto);

  setAuthCookies(res, result.token);

  res.status(201).json({
    status: 'success',
    message: 'Account created successfully',
    // token is intentionally omitted from the body — it lives in the HttpOnly cookie
    data: { user: result.user },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.body as LoginDto;
  const result = await authService.login(dto);

  setAuthCookies(res, result.token);

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    // token is intentionally omitted from the body — it lives in the HttpOnly cookie
    data: { user: result.user },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookies(res);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = await authService.getProfile(userId);

  if (!user) {
    throw new NotFoundError('User');
  }

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

/**
 * GET /api/auth/csrf
 * Issues a fresh CSRF token pair on app load (or after token rotation).
 * The client must call this once before making any state-mutating requests.
 * This endpoint requires the access_token cookie to be present so that only
 * authenticated sessions receive a CSRF token.
 */
export const getCsrfToken = asyncHandler(async (req: Request, res: Response) => {
  // Only issue a CSRF token if the user is actually logged in
  const accessToken = req.cookies?.access_token;
  if (!accessToken) {
    // Return an empty 204 — unauthenticated users don't need a CSRF token yet
    res.status(204).end();
    return;
  }

  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
  });

  res.status(200).json({ status: 'success', data: { csrfToken } });
});
