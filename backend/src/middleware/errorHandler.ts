import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { config } from '../config/env';

interface ErrorResponse {
  status: string;
  message: string;
  errors?: unknown;
  stack?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = 500;
  const response: ErrorResponse = {
    status: 'error',
    message: 'Internal server error',
  };

  // Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    response.status = 'fail';
    response.message = 'Validation failed';
    response.errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // Known operational errors
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    response.status = err.statusCode < 500 ? 'fail' : 'error';
    response.message = err.message;
  }
  // Prisma known errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      statusCode = 409;
      response.status = 'fail';
      response.message = 'A record with that value already exists';
    } else if (err.code === 'P2025') {
      // Record not found
      statusCode = 404;
      response.status = 'fail';
      response.message = 'Record not found';
    } else {
      statusCode = 400;
      response.status = 'fail';
      response.message = 'Database operation failed';
    }
  }
  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    response.status = 'fail';
    response.message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    response.status = 'fail';
    response.message = 'Token has expired. Please log in again';
  }

  // Include stack trace in development
  if (!config.isProduction) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// Wrap async route handlers to avoid try/catch boilerplate
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
