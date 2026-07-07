import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { taskService } from '../services/tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from '../schemas/task.schema';

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const dto = req.body as CreateTaskDto;
  const task = await taskService.createTask(userId, dto);

  res.status(201).json({
    status: 'success',
    message: 'Task created successfully',
    data: { task },
  });
});

export const getMyTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const query = req.query as unknown as TaskQueryDto;
  const result = await taskService.getUserTasks(userId, query);

  res.status(200).json({
    status: 'success',
    data: result.data,
    meta: result.meta,
  });
});

export const getAllTasks = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as TaskQueryDto;
  const result = await taskService.getAllTasks(query);

  res.status(200).json({
    status: 'success',
    data: result.data,
    meta: result.meta,
  });
});

export const getTaskById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, role } = req.user!;
  const task = await taskService.getTaskById(id, userId, role);

  res.status(200).json({
    status: 'success',
    data: { task },
  });
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, role } = req.user!;
  const dto = req.body as UpdateTaskDto;
  const task = await taskService.updateTask(id, userId, role, dto);

  res.status(200).json({
    status: 'success',
    message: 'Task updated successfully',
    data: { task },
  });
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, role } = req.user!;
  await taskService.deleteTask(id, userId, role);

  res.status(204).send();
});
