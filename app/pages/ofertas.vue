<script setup lang="ts">

import type { Offer } from '#shared/types'

const { data, pending } = useFetch<{ offers: Offer[]}>('/api/offers',{
    query: {limit: 20},
    default: () => ({ offers: []})
})

const offers = computed(() => data.value?.offers ?? []);
</script>

<template>
    <div>
        <OffersTable :offers="offers" :loading="pending"/>
    </div>
</template>