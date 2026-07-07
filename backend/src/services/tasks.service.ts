import { Prisma, Role } from '@prisma/client';
import prisma from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from '../schemas/task.schema';
import { getIO } from '../config/socket';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class TaskService {
  /**
   * Create a task for the authenticated user
   */
  async createTask(userId: string, dto: CreateTaskDto) {
    const task = await prisma.task.create({
      data: {
        ...dto,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const eventContext = {
      actorId: userId,
      actorRole: Role.USER, // Assuming they are creating their own task
      isOwnAction: true,
      task,
    };
    
    // Broadcast to the user's room and admin room
    try {
      getIO().to(`room_user_${userId}`).to('room_admin').emit('task:created', eventContext);
    } catch (err) {
      console.error('Socket error on createTask:', err);
    }

    return task;
  }

  /**
   * Get tasks for a specific user (USER role — own tasks only)
   */
  async getUserTasks(
    userId: string,
    query: TaskQueryDto
  ): Promise<PaginatedResult<unknown>> {
    const { status, priority, page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      userId,
      ...(status && { status }),
      ...(priority && { priority }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all tasks (ADMIN only)
   */
  async getAllTasks(query: TaskQueryDto): Promise<PaginatedResult<unknown>> {
    const { status, priority, page, limit, search, userId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(userId && { userId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single task by ID — owner or admin can access
   */
  async getTaskById(taskId: string, requesterId: string, requesterRole: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    if (task.userId !== requesterId && requesterRole !== Role.ADMIN) {
      throw new ForbiddenError('You do not have access to this task');
    }

    return task;
  }

  /**
   * Update a task — owner or admin only
   */
  async updateTask(
    taskId: string,
    requesterId: string,
    requesterRole: string,
    dto: UpdateTaskDto
  ) {
    // Verify exists and requester has access
    await this.getTaskById(taskId, requesterId, requesterRole);

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: dto,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const eventContext = {
      actorId: requesterId,
      actorRole: requesterRole,
      isOwnAction: updatedTask.userId === requesterId,
      task: updatedTask,
    };
    
    try {
      getIO().to(`room_user_${updatedTask.userId}`).to('room_admin').emit('task:updated', eventContext);
    } catch (err) {
      console.error('Socket error on updateTask:', err);
    }

    return updatedTask;
  }

  /**
   * Delete a task — owner or admin only
   */
  async deleteTask(taskId: string, requesterId: string, requesterRole: string) {
    // Verify exists and requester has access
    const task = await this.getTaskById(taskId, requesterId, requesterRole);

    await prisma.task.delete({ where: { id: taskId } });

    const eventContext = {
      actorId: requesterId,
      actorRole: requesterRole,
      isOwnAction: task.userId === requesterId,
      taskId: task.id,
      taskTitle: task.title,
      taskOwnerId: task.userId,
    };
    
    try {
      getIO().to(`room_user_${task.userId}`).to('room_admin').emit('task:deleted', eventContext);
    } catch (err) {
      console.error('Socket error on deleteTask:', err);
    }
  }
}

export const taskService = new TaskService();
