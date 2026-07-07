<template>
  <div class="layout">
    <NavBar />

    <main class="main-content">
      <div class="container">
        <!-- Page header -->
        <div class="page-header">
          <div>
            <h1 class="page-title">My Tasks</h1>
            <p class="page-subtitle">
              {{ meta.total }} task{{ meta.total !== 1 ? 's' : '' }} total
            </p>
          </div>
          <button class="btn btn-primary" @click="openCreateModal" id="create-task-btn">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Task
          </button>
        </div>

        <!-- Stats bar -->
        <div class="stats-bar">
          <div class="stat-item">
            <div class="stat-value">{{ countByStatus('TODO') }}</div>
            <div class="stat-label">To Do</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-value stat-value-warning">{{ countByStatus('IN_PROGRESS') }}</div>
            <div class="stat-label">In Progress</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-value stat-value-success">{{ countByStatus('DONE') }}</div>
            <div class="stat-label">Completed</div>
          </div>
        </div>

        <!-- Filters toolbar -->
        <div class="toolbar">
          <div class="search-wrapper">
            <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              id="task-search"
              v-model="filters.search"
              class="form-input search-input"
              placeholder="Search tasks..."
              @input="debouncedFetch"
            />
          </div>
          <div class="filter-group">
            <select id="filter-status" v-model="filters.status" class="form-select filter-select" @change="fetchTasks">
              <option value="">All Status</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
            <select id="filter-priority" v-model="filters.priority" class="form-select filter-select" @change="fetchTasks">
              <option value="">All Priority</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <!-- Loading skeletons -->
        <div v-if="taskStore.loading" class="kanban-board">
          <div v-for="col in 3" :key="col" class="kanban-column">
            <div class="kanban-header skeleton" style="height: 36px; margin-bottom: 16px;"></div>
            <div v-for="i in 3" :key="i" class="skeleton" style="height: 120px; margin-bottom: 12px; border-radius: 12px;"></div>
          </div>
        </div>

        <!-- Kanban Board -->
        <div v-else-if="taskStore.tasks.length > 0" class="kanban-board">
          <div
            v-for="column in columns"
            :key="column.status"
            class="kanban-column"
          >
            <div class="kanban-header">
              <div class="kanban-col-title">
                <div class="kanban-dot" :class="`dot-${column.status.toLowerCase().replace('_', '-')}`"></div>
                {{ column.label }}
              </div>
              <span class="kanban-count">{{ columnTasks(column.status).length }}</span>
            </div>

            <div class="kanban-tasks">
              <TransitionGroup name="task-list">
                <TaskCard
                  v-for="task in columnTasks(column.status)"
                  :key="task.id"
                  :task="task"
                  @edit="openEditModal"
                  @delete="handleDelete"
                />
              </TransitionGroup>
              <div v-if="columnTasks(column.status).length === 0" class="column-empty">
                <span>{{ column.emptyMsg }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">No tasks yet</div>
          <div class="empty-state-desc">Create your first task to get started</div>
          <button class="btn btn-primary" @click="openCreateModal" id="empty-create-btn">
            Create Task
          </button>
        </div>

        <!-- Pagination -->
        <div v-if="meta.totalPages > 1" class="pagination">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="meta.page === 1"
            @click="changePage(meta.page - 1)"
            id="prev-page-btn"
          >← Prev</button>
          <span class="page-info">Page {{ meta.page }} of {{ meta.totalPages }}</span>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="meta.page === meta.totalPages"
            @click="changePage(meta.page + 1)"
            id="next-page-btn"
          >Next →</button>
        </div>
      </div>
    </main>

    <!-- Task Modal -->
    <TaskModal
      v-if="showModal"
      :edit-task="editingTask"
      @close="closeModal"
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
            <button class="btn btn-secondary" @click="deleteTargetId = null" id="cancel-delete-btn">Cancel</button>
            <button class="btn btn-danger" @click="confirmDelete" :disabled="deleting" id="confirm-delete-btn">
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
import { useTaskStore, type Task, type TaskStatus } from '../stores/tasks'
import NavBar from '../components/NavBar.vue'
import TaskCard from '../components/TaskCard.vue'
import TaskModal from '../components/TaskModal.vue'

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
})

const meta = computed(() => taskStore.meta)

const columns = [
  { status: 'TODO' as TaskStatus, label: 'To Do', emptyMsg: 'No tasks to do' },
  { status: 'IN_PROGRESS' as TaskStatus, label: 'In Progress', emptyMsg: 'Nothing in progress' },
  { status: 'DONE' as TaskStatus, label: 'Done', emptyMsg: 'No completed tasks' },
]

const columnTasks = (status: TaskStatus) =>
  taskStore.tasks.filter((t) => t.status === status)

const countByStatus = (status: TaskStatus) =>
  taskStore.tasks.filter((t) => t.status === status).length

const fetchTasks = () => {
  const f: Record<string, string | number> = { page: filters.value.page, limit: 50 }
  if (filters.value.status) f.status = filters.value.status
  if (filters.value.priority) f.priority = filters.value.priority
  if (filters.value.search) f.search = filters.value.search
  taskStore.fetchMyTasks(f as any)
}

// Simple debounce for search
let debounceTimer: ReturnType<typeof setTimeout>
const debouncedFetch = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchTasks, 400)
}

const changePage = (page: number) => {
  filters.value.page = page
  fetchTasks()
}

const openCreateModal = () => {
  editingTask.value = null
  showModal.value = true
}

const openEditModal = (task: Task) => {
  editingTask.value = task
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingTask.value = null
}

const handleSaved = () => {
  closeModal()
  fetchTasks()
}

const handleDelete = (id: string) => {
  deleteTargetId.value = id
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
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: var(--space-8) 0 var(--space-12);
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

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

/* Stats bar */
.stats-bar {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-6);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  color: var(--color-text-primary);
}

.stat-value-warning { color: var(--color-warning); }
.stat-value-success { color: var(--color-success); }

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 500;
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--color-border);
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

.search-input {
  padding-left: 2.5rem;
}

.filter-group {
  display: flex;
  gap: var(--space-3);
}

.filter-select {
  width: auto;
}

/* Kanban Board */
.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}

.kanban-column {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  min-height: 400px;
}

.kanban-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.kanban-col-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 700;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kanban-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-todo { background: var(--color-info); }
.dot-in-progress { background: var(--color-warning); }
.dot-done { background: var(--color-success); }

.kanban-count {
  background: var(--color-surface-raised);
  color: var(--color-text-secondary);
  border-radius: var(--radius-full);
  padding: 0.1rem 0.5rem;
  font-size: var(--font-size-xs);
  font-weight: 700;
  min-width: 24px;
  text-align: center;
}

.kanban-tasks {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.column-empty {
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

/* Task list transitions */
.task-list-enter-active,
.task-list-leave-active {
  transition: all 0.3s ease;
}

.task-list-enter-from,
.task-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-8);
}

.page-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* Confirm modal */
.confirm-modal {
  max-width: 360px;
  text-align: center;
}

.confirm-icon {
  font-size: 3rem;
  margin-bottom: var(--space-4);
}

.confirm-modal h3 {
  font-size: var(--font-size-xl);
  margin-bottom: var(--space-2);
}

.confirm-modal p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-6);
}

.confirm-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
}

@media (max-width: 900px) {
  .kanban-board {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .toolbar {
    flex-direction: column;
  }

  .filter-group {
    flex-direction: column;
  }

  .stats-bar {
    gap: var(--space-4);
  }
}
</style>
