<template>
  <span :class="['badge', statusClass]">
    <span class="status-dot"></span>
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TaskStatus } from '../stores/tasks'

const props = defineProps<{ status: TaskStatus }>()

const statusClass = computed(() => {
  const map: Record<TaskStatus, string> = {
    TODO: 'badge-todo',
    IN_PROGRESS: 'badge-in-progress',
    DONE: 'badge-done',
  }
  return map[props.status]
})

const label = computed(() => {
  const map: Record<TaskStatus, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done',
  }
  return map[props.status]
})
</script>

<style scoped>
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
</style>
