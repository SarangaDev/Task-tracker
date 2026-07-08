export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  userId: string;
  user?: User;
  createdAt?: string;
  updatedAt?: string;
}
