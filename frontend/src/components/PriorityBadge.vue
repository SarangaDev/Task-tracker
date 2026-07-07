<template>
  <span :class="['badge', priorityClass]">
    <span class="priority-icon">{{ icon }}</span>
    {{ priority }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Priority } from '../stores/tasks'

const props = defineProps<{ priority: Priority }>()

const priorityClass = computed(() => {
  const map: Record<Priority, string> = {
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
  }
  return map[props.priority]
})

const icon = computed(() => {
  const map: Record<Priority, string> = {
    HIGH: '▲',
    MEDIUM: '●',
    LOW: '▼',
  }
  return map[props.priority]
})
</script>

<style scoped>
.priority-icon {
  font-size: 8px;
}
</style>
