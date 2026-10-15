<script setup lang="ts">
import { computed } from 'vue';

interface Offer {
  id: number;
  title: string;
  company: string;
  match: number | null;
  url: string;
  description: string;
}

const { data: offersData, pending: offersPending } = await useFetch<{ offers: Offer[] }>(
  '/api/offers');

const offers = computed(() => offersData.value?.offers ?? []);
const table = useOffersTable(offers, 8);
const total = computed(() => offers.value.length);
const avgMatch = computed(() => {
  const ms = offers.value.map((o) => o.match ?? 0).filter((v) => v > 0);
  return ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0;
});
const topMatch = computed(() => Math.max(0, ...offers.value.map((o) => o.match ?? 0)));

console.log(offers.value.length)
</script>

<template>
  <div class="flex w-full flex-col items-center gap-6 text-center">
    <div>
      <h1 class="text-xl font-bold tracking-tight">Panel</h1>
      <p class="mt-1 text-sm text-base-content/60">Ofertas guardadas por el agente y chat.</p>
    </div>

    <DashboardStats :total="total" :avg-match="avgMatch" :top-match="topMatch" />

    <h2 class="mb-2 text-sm font-bold">Mejores ofertas</h2>
    <OffersTable :offers="offers" :loading="offersPending" :table="table" />
  </div>
</template>
