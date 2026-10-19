<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { fetchServerSentEvents, useChat, type UIMessage } from '@tanstack/ai-vue';
import { Square } from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    placeholder?: string;
  }>(),
  { compact: false, placeholder: 'Escribe un mensaje…' },
);

const input = ref('');
const scrollRef = ref<HTMLElement | null>(null);

const { messages, sendMessage, isLoading, stop, error } = useChat({
  connection: fetchServerSentEvents('/api/chat')
});

const canSend = computed(() => input.value.trim().length > 0 && !isLoading.value);

async function handleSubmit() {
  if (!canSend.value) return;
  const content = input.value.trim();
  input.value = '';
  await sendMessage(content);
}

function textOf(message: UIMessage): string {
  let out = '';
  for (const part of message.parts) {
    if (part.type === 'text') out += part.content;
  }
  return out;
}

watch(messages, async () => {
  await nextTick();
  scrollRef.value?.scrollTo({ top: scrollRef.value.scrollHeight });
});
</script>

<template>
  <section
    class="mx-auto w-full border border-base-200 bg-base-100"
    :class="compact ? 'h-130' : 'h-150'"
  >
    <div class="flex h-full min-h-0 flex-col">
      <div ref="scrollRef" class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <p
          v-if="!messages.length"
          class="mx-auto max-w-md text-center text-sm text-base-content/60"
        >
          Pide ofertas o consulta tu CV guardado.
        </p>

        <div
          v-for="m in messages"
          :key="m.id"
          class="chat"
          :class="m.role === 'user' ? 'chat-end' : 'chat-start'"
        >
          <div
            class="chat-bubble max-w-[85%] text-sm whitespace-pre-wrap"
            :class="m.role === 'user' ? 'chat-bubble-primary' : 'bg-base-200 text-base-content'"
          >
            {{ textOf(m) || '…' }}
          </div>
        </div>
      </div>

      <p v-if="error" class="px-4 pt-2 text-center text-xs text-error">
        {{ error.message }}
      </p>
      <form class="flex gap-2 border-t border-base-200 p-3" @submit.prevent="handleSubmit">
        <input
          v-model="input"
          :placeholder="placeholder"
          class="input input-bordered w-full"
          :disabled="isLoading"
        />
        <div v-if="!isLoading">
          <button type="submit" class="btn btn-primary" :disabled="!canSend">Enviar</button>
        </div>
        <div v-else>
          <button class="btn btn-primary" @click="stop()">
            <Square />
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
