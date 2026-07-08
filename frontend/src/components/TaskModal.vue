<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTaskStore } from '../stores/task.store';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import type { Task } from '../types';

const props = defineProps<{
  task?: Task
}>();

const emit = defineEmits(['close']);
const taskStore = useTaskStore();

const title = ref('');
const description = ref('');
const status = ref('TODO');
const priority = ref('MEDIUM');
const dueDate = ref('');
const loading = ref(false);
const error = ref('');

onMounted(() => {
  if (props.task) {
    title.value = props.task.title;
    description.value = props.task.description || '';
    status.value = props.task.status;
    priority.value = props.task.priority;
    if (props.task.dueDate) {
      dueDate.value = new Date(props.task.dueDate).toISOString().split('T')[0];
    }
  }
});

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';
  try {
    const payload = {
      title: title.value,
      description: description.value,
      status: status.value,
      priority: priority.value,
      dueDate: dueDate.value ? new Date(dueDate.value).toISOString() : null,
    };

    if (props.task) {
      await taskStore.updateTask(props.task.id, payload);
    } else {
      await taskStore.createTask(payload);
    }
    emit('close');
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } };
    error.value = e.response?.data?.message || 'Operation failed';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <teleport to="body">
    <div class="modal-backdrop animate-fade-in" @click.self="emit('close')">
    <div class="modal-content glass-panel">
      <h2>{{ task ? 'Edit Task' : 'New Task' }}</h2>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Title</label>
          <input type="text" v-model="title" required placeholder="What needs to be done?" />
        </div>
        
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="description" rows="3" placeholder="Add some details..."></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Priority</label>
            <select v-model="priority">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Status</label>
            <select v-model="status">
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Due Date</label>
          <VueDatePicker v-model="dueDate" :enable-time-picker="false" dark auto-apply placeholder="Select due date" />
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Saving...' : 'Save Task' }}
          </button>
        </div>
      </form>
    </div>
  </div>
  </teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  padding: 30px;
  background: var(--bg-darker);
}

.modal-content h2 {
  margin-bottom: 24px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
}

.error-msg {
  color: var(--danger);
  font-size: 0.9rem;
  margin-top: 8px;
}
</style>
