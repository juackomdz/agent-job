<script setup lang="ts">
defineProps<{
  total: number;
  avgMatch: number;
  topMatch: number;
}>();
</script>

<template>
  <div class="stats w-full border border-base-200 bg-base-100 text-center">
    <div class="stat place-items-center">
      <div class="stat-title">Ofertas</div>
      <div class="stat-value" data-testid="stat-total">{{ total }}</div>
    </div>
    <div class="stat place-items-center">
      <div class="stat-title">Match promedio</div>
      <div class="stat-value" data-testid="stat-avg">{{ avgMatch }}%</div>
    </div>
    <div class="stat place-items-center">
      <div class="stat-title">Mejor match</div>
      <div class="stat-value" data-testid="stat-top">{{ topMatch }}%</div>
    </div>
  </div>
</template>
