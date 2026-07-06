import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { userService } from '../services/users.service';

export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string || '';
  const users = await userService.searchUsers(query);
  
  res.status(200).json({
    status: 'success',
    data: { users },
  });
});
