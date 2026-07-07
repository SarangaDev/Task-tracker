import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  dueDate?: string
  userId: string
  user: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export interface TaskMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: Priority
  search?: string
  page?: number
  limit?: number
}

export const useTaskStore = defineStore('tasks', () => {
  // ─── State ──────────────────────────────────────────────────────────────────
  const tasks = ref<Task[]>([])
  const meta = ref<TaskMeta>({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ─── Helper ─────────────────────────────────────────────────────────────────
  const buildParams = (filters: TaskFilters) => {
    const params: Record<string, string> = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.search) params.search = filters.search
    if (filters.page) params.page = String(filters.page)
    if (filters.limit) params.limit = String(filters.limit)
    return params
  }

  // ─── Actions ────────────────────────────────────────────────────────────────
  const fetchMyTasks = async (filters: TaskFilters = {}) => {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/tasks', { params: buildParams(filters) })
      tasks.value = data.data
      meta.value = data.meta
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch tasks'
    } finally {
      loading.value = false
    }
  }

  const fetchAllTasks = async (filters: TaskFilters = {}) => {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/admin/tasks', { params: buildParams(filters) })
      tasks.value = data.data
      meta.value = data.meta
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch tasks'
    } finally {
      loading.value = false
    }
  }

  const createTask = async (payload: {
    title: string
    description?: string
    status?: TaskStatus
    priority?: Priority
    dueDate?: string
  }) => {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/tasks', payload)
      tasks.value.unshift(data.data.task)
      meta.value.total++
      return data.data.task as Task
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create task'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTask = async (
    taskId: string,
    payload: Partial<{
      title: string
      description: string
      status: TaskStatus
      priority: Priority
      dueDate: string
    }>
  ) => {
    try {
      const { data } = await api.put(`/tasks/${taskId}`, payload)
      const idx = tasks.value.findIndex((t) => t.id === taskId)
      if (idx !== -1) tasks.value[idx] = data.data.task
      return data.data.task as Task
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update task'
      throw err
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`)
      tasks.value = tasks.value.filter((t) => t.id !== taskId)
      meta.value.total--
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete task'
      throw err
    }
  }

  return {
    tasks,
    meta,
    loading,
    error,
    fetchMyTasks,
    fetchAllTasks,
    createTask,
    updateTask,
    deleteTask,
  }
})
