import { hashPassword, comparePassword } from '../../src/utils/password';

describe('Password utilities', () => {
  const plaintext = 'MyS3cur3P@ssword';

  // ── hashPassword ───────────────────────────────────────────────────────────

  describe('hashPassword', () => {
    it('returns a string', async () => {
      const hash = await hashPassword(plaintext);
      expect(typeof hash).toBe('string');
    });

    it('does not return the plaintext password', async () => {
      const hash = await hashPassword(plaintext);
      expect(hash).not.toBe(plaintext);
    });

    it('produces a bcrypt hash (starts with $2b$ or $2a$)', async () => {
      const hash = await hashPassword(plaintext);
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('produces a different hash on each call (random salt)', async () => {
      const hash1 = await hashPassword(plaintext);
      const hash2 = await hashPassword(plaintext);
      expect(hash1).not.toBe(hash2);
    });
  });

  // ── comparePassword ────────────────────────────────────────────────────────

  describe('comparePassword', () => {
    let hash: string;

    beforeAll(async () => {
      hash = await hashPassword(plaintext);
    });

    it('returns true when the password matches the hash', async () => {
      const result = await comparePassword(plaintext, hash);
      expect(result).toBe(true);
    });

    it('returns false when the password does not match', async () => {
      const result = await comparePassword('WrongPassword1!', hash);
      expect(result).toBe(false);
    });

    it('returns false for an empty password against a real hash', async () => {
      const result = await comparePassword('', hash);
      expect(result).toBe(false);
    });

    it('returns false when compared against a completely invalid hash', async () => {
      // bcrypt.compare is safe — it returns false rather than throwing
      const result = await comparePassword(plaintext, 'not-a-hash');
      expect(result).toBe(false);
    });
  });
});
