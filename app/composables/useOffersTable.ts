import { computed, h } from 'vue';
import {
  useTable,
  tableFeatures,
  type ColumnDef,
  columnSizingFeature,
  rowPaginationFeature,
  rowSortingFeature,
  createPaginatedRowModel,
  createSortedRowModel,
} from '@tanstack/vue-table';
import type { Offer } from '#shared/types';

export type OffersTableInstance = ReturnType<typeof useOffersTable>;

export function useOffersTable(offers: { value: Offer[] }, items: number = 10) {

  const features = tableFeatures({
    columnSizingFeature,
    rowPaginationFeature,
    rowSortingFeature,
    paginatedRowModel: createPaginatedRowModel(),
    sortedRowModel: createSortedRowModel(),
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
      enableSorting: false
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
    data: offers.value,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: items,
      },
    },
  });

  return table;
}
