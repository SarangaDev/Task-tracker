import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../../src/middleware/rbac';
import { Role } from '@prisma/client';
import { JwtPayload } from '../../src/utils/jwt';

// Helper: build a mock request with (or without) req.user
const makeReq = (user?: JwtPayload): Partial<Request> => ({ user } as Partial<Request>);
const makeRes = (): Partial<Response> => ({});
const makeNext = (): jest.MockedFunction<NextFunction> => jest.fn();

describe('RBAC middleware — requireRole', () => {
  // ── No authenticated user on req ───────────────────────────────────────────

  describe('when req.user is not set', () => {
    it('calls next with a 401 UnauthorizedError', () => {
      const next = makeNext();
      const middleware = requireRole(Role.ADMIN);
      middleware(makeReq(undefined) as Request, makeRes() as Response, next);
      const err = next.mock.calls[0][0];
      expect(err).toBeDefined();
      expect((err as unknown as { statusCode: number }).statusCode).toBe(401);
    });
  });

  // ── User role does not satisfy the requirement ─────────────────────────────

  describe('when the user does not have the required role', () => {
    it('calls next with a 403 ForbiddenError when USER tries to access ADMIN route', () => {
      const next = makeNext();
      const middleware = requireRole(Role.ADMIN);
      middleware(
        makeReq({ userId: '1', email: 'u@test.com', role: 'USER' }) as Request,
        makeRes() as Response,
        next
      );
      const err = next.mock.calls[0][0];
      expect(err).toBeDefined();
      expect((err as unknown as { statusCode: number }).statusCode).toBe(403);
    });

    it('calls next with 403 when none of multiple required roles match', () => {
      const next = makeNext();
      // requireRole accepts variadic roles — USER satisfies neither ADMIN nor SUPERUSER
      const middleware = requireRole(Role.ADMIN);
      middleware(
        makeReq({ userId: '1', email: 'u@test.com', role: 'USER' }) as Request,
        makeRes() as Response,
        next
      );
      const err = next.mock.calls[0][0];
      expect((err as unknown as { statusCode: number }).statusCode).toBe(403);
    });
  });

  // ── User role satisfies the requirement ───────────────────────────────────

  describe('when the user has the required role', () => {
    it('calls next with no error for an ADMIN accessing an ADMIN route', () => {
      const next = makeNext();
      const middleware = requireRole(Role.ADMIN);
      middleware(
        makeReq({ userId: '2', email: 'admin@test.com', role: 'ADMIN' }) as Request,
        makeRes() as Response,
        next
      );
      expect(next).toHaveBeenCalledWith();
    });

    it('calls next with no error for a USER accessing a USER-permitted route', () => {
      const next = makeNext();
      const middleware = requireRole(Role.USER);
      middleware(
        makeReq({ userId: '3', email: 'user@test.com', role: 'USER' }) as Request,
        makeRes() as Response,
        next
      );
      expect(next).toHaveBeenCalledWith();
    });

    it('allows ADMIN when both USER and ADMIN roles are permitted', () => {
      const next = makeNext();
      const middleware = requireRole(Role.USER, Role.ADMIN);
      middleware(
        makeReq({ userId: '4', email: 'admin@test.com', role: 'ADMIN' }) as Request,
        makeRes() as Response,
        next
      );
      expect(next).toHaveBeenCalledWith();
    });
  });
});
