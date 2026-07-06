import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Role-based access control middleware factory.
 * Usage: router.get('/admin', authenticate, requireRole(Role.ADMIN), handler)
 */
export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      next(
        new ForbiddenError(
          `Access denied. Required role: ${roles.join(' or ')}`
        )
      );
      return;
    }

    next();
  };
};
