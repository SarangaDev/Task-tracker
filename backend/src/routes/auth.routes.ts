import { Router } from 'express';
import { register, login, logout, getProfile, getCsrfToken } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const router = Router();

/**
 * @route   GET /api/auth/csrf
 * @desc    Issue / refresh a CSRF token (call once on app boot if logged in)
 * @access  Public (returns 204 if unauthenticated)
 */
router.get('/csrf', getCsrfToken);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user — sets HttpOnly access_token + csrf_token cookies
 * @access  Public
 */
router.post('/register', validate(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Login — sets HttpOnly access_token + csrf_token cookies
 * @access  Public
 */
router.post('/login', validate(loginSchema), login);

/**
 * @route   POST /api/auth/logout
 * @desc    Clear auth cookies (server-side logout)
 * @access  Protected
 */
router.post('/logout', authenticate, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Protected
 */
router.get('/me', authenticate, getProfile);

export default router;
