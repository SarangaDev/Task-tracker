import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Zod-based request validation middleware.
 * Usage: validate(mySchema) - validates req.body by default
 *        validate(mySchema, 'query') - validates req.query
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(result.error);
      return;
    }

    // Replace the target with parsed + coerced data
    if (target === 'body') {
      req.body = result.data;
    } else if (target === 'query') {
      req.query = result.data;
    } else if (target === 'params') {
      req.params = result.data;
    }
    next();
  };
};
