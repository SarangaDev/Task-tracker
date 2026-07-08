<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useTaskStore } from '../stores/task.store';
import TaskCard from '../components/TaskCard.vue';
import TaskBoard from '../components/TaskBoard.vue';
import TaskModal from '../components/TaskModal.vue';
import { useAuthStore } from '../stores/auth.store';
import { getSocket } from '../services/socket';
import api from '../services/api';
import type { User } from '../types';

const taskStore = useTaskStore();
const authStore = useAuthStore();
const isModalOpen = ref(false);
const viewMode = ref(localStorage.getItem('taskViewMode') || 'GRID');

const toggleView = (mode: string) => {
  viewMode.value = mode;
  localStorage.setItem('taskViewMode', mode);
};

const filters = ref({
  status: '',
  priority: '',
  userId: '',
  page: 1,
  limit: 9
});

const searchId = ref('');
const userSearch = ref('');
const userSearchResults = ref<User[]>([]);
const isSearchingUsers = ref(false);
const showNoResults = ref(false);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const loadTasks = () => {
  const query: Record<string, unknown> = { page: filters.value.page, limit: filters.value.limit };
  if (filters.value.status) query.status = filters.value.status;
  if (filters.value.priority) query.priority = filters.value.priority;
  if (filters.value.userId && authStore.user?.role === 'ADMIN') query.userId = filters.value.userId;
  taskStore.fetchTasks(query);
};

const handleSearchById = async () => {
  if (!searchId.value) {
    loadTasks();
    return;
  }
  taskStore.loading = true;
  taskStore.tasks = [];
  try {
    const task = await taskStore.getTaskById(searchId.value);
    taskStore.tasks = [task];
    taskStore.meta = { page: 1, limit: 9, total: 1, totalPages: 1 };
  } catch {
    showNotification('Task not found');
    taskStore.meta = { page: 1, limit: 9, total: 0, totalPages: 0 };
  } finally {
    taskStore.loading = false;
  }
};

const handleUserSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  if (!userSearch.value) {
    userSearchResults.value = [];
    showNoResults.value = false;
    filters.value.userId = '';
    return;
  }
  
  searchTimeout = setTimeout(async () => {
    isSearchingUsers.value = true;
    showNoResults.value = false;
    try {
      const res = await api.get('/admin/users/search', { params: { q: userSearch.value } });
      userSearchResults.value = res.data.data.users;
      if (userSearchResults.value.length === 0) {
        showNoResults.value = true;
      }
    } catch (err) {
      console.error(err);
    } finally {
      isSearchingUsers.value = false;
    }
  }, 300);
};

const selectUser = (user: User) => {
  userSearch.value = user.name;
  filters.value.userId = user.id;
  userSearchResults.value = [];
  showNoResults.value = false;
};

// Notification State
const notification = ref<{message: string, show: boolean}>({ message: '', show: false });

const showNotification = (msg: string) => {
  notification.value = { message: msg, show: true };
  setTimeout(() => notification.value.show = false, 4000);
};

onMounted(() => {
  loadTasks();
  taskStore.setupSocketListeners();

  const socket = getSocket();
  if (socket) {
    socket.on('task:updated', (data) => {
      if (!data.isOwnAction && data.task?.userId === authStore.user?.id) {
        showNotification(`A task was updated by ${data.actorRole === 'ADMIN' ? 'an Admin' : 'a user'}`);
      }
    });
    socket.on('task:deleted', (data) => {
      if (!data.isOwnAction && data.taskOwnerId === authStore.user?.id) {
        showNotification(`Task "${data.taskTitle}" was deleted by ${data.actorRole === 'ADMIN' ? 'an Admin' : 'a user'}`);
      }
    });
  }
});

onUnmounted(() => {
  const socket = getSocket();
  if (socket) {
    socket.off('task:updated');
    socket.off('task:deleted');
  }
});

watch(filters, loadTasks, { deep: true });

const prevPage = () => {
  if (filters.value.page > 1) filters.value.page--;
};
const nextPage = () => {
  if (filters.value.page < taskStore.meta.totalPages) filters.value.page++;
};
</script>

<template>
  <div class="container animate-fade-in">
    <div class="header-section">
      <div>
        <h2>Your Tasks</h2>
        <p class="subtitle text-muted">Manage and track your progress</p>
      </div>
      <div style="display: flex; gap: 16px; align-items: center;">
        <div class="view-toggle glass-panel">
          <button 
            :class="['toggle-btn', { active: viewMode === 'GRID' }]" 
            @click="toggleView('GRID')"
          >
            List
          </button>
          <button 
            :class="['toggle-btn', { active: viewMode === 'BOARD' }]" 
            @click="toggleView('BOARD')"
          >
            Board
          </button>
        </div>
        <button class="btn btn-primary" @click="isModalOpen = true">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Task
        </button>
      </div>
    </div>

    <!-- Real-time Notification -->
    <transition name="fade">
      <div v-if="notification.show" class="notification-toast glass-panel">
        {{ notification.message }}
      </div>
    </transition>

    <div class="filters glass-panel">
      <div class="form-group mb-0 search-bar">
        <div style="display: flex; gap: 8px;">
          <input type="text" v-model="searchId" placeholder="Search Task by ID..." @keyup.enter="handleSearchById" />
          <button class="btn btn-secondary" @click="handleSearchById">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Search
          </button>
        </div>
      </div>
      
      <div class="form-group mb-0">
        <select v-model="filters.status">
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
      </div>
      <div class="form-group mb-0">
        <select v-model="filters.priority">
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>
      <div class="form-group mb-0 search-user-container" v-if="authStore.user?.role === 'ADMIN'">
        <input 
          type="text" 
          v-model="userSearch" 
          placeholder="Filter by Owner Name..." 
          @input="handleUserSearchInput"
        />
        <div v-if="userSearchResults.length > 0 || showNoResults" class="autocomplete-dropdown glass-panel">
          <div v-if="showNoResults" class="autocomplete-item no-results">
            No users found matching "{{ userSearch }}"
          </div>
          <div 
            v-for="user in userSearchResults" 
            :key="user.id" 
            class="autocomplete-item"
            @click="selectUser(user)"
          >
            {{ user.name }} <small>({{ user.email }})</small>
          </div>
        </div>
      </div>
    </div>

    <div v-if="taskStore.loading" class="text-center py-5">
      Loading tasks...
    </div>
    
    <div v-else-if="taskStore.tasks.length === 0" class="empty-state glass-panel text-center">
      <h3>No tasks found</h3>
      <p>Create a new task to get started.</p>
      <button class="btn btn-secondary mt-3" @click="isModalOpen = true">Create Task</button>
    </div>

    <div v-else>
      <div v-if="viewMode === 'GRID'">
        <div class="task-grid">
          <TaskCard v-for="task in taskStore.tasks" :key="task.id" :task="task" />
        </div>
      </div>
      <div v-else>
        <TaskBoard :tasks="taskStore.tasks" />
      </div>

      <div class="pagination">
        <button class="btn btn-secondary" :disabled="filters.page === 1" @click="prevPage">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Previous
        </button>
        <span class="page-info">Page {{ taskStore.meta.page }} of {{ taskStore.meta.totalPages || 1 }}</span>
        <button class="btn btn-secondary" :disabled="filters.page >= taskStore.meta.totalPages" @click="nextPage">
          Next
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </div>

    <TaskModal v-if="isModalOpen" @close="isModalOpen = false" />
  </div>
</template>

<style scoped>
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 30px;
}

.view-toggle {
  display: flex;
  padding: 4px;
  border-radius: 8px;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 6px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: #fff;
}

.toggle-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
  margin-bottom: 30px;
}

.search-bar {
  flex: 1 1 100%;
  margin-bottom: 16px;
}

.search-user-container {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  padding: 8px 0;
}

.autocomplete-item {
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.autocomplete-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.autocomplete-item small {
  color: var(--text-muted);
}

.no-results {
  color: var(--text-muted);
  font-style: italic;
  cursor: default;
}

.no-results:hover {
  background: transparent;
}

.mb-0 { margin-bottom: 0; }
.py-5 { padding: 40px 0; }
.text-center { text-align: center; }
.mt-3 { margin-top: 16px; }

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.empty-state {
  padding: 60px 20px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 40px;
}

.pagination .btn {
  width: 130px;
}

.page-info {
  font-family: var(--font-display);
  font-weight: 500;
}

.notification-toast {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: var(--accent-gradient);
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}
</style>
