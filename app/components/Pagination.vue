<script setup lang="ts">
import type { OffersTableInstance } from '../composables/useOffersTable';

const props = defineProps<{
  table: OffersTableInstance;
}>();

const table = props.table;
</script>

<template>
  <div id="pagination" class="join">
    <button
      type="button"
      class="join-item btn"
      aria-label="Primera página"
      @click="table.firstPage()"
      :disabled="!table.getCanPreviousPage()"
    >
      <<
    </button>
    <button
      type="button"
      class="join-item btn"
      aria-label="Página anterior"
      @click="table.previousPage()"
      :disabled="!table.getCanPreviousPage()"
    >
      <
    </button>
    <button
      type="button"
      class="join-item btn"
      aria-label="Página siguiente"
      @click="table.nextPage()"
      :disabled="!table.getCanNextPage()"
    >
      >
    </button>
    <button
      type="button"
      class="join-item btn"
      aria-label="Última página"
      @click="table.lastPage()"
      :disabled="!table.getCanLastPage()"
    >
      >>
    </button>
  </div>
</template>
