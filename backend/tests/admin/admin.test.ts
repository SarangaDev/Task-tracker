import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';

// ── Mock Socket.IO (admin routes trigger socket events via task service) ──────
jest.mock('../../src/config/socket', () => {
  const mockEmit = jest.fn();
  const mockAdminRoom = { emit: mockEmit };
  const mockUserRoom = { to: jest.fn().mockReturnValue(mockAdminRoom) };
  return {
    getIO: jest.fn().mockReturnValue({
      to: jest.fn().mockReturnValue(mockUserRoom),
    }),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — same pattern as tasks test
// ─────────────────────────────────────────────────────────────────────────────

interface AuthSession {
  cookieHeader: string;
  csrfToken: string;
  userId: string;
}

const createSession = async (userData: {
  name: string;
  email: string;
  password: string;
  role?: 'USER' | 'ADMIN';
}): Promise<AuthSession> => {
  const regRes = await request(app)
    .post('/api/auth/register')
    .send({ name: userData.name, email: userData.email, password: userData.password });

  const userId: string = regRes.body.data.user.id;

  if (userData.role === 'ADMIN') {
    await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: userData.email, password: userData.password });

  const rawCookies: string[] = (loginRes.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  const cookieHeader = rawCookies.map((c) => c.split(';')[0]).join('; ');
  const csrfPair = rawCookies.find((c) => c.startsWith('csrf_token=')) ?? '';
  const csrfToken = csrfPair.split(';')[0].replace('csrf_token=', '');

  return { cookieHeader, csrfToken, userId };
};

const authGet = (path: string, s: AuthSession) =>
  request(app).get(path).set('Cookie', s.cookieHeader);

const authPost = (path: string, s: AuthSession, body: object) =>
  request(app)
    .post(path)
    .set('Cookie', s.cookieHeader)
    .set('X-CSRF-Token', s.csrfToken)
    .send(body);

const authPut = (path: string, s: AuthSession, body: object) =>
  request(app)
    .put(path)
    .set('Cookie', s.cookieHeader)
    .set('X-CSRF-Token', s.csrfToken)
    .send(body);

const authDelete = (path: string, s: AuthSession) =>
  request(app)
    .delete(path)
    .set('Cookie', s.cookieHeader)
    .set('X-CSRF-Token', s.csrfToken);

// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_DATA = { name: 'Admin', email: 'adminroutes@example.com', password: 'Admin@1234', role: 'ADMIN' as const };
const USER_A_DATA = { name: 'User A', email: 'usera_admin@example.com', password: 'Test@1234' };
const USER_B_DATA = { name: 'User B', email: 'userb_admin@example.com', password: 'Test@1234' };

describe('Admin Routes', () => {
  let admin: AuthSession;
  let userA: AuthSession;
  let userB: AuthSession;
  let userATaskId: string;

  beforeAll(async () => {
    for (const email of [ADMIN_DATA.email, USER_A_DATA.email, USER_B_DATA.email]) {
      await prisma.task.deleteMany({ where: { user: { email } } });
      await prisma.user.deleteMany({ where: { email } });
    }

    [admin, userA, userB] = await Promise.all([
      createSession(ADMIN_DATA),
      createSession(USER_A_DATA),
      createSession(USER_B_DATA),
    ]);

    // Seed tasks
    const taskRes = await authPost('/api/tasks', userA, {
      title: 'User A Task',
      priority: 'HIGH',
    });
    userATaskId = taskRes.body.data.task.id;

    await authPost('/api/tasks', userB, { title: 'User B Task' });
  });

  afterAll(async () => {
    for (const email of [ADMIN_DATA.email, USER_A_DATA.email, USER_B_DATA.email]) {
      await prisma.task.deleteMany({ where: { user: { email } } });
      await prisma.user.deleteMany({ where: { email } });
    }
    await prisma.$disconnect();
  });

  beforeEach(() => jest.clearAllMocks());

  // ── GET /api/admin/tasks ───────────────────────────────────────────────────

  describe('GET /api/admin/tasks', () => {
    it('returns all tasks in the system for an admin', async () => {
      const res = await authGet('/api/admin/tasks', admin).expect(200);

      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      // At least the 2 seeded tasks
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('returns pagination metadata', async () => {
      const res = await authGet('/api/admin/tasks?page=1&limit=1', admin).expect(200);

      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    it('filters by userId — returns only tasks belonging to that user', async () => {
      const res = await authGet(
        `/api/admin/tasks?userId=${userA.userId}`,
        admin
      ).expect(200);

      res.body.data.forEach((t: { userId: string }) => {
        expect(t.userId).toBe(userA.userId);
      });
    });

    it('filters by status', async () => {
      const res = await authGet('/api/admin/tasks?status=TODO', admin).expect(200);

      res.body.data.forEach((t: { status: string }) => {
        expect(t.status).toBe('TODO');
      });
    });

    it('filters by priority=HIGH', async () => {
      const res = await authGet('/api/admin/tasks?priority=HIGH', admin).expect(200);

      res.body.data.forEach((t: { priority: string }) => {
        expect(t.priority).toBe('HIGH');
      });
    });

    it('searches by keyword', async () => {
      const res = await authGet('/api/admin/tasks?search=User+A+Task', admin).expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('returns 403 for a regular user (non-admin)', async () => {
      const res = await authGet('/api/admin/tasks', userA).expect(403);
      expect(res.body.status).toBe('fail');
    });

    it('returns 401 when unauthenticated', async () => {
      await request(app).get('/api/admin/tasks').expect(401);
    });
  });

  // ── GET /api/admin/tasks/:id ───────────────────────────────────────────────

  describe('GET /api/admin/tasks/:id', () => {
    it('allows admin to fetch any task by ID', async () => {
      const res = await authGet(`/api/admin/tasks/${userATaskId}`, admin).expect(200);
      expect(res.body.data.task.id).toBe(userATaskId);
    });

    it('returns 404 for a non-existent task', async () => {
      await authGet('/api/admin/tasks/nonexistentid9999', admin).expect(404);
    });

    it('returns 403 for a regular user', async () => {
      await authGet(`/api/admin/tasks/${userATaskId}`, userA).expect(403);
    });
  });

  // ── PUT /api/admin/tasks/:id ───────────────────────────────────────────────

  describe('PUT /api/admin/tasks/:id', () => {
    it('allows admin to update any task', async () => {
      const res = await authPut(
        `/api/admin/tasks/${userATaskId}`,
        admin,
        { status: 'IN_PROGRESS', priority: 'LOW' }
      ).expect(200);

      expect(res.body.data.task.status).toBe('IN_PROGRESS');
      expect(res.body.data.task.priority).toBe('LOW');
    });

    it('returns 400 for an invalid status', async () => {
      await authPut(
        `/api/admin/tasks/${userATaskId}`,
        admin,
        { status: 'INVALID' }
      ).expect(400);
    });

    it('returns 404 for a non-existent task', async () => {
      await authPut('/api/admin/tasks/nonexistentid9999', admin, { title: 'x' }).expect(404);
    });

    it('returns 403 for a regular user', async () => {
      await authPut(`/api/admin/tasks/${userATaskId}`, userA, { title: 'Hacked' }).expect(403);
    });
  });

  // ── DELETE /api/admin/tasks/:id ────────────────────────────────────────────

  describe('DELETE /api/admin/tasks/:id', () => {
    let ephemeralTaskId: string;

    beforeEach(async () => {
      const res = await authPost('/api/tasks', userA, { title: 'Task to admin-delete' });
      ephemeralTaskId = res.body.data.task.id;
    });

    it('allows admin to delete any task and returns 204', async () => {
      await authDelete(`/api/admin/tasks/${ephemeralTaskId}`, admin).expect(204);
      await authGet(`/api/admin/tasks/${ephemeralTaskId}`, admin).expect(404);
    });

    it('returns 403 for a regular user', async () => {
      await authDelete(`/api/admin/tasks/${ephemeralTaskId}`, userA).expect(403);
    });

    it('returns 404 for a non-existent task', async () => {
      await authDelete('/api/admin/tasks/nonexistentid9999', admin).expect(404);
    });
  });

  // ── GET /api/admin/users/search ────────────────────────────────────────────

  describe('GET /api/admin/users/search', () => {
    it('returns matching users for a name query', async () => {
      const res = await authGet('/api/admin/users/search?q=User+A', admin).expect(200);

      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThan(0);

      // None of the returned users should expose the password
      res.body.data.users.forEach((u: { password?: string }) => {
        expect(u.password).toBeUndefined();
      });
    });

    it('returns matching users for an email query', async () => {
      const res = await authGet(
        `/api/admin/users/search?q=${encodeURIComponent(USER_A_DATA.email)}`,
        admin
      ).expect(200);

      expect(res.body.data.users.some((u: { email: string }) => u.email === USER_A_DATA.email)).toBe(true);
    });

    it('returns an empty array when no users match', async () => {
      const res = await authGet(
        '/api/admin/users/search?q=xyzzy_no_such_user_4444',
        admin
      ).expect(200);

      expect(res.body.data.users).toHaveLength(0);
    });

    it('returns results for an empty query (returns up to 10 users)', async () => {
      const res = await authGet('/api/admin/users/search?q=', admin).expect(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.users.length).toBeLessThanOrEqual(10);
    });

    it('returns 403 for a regular user', async () => {
      await authGet('/api/admin/users/search?q=any', userA).expect(403);
    });

    it('returns 401 without authentication', async () => {
      await request(app).get('/api/admin/users/search?q=any').expect(401);
    });
  });
});
