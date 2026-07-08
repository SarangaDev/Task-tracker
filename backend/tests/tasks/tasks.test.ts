import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { getIO } from '../../src/config/socket';

// ── Mock Socket.IO ───────────────────────────────────────────────────────────
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
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface AuthSession {
  cookieHeader: string;
  csrfToken: string;
  userId: string;
}

/** Register (or promote-then-re-login) a user and return auth session info. */
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

  // Re-login so the cookie reflects the current role
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: userData.email, password: userData.password });

  const rawCookies: string[] = (loginRes.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  const cookieHeader = rawCookies.map((c) => c.split(';')[0]).join('; ');

  // Extract csrf_token value
  const csrfPair = rawCookies.find((c) => c.startsWith('csrf_token=')) ?? '';
  const csrfToken = csrfPair.split(';')[0].replace('csrf_token=', '');

  return { cookieHeader, csrfToken, userId };
};

/** Authenticated GET helper. */
const authGet = (path: string, session: AuthSession) =>
  request(app).get(path).set('Cookie', session?.cookieHeader || '');

/** Authenticated POST helper. */
const authPost = (path: string, session: AuthSession, body: object) =>
  request(app)
    .post(path)
    .set('Cookie', session?.cookieHeader || '')
    .set('X-CSRF-Token', session?.csrfToken || '')
    .send(body);

/** Authenticated PUT helper. */
const authPut = (path: string, session: AuthSession, body: object) =>
  request(app)
    .put(path)
    .set('Cookie', session?.cookieHeader || '')
    .set('X-CSRF-Token', session?.csrfToken || '')
    .send(body);

/** Authenticated DELETE helper. */
const authDelete = (path: string, session: AuthSession) =>
  request(app)
    .delete(path)
    .set('Cookie', session?.cookieHeader || '')
    .set('X-CSRF-Token', session?.csrfToken || '');

// ─────────────────────────────────────────────────────────────────────────────

const USER_DATA = { name: 'Task User', email: 'taskuser@example.com', password: 'Test@1234' };
const OTHER_DATA = { name: 'Other User', email: 'otheruser@example.com', password: 'Test@1234' };
const ADMIN_DATA = {
  name: 'Task Admin',
  email: 'taskadmin@example.com',
  password: 'Admin@1234',
  role: 'ADMIN' as const,
};

describe('Tasks Routes', () => {
  let user: AuthSession;
  let other: AuthSession;
  let admin: AuthSession;

  /** A task owned by `user`, recreated before each describe block that needs it. */
  let taskId: string;

  beforeAll(async () => {
    // Clean slate
    for (const email of [USER_DATA.email, OTHER_DATA.email, ADMIN_DATA.email]) {
      await prisma.task.deleteMany({ where: { user: { email } } });
      await prisma.user.deleteMany({ where: { email } });
    }

    [user, other, admin] = await Promise.all([
      createSession(USER_DATA),
      createSession(OTHER_DATA),
      createSession(ADMIN_DATA),
    ]);
  });

  afterAll(async () => {
    for (const email of [USER_DATA.email, OTHER_DATA.email, ADMIN_DATA.email]) {
      await prisma.task.deleteMany({ where: { user: { email } } });
      await prisma.user.deleteMany({ where: { email } });
    }
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /api/tasks ────────────────────────────────────────────────────────

  describe('POST /api/tasks', () => {
    it('creates a task for an authenticated user and returns 201', async () => {
      const res = await authPost('/api/tasks', user, {
        title: 'My First Task',
        description: 'A test task',
        priority: 'HIGH',
      }).expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.task.title).toBe('My First Task');
      expect(res.body.data.task.status).toBe('TODO');
      expect(res.body.data.task.priority).toBe('HIGH');
      expect(res.body.data.task.userId).toBe(user.userId);

      taskId = res.body.data.task.id;
    });

    it('defaults status to TODO and priority to MEDIUM when not specified', async () => {
      const res = await authPost('/api/tasks', user, { title: 'Defaults task' }).expect(201);

      expect(res.body.data.task.status).toBe('TODO');
      expect(res.body.data.task.priority).toBe('MEDIUM');
    });

    it('accepts a valid dueDate and stores it', async () => {
      const future = new Date(Date.now() + 86_400_000).toISOString();
      const res = await authPost('/api/tasks', user, {
        title: 'Task with due date',
        dueDate: future,
      }).expect(201);

      expect(res.body.data.task.dueDate).toBeDefined();
    });

    it('emits task:created socket event to the user and admin room', async () => {
      const res = await authPost('/api/tasks', user, { title: 'Socket task' }).expect(201);

      const ioMock = getIO();
      expect(ioMock.to).toHaveBeenCalledWith(`room_user_${user.userId}`);
      expect(
        ioMock.to(`room_user_${user.userId}`).to('room_admin').emit
      ).toHaveBeenCalledWith(
        'task:created',
        expect.objectContaining({
          actorId: user.userId,
          isOwnAction: true,
          task: expect.objectContaining({ id: res.body.data.task.id }),
        })
      );
    });

    it('returns 403 (due to CSRF) without authentication', async () => {
      await request(app).post('/api/tasks').send({ title: 'No auth' }).expect(403);
    });

    it('returns 400 for an empty title', async () => {
      const res = await authPost('/api/tasks', user, { title: '' }).expect(400);
      expect(res.body.status).toBe('fail');
    });

    it('returns 400 for a title that exceeds 200 characters', async () => {
      const res = await authPost('/api/tasks', user, { title: 'A'.repeat(201) }).expect(400);
      expect(res.body.status).toBe('fail');
    });

    it('returns 400 for an invalid status enum value', async () => {
      await authPost('/api/tasks', user, {
        title: 'Valid',
        status: 'INVALID_STATUS',
      }).expect(400);
    });

    it('returns 400 for an invalid priority enum value', async () => {
      await authPost('/api/tasks', user, {
        title: 'Valid',
        priority: 'SUPER_HIGH',
      }).expect(400);
    });

    it('returns 400 for an invalid (non-date) dueDate', async () => {
      await authPost('/api/tasks', user, {
        title: 'Bad date',
        dueDate: 'not-a-date',
      }).expect(400);
    });
  });

  // ── GET /api/tasks ─────────────────────────────────────────────────────────

  describe('GET /api/tasks', () => {
    beforeAll(async () => {
      // Seed several tasks for `user` with different statuses and priorities
      await authPost('/api/tasks', user, { title: 'Todo task', status: 'TODO', priority: 'LOW' });
      await authPost('/api/tasks', user, { title: 'In progress', status: 'IN_PROGRESS', priority: 'HIGH' });
      await authPost('/api/tasks', user, { title: 'Done task', status: 'DONE', priority: 'MEDIUM' });
      // A task belonging to `other` (must NOT appear in user's list)
      await authPost('/api/tasks', other, { title: 'Other user task' });
    });

    it('returns only the authenticated user\'s tasks', async () => {
      const res = await authGet('/api/tasks', user).expect(200);

      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      res.body.data.forEach((t: { userId: string }) => {
        expect(t.userId).toBe(user.userId);
      });
    });

    it('returns pagination metadata', async () => {
      const res = await authGet('/api/tasks?page=1&limit=2', user).expect(200);

      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(typeof res.body.meta.total).toBe('number');
      expect(typeof res.body.meta.totalPages).toBe('number');
    });

    it('respects the limit parameter — returns at most N tasks', async () => {
      const res = await authGet('/api/tasks?page=1&limit=1', user).expect(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    it('filters by status=TODO', async () => {
      const res = await authGet('/api/tasks?status=TODO', user).expect(200);
      res.body.data.forEach((t: { status: string }) => {
        expect(t.status).toBe('TODO');
      });
    });

    it('filters by status=IN_PROGRESS', async () => {
      const res = await authGet('/api/tasks?status=IN_PROGRESS', user).expect(200);
      res.body.data.forEach((t: { status: string }) => {
        expect(t.status).toBe('IN_PROGRESS');
      });
    });

    it('filters by priority=HIGH', async () => {
      const res = await authGet('/api/tasks?priority=HIGH', user).expect(200);
      res.body.data.forEach((t: { priority: string }) => {
        expect(t.priority).toBe('HIGH');
      });
    });

    it('searches by title keyword (case-insensitive)', async () => {
      const res = await authGet('/api/tasks?search=progress', user).expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((t: { title: string; description?: string }) => {
        const matches =
          t.title.toLowerCase().includes('progress') ||
          (t.description ?? '').toLowerCase().includes('progress');
        expect(matches).toBe(true);
      });
    });

    it('returns empty array when search matches nothing', async () => {
      const res = await authGet('/api/tasks?search=xyzzy_no_match_4444', user).expect(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('returns 401 without authentication', async () => {
      await request(app).get('/api/tasks').expect(401);
    });
  });

  // ── GET /api/tasks/:id ─────────────────────────────────────────────────────

  describe('GET /api/tasks/:id', () => {
    beforeAll(async () => {
      const res = await authPost('/api/tasks', user, { title: 'Task for get-by-id' });
      taskId = res.body.data.task.id;
    });

    it('returns the task to its owner', async () => {
      const res = await authGet(`/api/tasks/${taskId}`, user).expect(200);
      expect(res.body.data.task.id).toBe(taskId);
    });

    it('returns the task to an admin (even though admin is not the owner)', async () => {
      const res = await authGet(`/api/tasks/${taskId}`, admin).expect(200);
      expect(res.body.data.task.id).toBe(taskId);
    });

    it('returns 403 when a regular user tries to access another user\'s task', async () => {
      const res = await authGet(`/api/tasks/${taskId}`, other).expect(403);
      expect(res.body.status).toBe('fail');
    });

    it('returns 404 for a non-existent task ID', async () => {
      await authGet('/api/tasks/nonexistentid99999', user).expect(404);
    });

    it('returns 401 without authentication', async () => {
      await request(app).get(`/api/tasks/${taskId}`).expect(401);
    });
  });

  // ── PUT /api/tasks/:id ─────────────────────────────────────────────────────

  describe('PUT /api/tasks/:id', () => {
    beforeEach(async () => {
      const res = await authPost('/api/tasks', user, { title: 'Task to update', priority: 'LOW' });
      taskId = res.body.data.task.id;
    });

    it('allows the owner to update the task', async () => {
      const res = await authPut(`/api/tasks/${taskId}`, user, {
        title: 'Updated Title',
        status: 'IN_PROGRESS',
      }).expect(200);

      expect(res.body.data.task.title).toBe('Updated Title');
      expect(res.body.data.task.status).toBe('IN_PROGRESS');
    });

    it('allows an admin to update another user\'s task', async () => {
      const res = await authPut(`/api/tasks/${taskId}`, admin, {
        priority: 'HIGH',
      }).expect(200);

      expect(res.body.data.task.priority).toBe('HIGH');
    });

    it('emits task:updated with isOwnAction=true when owner updates', async () => {
      await authPut(`/api/tasks/${taskId}`, user, { status: 'DONE' }).expect(200);

      const ioMock = getIO();
      expect(
        ioMock.to(`room_user_${user.userId}`).to('room_admin').emit
      ).toHaveBeenCalledWith(
        'task:updated',
        expect.objectContaining({ actorId: user.userId, isOwnAction: true })
      );
    });

    it('emits task:updated with isOwnAction=false when admin updates', async () => {
      await authPut(`/api/tasks/${taskId}`, admin, { status: 'DONE' }).expect(200);

      const ioMock = getIO();
      expect(
        ioMock.to(`room_user_${user.userId}`).to('room_admin').emit
      ).toHaveBeenCalledWith(
        'task:updated',
        expect.objectContaining({ isOwnAction: false })
      );
    });

    it('returns 403 when another regular user tries to update the task', async () => {
      await authPut(`/api/tasks/${taskId}`, other, { title: 'Stolen update' }).expect(403);
    });

    it('returns 400 for an empty title string', async () => {
      await authPut(`/api/tasks/${taskId}`, user, { title: '' }).expect(400);
    });

    it('returns 400 for an invalid status', async () => {
      await authPut(`/api/tasks/${taskId}`, user, { status: 'NOPE' }).expect(400);
    });

    it('returns 404 for a non-existent task ID', async () => {
      await authPut('/api/tasks/nonexistentid99999', user, { title: 'x' }).expect(404);
    });

    it('returns 403 (due to CSRF) without authentication', async () => {
      await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: 'No auth' })
        .expect(403);
    });
  });

  // ── DELETE /api/tasks/:id ─────────────────────────────────────────────────

  describe('DELETE /api/tasks/:id', () => {
    beforeEach(async () => {
      const res = await authPost('/api/tasks', user, { title: 'Task to delete' });
      taskId = res.body.data.task.id;
    });

    it('allows the owner to delete their task and returns 204', async () => {
      await authDelete(`/api/tasks/${taskId}`, user).expect(204);

      // Verify it is gone
      await authGet(`/api/tasks/${taskId}`, user).expect(404);
    });

    it('emits task:deleted socket event after deletion', async () => {
      await authDelete(`/api/tasks/${taskId}`, user).expect(204);

      const ioMock = getIO();
      expect(
        ioMock.to(`room_user_${user.userId}`).to('room_admin').emit
      ).toHaveBeenCalledWith(
        'task:deleted',
        expect.objectContaining({ actorId: user.userId, taskId })
      );
    });

    it('returns 403 when another regular user tries to delete the task', async () => {
      await authDelete(`/api/tasks/${taskId}`, other).expect(403);
    });

    it('returns 404 when trying to delete an already-deleted task', async () => {
      await authDelete(`/api/tasks/${taskId}`, user).expect(204);
      // Second attempt — already gone
      await authDelete(`/api/tasks/${taskId}`, user).expect(404);
    });

    it('returns 404 for a non-existent task ID', async () => {
      await authDelete('/api/tasks/nonexistentid99999', user).expect(404);
    });

    it('returns 403 (due to CSRF) without authentication', async () => {
      await request(app).delete(`/api/tasks/${taskId}`).expect(403);
    });
  });
});
