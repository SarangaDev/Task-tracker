import { Router } from 'express';
import { getAllTasks, getTaskById, updateTask, deleteTask } from '../controllers/tasks.controller';
import { searchUsers } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { taskQuerySchema, updateTaskSchema } from '../schemas/task.schema';
import { Role } from '@prisma/client';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireRole(Role.ADMIN));

/**
 * @route   GET /api/admin/tasks
 * @desc    Get all tasks in the system (admin only)
 * @access  ADMIN
 */
router.get('/tasks', validate(taskQuerySchema, 'query'), getAllTasks);
router.get('/tasks/:id', getTaskById);
router.put('/tasks/:id', validate(updateTaskSchema), updateTask);
router.delete('/tasks/:id', deleteTask);

router.get('/users/search', searchUsers);

export default router;
