import { Router } from 'express';
import {
  createTask,
  getMyTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from '../controllers/tasks.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from '../schemas/task.schema';

const router = Router();

// All task routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/tasks
 * @desc    Get authenticated user's tasks (paginated, filterable)
 * @access  Protected (USER / ADMIN — own tasks for user, use /admin/tasks for all)
 */
router.get('/', validate(taskQuerySchema, 'query'), getMyTasks);

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Protected
 */
router.post('/', validate(createTaskSchema), createTask);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task by ID (owner or admin)
 * @access  Protected
 */
router.get('/:id', getTaskById);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task (owner or admin)
 * @access  Protected
 */
router.put('/:id', validate(updateTaskSchema), updateTask);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task (owner or admin)
 * @access  Protected
 */
router.delete('/:id', deleteTask);

export default router;
