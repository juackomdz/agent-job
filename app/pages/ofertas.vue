<script setup lang="ts">
import type { Offer } from '#shared/types'

const { data, pending } = useFetch<{ offers: Offer[]}>('/api/offers')

const offers = computed(() => data.value?.offers ?? []);
const table = useOffersTable(offers);
</script>

<template>
    <div class="flex w-full flex-col items-center gap-6 text-center">
        <h2 class="mb-2 text-sm font-bold">Todas las ofertas</h2>
        <OffersTable :offers="offers" :loading="pending" :table="table"/>
        <Pagination :table="table"/>
    </div>
</template>
