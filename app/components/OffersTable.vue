<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table';
import type { Offer } from '#shared/types';
import type { OffersTableInstance } from '../composables/useOffersTable';

const props = defineProps<{
  offers: Offer[];
  loading?: boolean;
  table: OffersTableInstance;
}>();

const table = props.table;
</script>

<template>
  <section class="w-full text-center">
    <div v-if="loading" class="mx-auto flex w-full flex-col items-center gap-2">
      <div v-for="i in 4" :key="i" class="skeleton h-12 w-full" />
    </div>

    <p v-else-if="!props.offers.length" class="mx-auto max-w-md text-sm text-base-content/60">
      Sin ofertas. Pide en el chat que busque empleos.
    </p>

    <div v-else class="mx-auto w-full overflow-x-auto border border-base-200">
      <table class="table table-fixed text-center">
        <thead>
          <tr v-for="headers in table.getHeaderGroups()" :key="headers.id">
            <th
              v-for="header in headers.headers"
              :key="header.id"
              class="truncate"
              :style="{ width: `${header.getSize()}px` }"
            >
              <FlexRender :header="header"></FlexRender>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in table.getRowModel().rows" :key="row.id">
            <td
              v-for="cell in row.getAllCells()"
              :key="cell.id"
              class="truncate"
              :style="{ width: `${cell.column.getSize()}px` }"
            >
              <FlexRender :cell="cell"></FlexRender>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
