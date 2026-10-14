<script setup lang="ts">
import { computed, h } from 'vue';
import {
  useTable,
  tableFeatures,
  FlexRender,
  type ColumnDef,
  columnSizingFeature,
} from '@tanstack/vue-table';
import type { Offer } from '#shared/types';

const props = defineProps<{
  offers: Offer[];
  loading?: boolean;
}>();

const sorted = computed(() =>
  [...props.offers].sort((a, b) => (b.match ?? 0) - (a.match ?? 0)).slice(0, 8),
);

const features = tableFeatures({ columnSizingFeature });

const columns: Array<ColumnDef<typeof features, Offer>> = [
  {
    accessorKey: 'title',
    header: 'Oferta',
    cell: (info) => info.getValue(),
    size: 400,
  },
  {
    accessorKey: 'company',
    header: 'Empresa',
    cell: (info) => info.getValue(),
    size: 180,
  },
  {
    accessorKey: 'url',
    header: 'Link',
    cell: (info) =>
      h(
        'a',
        {
          href: info.getValue<string>(),
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'link link-primary',
        },
        'Abrir',
      ),
    size: 140,
  },
  {
    accessorKey: 'match',
    header: 'Match',
    cell: (info) => `${info.getValue()}%`,
    size: 90,
  },
];

const table = useTable({
  key: 'offers_table',
  features,
  columns,
  data: sorted,
});
</script>

<template>
  <section class="w-full text-center">
    <h2 class="mb-2 text-sm font-bold">Mejores ofertas</h2>

    <div v-if="loading" class="mx-auto flex w-full flex-col items-center gap-2">
      <div v-for="i in 4" :key="i" class="skeleton h-12 w-full" />
    </div>

    <p v-else-if="!sorted.length" class="mx-auto max-w-md text-sm text-base-content/60">
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
