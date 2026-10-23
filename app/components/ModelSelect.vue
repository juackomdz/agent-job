<script setup lang="ts">
defineProps<{
  disabled?: boolean;
  label?: string;
}>();

const { models, groups, selected } = useModelSelection();
</script>

<template>
  <label v-if="models.length" class="flex min-w-0 items-center gap-2">
    <span class="text-xs whitespace-nowrap text-base-content/60">{{ label ?? 'Modelo' }}</span>
    <select v-model="selected" class="select select-sm max-w-52" :disabled="disabled">
      <optgroup v-for="group in groups" :key="group.provider" :label="group.label">
        <option v-for="option in group.options" :key="option.id" :value="option.id">
          {{ option.model }}
        </option>
      </optgroup>
    </select>
  </label>
</template>
