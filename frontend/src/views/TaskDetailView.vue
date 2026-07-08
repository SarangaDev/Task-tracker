<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTaskStore } from '../stores/task.store';
import TaskModal from '../components/TaskModal.vue';
import { format } from 'date-fns';
import type { Task } from '../types';

const route = useRoute();
const router = useRouter();
const taskStore = useTaskStore();

const task = ref<Task | null>(null);
const loading = ref(true);
const error = ref('');
const isEditModalOpen = ref(false);

const loadTask = async () => {
  loading.value = true;
  try {
    task.value = await taskStore.getTaskById(route.params.id as string);
  } catch {
    error.value = 'Task not found or you do not have permission.';
  } finally {
    loading.value = false;
  }
};

onMounted(loadTask);

const handleDelete = async () => {
  if (confirm('Are you sure you want to delete this task?')) {
    try {
      if (task.value) {
        await taskStore.deleteTask(task.value.id);
        router.push('/');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e.response?.data?.message || 'Failed to delete task');
    }
  }
};
</script>

<template>
  <div class="container animate-fade-in">
    <button class="btn btn-ghost back-btn" @click="router.push('/')">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
      Back to Tasks
    </button>

    <div v-if="loading" class="text-center py-5">Loading task details...</div>
    <div v-else-if="error" class="error-msg glass-panel text-center py-5">{{ error }}</div>
    
    <div v-else-if="task" class="task-detail-container glass-panel">
      <div class="detail-header">
        <div class="badges">
          <span :class="['badge', `priority-${task.priority.toLowerCase()}`]">{{ task.priority }}</span>
          <span :class="['badge', `status-${task.status.toLowerCase().replace('_', '')}`]">{{ task.status.replace('_', ' ') }}</span>
        </div>
        
        <div class="actions">
          <button class="btn btn-secondary mr-2" @click="isEditModalOpen = true">Edit</button>
          <button class="btn btn-danger" @click="handleDelete">Delete</button>
        </div>
      </div>

      <h1 class="title">{{ task.title }}</h1>
      
      <div class="meta-info">
        <div class="meta-item">
          <span class="label">Due Date:</span>
          <span class="value">{{ task.dueDate ? format(new Date(task.dueDate), 'PPP') : 'No due date' }}</span>
        </div>
        <div class="meta-item" v-if="task.user">
          <span class="label">Owner:</span>
          <span class="value">{{ task.user.name }} ({{ task.user.email }})</span>
        </div>
        <div class="meta-item">
          <span class="label">Created:</span>
          <span class="value">{{ task.createdAt ? format(new Date(task.createdAt as string), 'MMM d, yyyy h:mm a') : 'N/A' }}</span>
        </div>
      </div>

      <div class="description">
        <h3>Description</h3>
        <p v-if="task.description">{{ task.description }}</p>
        <p v-else class="text-muted">No description provided.</p>
      </div>
    </div>

    <TaskModal 
      v-if="isEditModalOpen" 
      :task="task || undefined" 
      @close="isEditModalOpen = false; loadTask()" 
    />
  </div>
</template>

<style scoped>
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-main);
  border-radius: 20px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.task-detail-container {
  padding: 40px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.badges {
  display: flex;
  gap: 12px;
}

.badge {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 20px;
}

.priority-low { background: rgba(6, 214, 160, 0.2); color: var(--priority-low); }
.priority-medium { background: rgba(255, 190, 11, 0.2); color: var(--priority-medium); }
.priority-high { background: rgba(255, 0, 110, 0.2); color: var(--priority-high); }
.status-todo { border: 1px solid var(--status-todo); color: var(--status-todo); }
.status-inprogress { border: 1px solid var(--status-inprogress); color: var(--status-inprogress); }
.status-done { border: 1px solid var(--status-done); color: var(--status-done); }

.mr-2 { margin-right: 12px; }
.py-5 { padding: 40px 0; }
.text-center { text-align: center; }

.title {
  font-size: 2.5rem;
  margin-bottom: 30px;
  color: #fff;
}

.meta-info {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  padding: 20px;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  margin-bottom: 40px;
}

.meta-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.value {
  font-weight: 500;
}

.description h3 {
  margin-bottom: 16px;
  font-size: 1.25rem;
  color: var(--accent-primary);
}

.description p {
  white-space: pre-wrap;
  line-height: 1.6;
}
</style>
