<script setup lang="ts">
import { ref, computed } from 'vue';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/auth.store';
import type { Task } from '../types';

const props = defineProps<{
  task: Task
}>();

const _emit = defineEmits(['close']);

const authStore = useAuthStore();
const copied = ref(false);

const copyId = () => {
  navigator.clipboard.writeText(props.task.id);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
};

const statusClass = computed(() => `status-${props.task.status.toLowerCase().replace('_', '')}`);
const priorityClass = computed(() => `priority-${props.task.priority.toLowerCase()}`);

const formattedDate = computed(() => {
  if (!props.task.dueDate) return 'No due date';
  return format(new Date(props.task.dueDate as string), 'MMM d, yyyy');
});
</script>

<template>
  <div 
    class="task-card glass-panel" 
    @click="$router.push(`/task/${task.id}`)"
  >
    <div class="card-header">
      <span :class="['badge', priorityClass]">{{ task.priority }}</span>
      <span :class="['badge', statusClass]">{{ task.status.replace('_', ' ') }}</span>
    </div>
    <div class="title-row">
      <h3 class="task-title">{{ task.title }}</h3>
      <button class="copy-id-btn" @click.stop="copyId" :title="copied ? 'Copied!' : 'Copy Task ID'">
        <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06d6a0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </button>
    </div>
    
    <p class="task-desc" v-if="task.description">
      {{ task.description.length > 100 ? task.description.substring(0, 100) + '...' : task.description }}
    </p>
    
    <div class="card-footer">
      <div class="date-info">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        {{ formattedDate }}
      </div>
      <router-link :to="`/task/${task.id}`" class="btn-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
      </router-link>
    </div>
    
    <!-- Admin owner info -->
    <div class="owner-badge" v-if="task.user && task.userId !== authStore.user?.id">
      <small>@{{ task.user.name }}</small>
    </div>
  </div>
</template>

<style scoped>
.task-card {
  padding: 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.task-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}

.priority-low { background: rgba(6, 214, 160, 0.2); color: var(--priority-low); }
.priority-medium { background: rgba(255, 190, 11, 0.2); color: var(--priority-medium); }
.priority-high { background: rgba(255, 0, 110, 0.2); color: var(--priority-high); }

.status-todo { border: 1px solid var(--status-todo); color: var(--status-todo); }
.status-inprogress { border: 1px solid var(--status-inprogress); color: var(--status-inprogress); }
.status-done { border: 1px solid var(--status-done); color: var(--status-done); }

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.task-title {
  font-size: 1.25rem;
  color: #fff;
  margin: 0;
  padding-right: 8px;
}

.copy-id-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.copy-id-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.task-desc {
  color: var(--text-muted);
  font-size: 0.95rem;
  flex-grow: 1;
  margin-bottom: 24px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255,255,255,0.05);
  padding-top: 16px;
  margin-top: auto;
}

.date-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.btn-icon {
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 240, 255, 0.1);
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: var(--accent-primary);
  color: #000;
}

.owner-badge {
  position: absolute;
  top: -10px;
  right: 15px;
  background: var(--bg-darker);
  padding: 2px 10px;
  border-radius: 10px;
  border: var(--glass-border);
  color: var(--text-muted);
}
</style>
