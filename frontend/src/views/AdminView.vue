<template>
  <div class="layout">
    <NavBar />

    <main class="main-content">
      <div class="container">
        <!-- Header -->
        <div class="page-header">
          <div>
            <div class="admin-tag">
              <span class="badge badge-admin">Admin Panel</span>
            </div>
            <h1 class="page-title">All Tasks</h1>
            <p class="page-subtitle">{{ meta.total }} total tasks across all users</p>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card" v-for="stat in statCards" :key="stat.label">
            <div class="stat-card-icon" :style="{ background: stat.iconBg }">{{ stat.icon }}</div>
            <div>
              <div class="stat-card-value">{{ stat.value }}</div>
              <div class="stat-card-label">{{ stat.label }}</div>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="toolbar">
          <div class="search-wrapper">
            <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              id="admin-search"
              v-model="filters.search"
              class="form-input search-input"
              placeholder="Search all tasks..."
              @input="debouncedFetch"
            />
          </div>
          <div class="filter-group">
            <select id="admin-filter-status" v-model="filters.status" class="form-select filter-select" @change="fetchTasks">
              <option value="">All Status</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
            <select id="admin-filter-priority" v-model="filters.priority" class="form-select filter-select" @change="fetchTasks">
              <option value="">All Priority</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="table-card card">
          <!-- Loading -->
          <div v-if="taskStore.loading" class="table-loading">
            <div class="spinner spinner-dark" style="width: 32px; height: 32px;"></div>
            <span>Loading tasks...</span>
          </div>

          <!-- Error -->
          <div v-else-if="taskStore.error" class="alert alert-error">
            {{ taskStore.error }}
          </div>

          <!-- Table -->
          <div v-else-if="taskStore.tasks.length > 0" class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="task in taskStore.tasks"
                  :key="task.id"
                  class="table-row"
                  :class="{ 'row-done': task.status === 'DONE' }"
                >
                  <td>
                    <div class="task-cell">
                      <div class="task-cell-title" :class="{ 'done-text': task.status === 'DONE' }">
                        {{ task.title }}
                      </div>
                      <div v-if="task.description" class="task-cell-desc">{{ task.description }}</div>
                    </div>
                  </td>
                  <td>
                    <div class="user-cell">
                      <div class="user-avatar-sm">{{ task.user.name.charAt(0) }}</div>
                      <div>
                        <div class="user-cell-name">{{ task.user.name }}</div>
                        <div class="user-cell-email">{{ task.user.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td><StatusBadge :status="task.status" /></td>
                  <td><PriorityBadge :priority="task.priority" /></td>
                  <td>
                    <span
                      v-if="task.dueDate"
                      class="due-date"
                      :class="{ 'due-overdue': isOverdue(task) }"
                    >
                      {{ formatDate(task.dueDate) }}
                    </span>
                    <span v-else class="no-date">—</span>
                  </td>
                  <td class="date-cell">{{ formatDate(task.createdAt) }}</td>
                  <td>
                    <div class="action-btns">
                      <button
                        class="btn btn-ghost btn-sm btn-icon"
                        @click="openEditModal(task)"
                        :id="`admin-edit-${task.id}`"
                        title="Edit"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        class="btn btn-ghost btn-sm btn-icon delete-btn"
                        @click="deleteTargetId = task.id"
                        :id="`admin-delete-${task.id}`"
                        title="Delete"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty -->
          <div v-else class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div class="empty-state-title">No tasks found</div>
            <div class="empty-state-desc">Try adjusting your filters</div>
          </div>

          <!-- Pagination -->
          <div v-if="meta.totalPages > 1" class="table-pagination">
            <span class="pagination-info">
              Showing {{ (meta.page - 1) * meta.limit + 1 }}–{{ Math.min(meta.page * meta.limit, meta.total) }}
              of {{ meta.total }} tasks
            </span>
            <div class="pagination-controls">
              <button
                class="btn btn-secondary btn-sm"
                :disabled="meta.page === 1"
                @click="changePage(meta.page - 1)"
                id="admin-prev-page"
              >← Prev</button>
              <button
                class="btn btn-secondary btn-sm"
                :disabled="meta.page === meta.totalPages"
                @click="changePage(meta.page + 1)"
                id="admin-next-page"
              >Next →</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Edit modal -->
    <TaskModal
      v-if="showModal"
      :edit-task="editingTask"
      @close="showModal = false"
      @saved="handleSaved"
    />

    <!-- Delete confirm -->
    <Teleport to="body">
      <div v-if="deleteTargetId" class="modal-backdrop" @click.self="deleteTargetId = null">
        <div class="modal confirm-modal animate-fade-in">
          <div class="confirm-icon">🗑️</div>
          <h3>Delete Task?</h3>
          <p>This action cannot be undone.</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" @click="deleteTargetId = null" id="admin-cancel-delete">Cancel</button>
            <button class="btn btn-danger" @click="confirmDelete" :disabled="deleting" id="admin-confirm-delete">
              <div v-if="deleting" class="spinner"></div>
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTaskStore, type Task } from '../stores/tasks'
import NavBar from '../components/NavBar.vue'
import TaskModal from '../components/TaskModal.vue'
import StatusBadge from '../components/StatusBadge.vue'
import PriorityBadge from '../components/PriorityBadge.vue'

const taskStore = useTaskStore()
const showModal = ref(false)
const editingTask = ref<Task | null>(null)
const deleteTargetId = ref<string | null>(null)
const deleting = ref(false)

const filters = ref({
  search: '',
  status: '',
  priority: '',
  page: 1,
  limit: 20,
})

const meta = computed(() => taskStore.meta)

const statCards = computed(() => [
  {
    icon: '📋',
    label: 'Total Tasks',
    value: meta.value.total,
    iconBg: 'rgba(99, 120, 220, 0.15)',
  },
  {
    icon: '⏳',
    label: 'To Do',
    value: taskStore.tasks.filter((t) => t.status === 'TODO').length,
    iconBg: 'rgba(59, 130, 246, 0.15)',
  },
  {
    icon: '🔥',
    label: 'In Progress',
    value: taskStore.tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    iconBg: 'rgba(245, 158, 11, 0.15)',
  },
  {
    icon: '✅',
    label: 'Completed',
    value: taskStore.tasks.filter((t) => t.status === 'DONE').length,
    iconBg: 'rgba(16, 185, 129, 0.15)',
  },
])

const isOverdue = (task: Task) => {
  if (!task.dueDate || task.status === 'DONE') return false
  return new Date(task.dueDate) < new Date()
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const fetchTasks = () => {
  const f: Record<string, string | number> = {
    page: filters.value.page,
    limit: filters.value.limit,
  }
  if (filters.value.status) f.status = filters.value.status
  if (filters.value.priority) f.priority = filters.value.priority
  if (filters.value.search) f.search = filters.value.search
  taskStore.fetchAllTasks(f as any)
}

let debounceTimer: ReturnType<typeof setTimeout>
const debouncedFetch = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchTasks, 400)
}

const changePage = (page: number) => {
  filters.value.page = page
  fetchTasks()
}

const openEditModal = (task: Task) => {
  editingTask.value = task
  showModal.value = true
}

const handleSaved = () => {
  showModal.value = false
  editingTask.value = null
  fetchTasks()
}

const confirmDelete = async () => {
  if (!deleteTargetId.value) return
  deleting.value = true
  try {
    await taskStore.deleteTask(deleteTargetId.value)
  } finally {
    deleting.value = false
    deleteTargetId.value = null
  }
}

onMounted(fetchTasks)
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; }
.main-content { flex: 1; padding: var(--space-8) 0 var(--space-12); }

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.admin-tag { margin-bottom: var(--space-2); }

.page-title {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin-top: var(--space-1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4) var(--space-5);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  transition: border-color var(--transition-base);
}

.stat-card:hover {
  border-color: var(--color-border-hover);
}

.stat-card-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-card-value {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: var(--color-text-primary);
  line-height: 1;
}

.stat-card-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: 4px;
  font-weight: 500;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input { padding-left: 2.5rem; }

.filter-group {
  display: flex;
  gap: var(--space-3);
}

.filter-select { width: auto; }

/* Table */
.table-card { padding: 0; overflow: hidden; }

.table-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-16);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.table-wrapper { overflow-x: auto; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.data-table th {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.data-table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.table-row {
  transition: background var(--transition-fast);
}

.table-row:hover {
  background: var(--color-surface-raised);
}

.table-row:last-child td {
  border-bottom: none;
}

.row-done { opacity: 0.6; }

.task-cell-title {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.done-text {
  text-decoration: line-through;
  opacity: 0.7;
}

.task-cell-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.user-avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.user-cell-name {
  font-weight: 500;
  white-space: nowrap;
}

.user-cell-email {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.due-date {
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.due-overdue {
  color: var(--color-danger);
  font-weight: 600;
}

.no-date { color: var(--color-text-muted); }

.date-cell {
  white-space: nowrap;
  color: var(--color-text-muted);
}

.action-btns {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.table-row:hover .action-btns { opacity: 1; }

.delete-btn:hover {
  color: var(--color-danger) !important;
  background: var(--color-danger-bg) !important;
}

.table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-4);
  border-top: 1px solid var(--color-border);
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.pagination-controls {
  display: flex;
  gap: var(--space-2);
}

/* Confirm modal */
.confirm-modal { max-width: 360px; text-align: center; }
.confirm-icon { font-size: 3rem; margin-bottom: var(--space-4); }
.confirm-modal h3 { font-size: var(--font-size-xl); margin-bottom: var(--space-2); }
.confirm-modal p { color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-6); }
.confirm-actions { display: flex; gap: var(--space-3); justify-content: center; }

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .toolbar { flex-direction: column; }
  .filter-group { flex-direction: column; }
}
</style>
