import { computed, h } from 'vue';
import {
  useTable,
  tableFeatures,
  type ColumnDef,
  columnSizingFeature,
  rowPaginationFeature,
  createPaginatedRowModel,
} from '@tanstack/vue-table';
import type { Offer } from '#shared/types';

export type OffersTableInstance = ReturnType<typeof useOffersTable>;

export function useOffersTable(offers: { value: Offer[] }, items: number = 10) {
  const sorted = computed(() =>
    [...offers.value].sort((a, b) => (b.match! - a.match!)),
  );

  const features = tableFeatures({
    columnSizingFeature,
    rowPaginationFeature,
    paginatedRowModel: createPaginatedRowModel(),
  });

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
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: items,
      },
    },
  });

  return table;
}
