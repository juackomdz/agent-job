<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { PROVIDER_LABELS } from '#shared/models';

const props = defineProps<{
  disabled?: boolean;
  label?: string;
}>();

const { models, groups, selected, pending } = useModelSelection();

const root = ref<HTMLElement | null>(null);
const listId = useId();
const open = ref(false);
const query = ref('');
const activeIndex = ref(0);

const current = computed(() => models.value.find((model) => model.id === selected.value) ?? null);

const filtered = computed(() => {
  const term = query.value.trim().toLowerCase();
  if (!term) return groups.value;

  return groups.value
    .map((group) => ({
      ...group,
      options: group.options.filter(
        (option) =>
          option.model.toLowerCase().includes(term) || group.label.toLowerCase().includes(term),
      ),
    }))
    .filter((group) => group.options.length > 0);
});

const flat = computed(() => filtered.value.flatMap((group) => group.options));

const displayValue = computed(() => {
  if (open.value) return query.value;
  return current.value ? `${PROVIDER_LABELS[current.value.provider]} · ${current.value.model}` : '';
});

function scrollActiveIntoView() {
  root.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
}

function openList() {
  if (props.disabled || !models.value.length || open.value) return;

  open.value = true;
  query.value = '';
  activeIndex.value = Math.max(
    0,
    flat.value.findIndex((option) => option.id === selected.value),
  );
  nextTick(scrollActiveIntoView);
}

function closeList() {
  open.value = false;
  query.value = '';
}

function choose(option: { id: string }) {
  selected.value = option.id;
  closeList();
}

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value;
  activeIndex.value = 0;
  open.value = true;
}

function move(delta: number) {
  if (!open.value) openList();

  const total = flat.value.length;
  if (!total) return;

  activeIndex.value = Math.min(Math.max(activeIndex.value + delta, 0), total - 1);
  nextTick(scrollActiveIntoView);
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      move(1);
      return;
    case 'ArrowUp':
      event.preventDefault();
      move(-1);
      return;
    case 'Enter': {
      event.preventDefault();
      if (!open.value) return;

      const option = flat.value[activeIndex.value];
      if (option) choose(option);
      return;
    }
    case 'Escape':
      if (!open.value) return;

      event.preventDefault();
      closeList();
      return;
    case 'Tab':
      closeList();
  }
}

function onPointerDown(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) closeList();
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeList();
  },
);

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('pointerdown', onPointerDown);
  else document.removeEventListener('pointerdown', onPointerDown);
});

onMounted(() => {
  if (open.value) document.addEventListener('pointerdown', onPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown);
});
</script>

<template>
  <div v-if="models.length" ref="root" class="relative flex min-w-0 items-center gap-2">
    <span class="text-xs whitespace-nowrap text-base-content/60">{{ label ?? 'Modelo' }}</span>

    <div class="relative min-w-0">
      <input
        :value="displayValue"
        class="input input-sm w-52 max-w-full sm:w-64"
        :placeholder="open ? 'Buscar modelo…' : 'Modelo'"
        aria-label="Modelo"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open"
        :aria-controls="listId"
        :disabled="disabled"
        @focus="openList"
        @click="openList"
        @input="onInput"
        @keydown="onKeydown"
      />

      <ul
        v-if="open"
        :id="listId"
        role="listbox"
        class="absolute z-30 mt-1 max-h-72 w-72 max-w-[80vw] overflow-y-auto rounded-box border border-base-300 bg-base-100 py-1 shadow-lg"
      >
        <template v-for="group in filtered" :key="group.provider">
          <li
            class="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-base-content/50 uppercase"
          >
            {{ group.label }}
          </li>
          <li
            v-for="option in group.options"
            :key="option.id"
            role="option"
            :aria-selected="option.id === selected"
            :data-active="option.id === flat[activeIndex]?.id"
            class="flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-base-200"
            :class="{ 'bg-base-200': option.id === flat[activeIndex]?.id }"
            @mousedown.prevent="choose(option)"
            @click="choose(option)"
          >
            <span class="min-w-0 truncate">{{ option.model }}</span>
            <span v-if="option.id === selected" class="shrink-0 text-xs text-primary">✓</span>
          </li>
        </template>

        <li v-if="!filtered.length" class="px-3 py-2 text-sm text-base-content/60">
          Sin resultados
        </li>
      </ul>
    </div>
  </div>

  <p v-else-if="!pending" class="max-w-md text-xs text-warning">
    No hay modelos disponibles: configura NUXT_OPENAI_API_KEY, NUXT_ANTHROPIC_API_KEY o
    NUXT_BASE_URL + NUXT_MODEL_API_KEY.
  </p>
</template>
