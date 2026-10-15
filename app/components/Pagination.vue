<script setup lang="ts">
import type { OffersTableInstance } from '../composables/useOffersTable';

const props = defineProps<{
  table: OffersTableInstance;
}>();

const table = props.table;
</script>

<template>
  <div id="pagination" class="join">
    <button class="join-item btn" @click="table.firstPage()" :disabled="!table.getCanPreviousPage()"><<</button>
    <button class="join-item btn" @click="table.previousPage()" :disabled="!table.getCanPreviousPage()"><</button>
    <button class="join-item btn" @click="table.nextPage()" :disabled="!table.getCanNextPage()">></button>
    <button class="join-item btn" @click="table.lastPage()" :disabled="!table.getCanLastPage()">>></button>
  </div>
</template>
