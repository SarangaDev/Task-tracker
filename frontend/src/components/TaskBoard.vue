<script setup lang="ts">
import { ref, watch } from 'vue';
import TaskCard from './TaskCard.vue';
import { useTaskStore } from '../stores/task.store';
import draggable from 'vuedraggable';
import type { Task } from '../types';

const props = defineProps<{
  tasks: Task[]
}>();

const taskStore = useTaskStore();

const columns = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'DONE', title: 'Done' }
];

const columnsData = ref({
  TODO: [] as Task[],
  IN_PROGRESS: [] as Task[],
  DONE: [] as Task[]
});

const isDragging = ref(false);

// Watch tasks from store and sync local draggable lists
watch(() => props.tasks, (newTasks) => {
  columnsData.value.TODO = newTasks.filter(t => t.status === 'TODO');
  columnsData.value.IN_PROGRESS = newTasks.filter(t => t.status === 'IN_PROGRESS');
  columnsData.value.DONE = newTasks.filter(t => t.status === 'DONE');
}, { immediate: true, deep: true });

const onChange = async (event: { added?: { element: Task } }, status: string) => {
  if (event.added) {
    const task = event.added.element;
    if (task.status !== status) {
      // Optimistically update the UI status before the socket event
      task.status = status;
      try {
        await taskStore.updateTask(task.id, { status });
      } catch (err) {
        console.error('Failed to update task status via drag and drop', err);
        // Revert on failure
        taskStore.fetchTasks();
      }
    }
  }
};
</script>

<template>
  <div class="task-board-container">
    <div 
      v-for="col in columns" 
      :key="col.id" 
      class="board-column glass-panel"
    >
      <div class="column-header">
        <h3 class="column-title">{{ col.title }}</h3>
        <span class="task-count">{{ columnsData[col.id as keyof typeof columnsData].length }}</span>
      </div>
      
      <div class="column-body">
        <draggable 
          v-model="columnsData[col.id as keyof typeof columnsData]" 
          group="tasks" 
          item-key="id"
          class="draggable-list"
          ghost-class="ghost-card"
          animation="200"
          @change="(e: { added?: { element: Task } }) => onChange(e, col.id)"
          @start="isDragging = true"
          @end="isDragging = false"
        >
          <template #item="{ element }">
            <TaskCard 
              :task="element" 
              class="board-card"
            />
          </template>
        </draggable>
        
        <div v-if="columnsData[col.id as keyof typeof columnsData].length === 0 && !isDragging" class="empty-dropzone">
          Drop tasks here
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-board-container {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  padding-bottom: 24px;
  min-height: 500px;
}

.board-column {
  flex: 1;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.column-title {
  margin: 0;
  font-size: 1.1rem;
  color: #fff;
}

.task-count {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 700;
}

.column-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.draggable-list {
  flex: 1;
  min-height: 150px;
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.draggable-list :deep(.task-card) {
  height: auto;
}

.ghost-card {
  opacity: 0.5;
  background: rgba(0, 240, 255, 0.1);
  border: 2px dashed var(--accent-primary);
  border-radius: 12px;
  height: auto !important;
  min-height: 100px;
}

.empty-dropzone {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 0.9rem;
  pointer-events: none;
}
</style>
