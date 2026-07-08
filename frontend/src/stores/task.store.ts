import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuthStore } from './auth.store';
import type { Task } from '../types';

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([]);
  const meta = ref({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchTasks = async (query = {}) => {
    loading.value = true;
    try {
      const authStore = useAuthStore();
      const endpoint = authStore.user?.role === 'ADMIN' ? '/admin/tasks' : '/tasks';
      const res = await api.get(endpoint, { params: query });
      tasks.value = res.data.data;
      meta.value = res.data.meta;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      error.value = e.response?.data?.message || 'Failed to fetch tasks';
    } finally {
      loading.value = false;
    }
  };

  const getTaskById = async (id: string) => {
    const authStore = useAuthStore();
    const endpoint = authStore.user?.role === 'ADMIN' ? `/admin/tasks/${id}` : `/tasks/${id}`;
    const res = await api.get(endpoint);
    return res.data.data.task;
  };

  const createTask = async (data: Record<string, unknown>) => {
    await api.post('/tasks', data);
    // Realtime event will update the list
  };

  const updateTask = async (id: string, data: Record<string, unknown>) => {
    const authStore = useAuthStore();
    const endpoint = authStore.user?.role === 'ADMIN' ? `/admin/tasks/${id}` : `/tasks/${id}`;
    await api.put(endpoint, data);
    // Realtime event will update the list
  };

  const deleteTask = async (id: string) => {
    const authStore = useAuthStore();
    const endpoint = authStore.user?.role === 'ADMIN' ? `/admin/tasks/${id}` : `/tasks/${id}`;
    await api.delete(endpoint);
    // Realtime event will update the list
  };

  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) return;
    
    // Clear old listeners if any
    socket.off('task:created');
    socket.off('task:updated');
    socket.off('task:deleted');

    socket.on('task:created', () => {
      // Add if we are on the first page, or just refetch to be safe
      fetchTasks({ page: meta.value.page, limit: meta.value.limit });
    });

    socket.on('task:updated', (data) => {
      const index = tasks.value.findIndex(t => t.id === data.task.id);
      if (index !== -1) {
        tasks.value[index] = data.task;
      }
    });

    socket.on('task:deleted', (data) => {
      tasks.value = tasks.value.filter(t => t.id !== data.taskId);
    });
  };

  return {
    tasks,
    meta,
    loading,
    error,
    fetchTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    setupSocketListeners
  };
});
