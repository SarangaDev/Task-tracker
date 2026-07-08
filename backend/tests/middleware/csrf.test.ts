import { Request, Response, NextFunction } from 'express';
import { csrfProtect } from '../../src/middleware/csrf';

// Helper to create a minimal mock Express request
const makeReq = (
  method: string,
  path: string,
  opts: { cookieToken?: string; headerToken?: string } = {}
): Partial<Request> => ({
  method,
  originalUrl: path,
  cookies: opts.cookieToken !== undefined ? { csrf_token: opts.cookieToken } : {},
  headers: opts.headerToken !== undefined ? { 'x-csrf-token': opts.headerToken } : {},
});

const makeRes = (): Partial<Response> => ({});

const makeNext = (): jest.MockedFunction<NextFunction> => jest.fn();

describe('CSRF middleware — csrfProtect', () => {
  // ── Safe methods — should always pass through ──────────────────────────────

  describe('Safe HTTP methods (GET, HEAD, OPTIONS)', () => {
    it.each(['GET', 'HEAD', 'OPTIONS'])(
      '%s /api/tasks passes without any token',
      (method) => {
        const next = makeNext();
        csrfProtect(makeReq(method, '/api/tasks') as Request, makeRes() as Response, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(/* no error */);
      }
    );
  });

  // ── Exempt paths — should pass through regardless of method ───────────────

  describe('CSRF-exempt paths', () => {
    it.each([
      ['POST', '/api/auth/login'],
      ['POST', '/api/auth/register'],
      ['GET', '/api/auth/csrf'],
    ])('%s %s passes without tokens', (method, path) => {
      const next = makeNext();
      csrfProtect(makeReq(method, path) as Request, makeRes() as Response, next);
      expect(next).toHaveBeenCalledWith(/* no error */);
    });

    it('ignores query strings when matching exempt paths', () => {
      const next = makeNext();
      csrfProtect(
        makeReq('POST', '/api/auth/login?redirect=/') as Request,
        makeRes() as Response,
        next
      );
      expect(next).toHaveBeenCalledWith(/* no error */);
    });
  });

  // ── State-mutating requests that REQUIRE a valid CSRF token ───────────────

  describe('State-mutating requests — token required', () => {
    it('calls next with ForbiddenError when both cookie and header are missing', () => {
      const next = makeNext();
      csrfProtect(makeReq('POST', '/api/tasks') as Request, makeRes() as Response, next);
      const err = next.mock.calls[0][0];
      expect(err).toBeDefined();
      expect((err as unknown as { statusCode: number }).statusCode).toBe(403);
    });

    it('calls next with ForbiddenError when cookie token is missing', () => {
      const next = makeNext();
      csrfProtect(
        makeReq('POST', '/api/tasks', { headerToken: 'abc' }) as Request,
        makeRes() as Response,
        next
      );
      const err = next.mock.calls[0][0];
      expect((err as unknown as { statusCode: number }).statusCode).toBe(403);
    });

    it('calls next with ForbiddenError when header token is missing', () => {
      const next = makeNext();
      csrfProtect(
        makeReq('POST', '/api/tasks', { cookieToken: 'abc' }) as Request,
        makeRes() as Response,
        next
      );
      const err = next.mock.calls[0][0];
      expect((err as unknown as { statusCode: number }).statusCode).toBe(403);
    });

    it('calls next with ForbiddenError when cookie and header tokens do not match', () => {
      const next = makeNext();
      csrfProtect(
        makeReq('POST', '/api/tasks', { cookieToken: 'token-a', headerToken: 'token-b' }) as Request,
        makeRes() as Response,
        next
      );
      const err = next.mock.calls[0][0];
      expect((err as unknown as { statusCode: number }).statusCode).toBe(403);
    });

    it('calls next without error when cookie and header tokens match', () => {
      const next = makeNext();
      const token = 'valid-csrf-token-xyz';
      csrfProtect(
        makeReq('POST', '/api/tasks', { cookieToken: token, headerToken: token }) as Request,
        makeRes() as Response,
        next
      );
      // Called once with no arguments (no error)
      expect(next).toHaveBeenCalledWith();
    });

    it.each(['PUT', 'PATCH', 'DELETE'])(
      '%s also requires CSRF token',
      (method) => {
        const next = makeNext();
        csrfProtect(makeReq(method, '/api/tasks/123') as Request, makeRes() as Response, next);
        const err = next.mock.calls[0][0];
        expect((err as unknown as { statusCode: number }).statusCode).toBe(403);
      }
    );
  });
});
