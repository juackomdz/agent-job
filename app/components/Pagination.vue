<script setup lang="ts">
import type { OffersTableInstance } from '../composables/useOffersTable';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/vue'

const props = defineProps<{
  table: OffersTableInstance;
}>();

const table = props.table;
</script>

<template>
  <div id="pagination" class="join">
    <button
      class="join-item btn"
      @click="table.firstPage()"
      :disabled="!table.getCanPreviousPage()"
    >
      <ChevronsLeft :size="20" />
    </button>
    <button
      class="join-item btn"
      @click="table.previousPage()"
      :disabled="!table.getCanPreviousPage()"
    >
      <ChevronLeft :size="20"/>
    </button>
    <button class="join-item btn" @click="table.nextPage()" :disabled="!table.getCanNextPage()">
      <ChevronRight :size="20"/>
    </button>
    <button class="join-item btn" @click="table.lastPage()" :disabled="!table.getCanLastPage()">
      <ChevronsRight :size="20"/>
    </button>
  </div>
</template>
