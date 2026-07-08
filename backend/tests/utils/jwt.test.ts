import { signToken, verifyToken, JwtPayload } from '../../src/utils/jwt';

const validPayload: JwtPayload = {
  userId: 'user-abc-123',
  email: 'test@example.com',
  role: 'USER',
};

describe('JWT utilities', () => {
  // ── signToken ──────────────────────────────────────────────────────────────

  describe('signToken', () => {
    it('returns a non-empty string', () => {
      const token = signToken(validPayload);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('returns a token with three dot-separated parts (JWT format)', () => {
      const token = signToken(validPayload);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('produces different tokens for different payloads', () => {
      const t1 = signToken(validPayload);
      const t2 = signToken({ ...validPayload, userId: 'other-user' });
      expect(t1).not.toBe(t2);
    });
  });

  // ── verifyToken ────────────────────────────────────────────────────────────

  describe('verifyToken', () => {
    it('decodes and returns the original payload fields', () => {
      const token = signToken(validPayload);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(validPayload.userId);
      expect(decoded.email).toBe(validPayload.email);
      expect(decoded.role).toBe(validPayload.role);
    });

    it('includes standard JWT fields (iat, exp)', () => {
      const token = signToken(validPayload);
      const decoded = verifyToken(token) as JwtPayload & { iat?: number; exp?: number };
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('throws on a completely invalid token string', () => {
      expect(() => verifyToken('not.a.jwt')).toThrow();
    });

    it('throws when the signature is tampered', () => {
      const token = signToken(validPayload);
      // Flip last character of the signature segment
      const parts = token.split('.');
      parts[2] = parts[2].slice(0, -1) + (parts[2].endsWith('a') ? 'b' : 'a');
      expect(() => verifyToken(parts.join('.'))).toThrow();
    });

    it('throws on an expired token', () => {
      // Sign with -1s expiry so it is immediately expired
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        validPayload,
        process.env.JWT_SECRET ?? 'ci-test-secret',
        { expiresIn: -1 }
      );
      expect(() => verifyToken(expiredToken)).toThrow();
    });

    it('throws on an empty string', () => {
      expect(() => verifyToken('')).toThrow();
    });
  });
});
