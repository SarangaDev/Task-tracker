import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../../src/utils/errors';

describe('Error utility classes', () => {
  // ── AppError (base) ────────────────────────────────────────────────────────

  describe('AppError', () => {
    it('sets message and statusCode correctly', () => {
      const err = new AppError('something went wrong', 500);
      expect(err.message).toBe('something went wrong');
      expect(err.statusCode).toBe(500);
    });

    it('defaults isOperational to true', () => {
      const err = new AppError('oops', 400);
      expect(err.isOperational).toBe(true);
    });

    it('allows isOperational to be set to false', () => {
      const err = new AppError('fatal', 500, false);
      expect(err.isOperational).toBe(false);
    });

    it('is an instance of Error', () => {
      const err = new AppError('x', 400);
      expect(err).toBeInstanceOf(Error);
    });

    it('has a stack trace', () => {
      const err = new AppError('x', 400);
      expect(err.stack).toBeDefined();
    });
  });

  // ── NotFoundError ──────────────────────────────────────────────────────────

  describe('NotFoundError', () => {
    it('returns 404 status code', () => {
      expect(new NotFoundError().statusCode).toBe(404);
    });

    it('uses default resource name when none provided', () => {
      expect(new NotFoundError().message).toBe('Resource not found');
    });

    it('includes custom resource name in message', () => {
      expect(new NotFoundError('Task').message).toBe('Task not found');
    });

    it('is instanceof AppError and Error', () => {
      const err = new NotFoundError();
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    });
  });

  // ── UnauthorizedError ──────────────────────────────────────────────────────

  describe('UnauthorizedError', () => {
    it('returns 401 status code', () => {
      expect(new UnauthorizedError().statusCode).toBe(401);
    });

    it('uses default message when none provided', () => {
      expect(new UnauthorizedError().message).toBe('Unauthorized');
    });

    it('uses custom message when provided', () => {
      expect(new UnauthorizedError('Token expired').message).toBe('Token expired');
    });

    it('is instanceof AppError', () => {
      expect(new UnauthorizedError()).toBeInstanceOf(AppError);
    });
  });

  // ── ForbiddenError ─────────────────────────────────────────────────────────

  describe('ForbiddenError', () => {
    it('returns 403 status code', () => {
      expect(new ForbiddenError().statusCode).toBe(403);
    });

    it('has a sensible default message', () => {
      expect(new ForbiddenError().message).toContain('permission');
    });

    it('accepts a custom message', () => {
      const msg = 'Admins only';
      expect(new ForbiddenError(msg).message).toBe(msg);
    });

    it('is instanceof AppError', () => {
      expect(new ForbiddenError()).toBeInstanceOf(AppError);
    });
  });

  // ── ConflictError ──────────────────────────────────────────────────────────

  describe('ConflictError', () => {
    it('returns 409 status code', () => {
      expect(new ConflictError().statusCode).toBe(409);
    });

    it('uses default message when none provided', () => {
      expect(new ConflictError().message).toBe('Resource already exists');
    });

    it('accepts a custom message', () => {
      const msg = 'Email already registered';
      expect(new ConflictError(msg).message).toBe(msg);
    });

    it('is instanceof AppError', () => {
      expect(new ConflictError()).toBeInstanceOf(AppError);
    });
  });

  // ── ValidationError ────────────────────────────────────────────────────────

  describe('ValidationError', () => {
    it('returns 400 status code', () => {
      expect(new ValidationError().statusCode).toBe(400);
    });

    it('uses default message when none provided', () => {
      expect(new ValidationError().message).toBe('Validation failed');
    });

    it('accepts a custom message', () => {
      const msg = 'Title is required';
      expect(new ValidationError(msg).message).toBe(msg);
    });

    it('is instanceof AppError', () => {
      expect(new ValidationError()).toBeInstanceOf(AppError);
    });
  });
});
