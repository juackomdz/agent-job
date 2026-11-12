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
  connection: fetchServerSentEvents('/api/chat'),
  threadId: 'chat-id',
  persistence: true
});

const { selected } = useModelSelection();

const canSend = computed(() => input.value.trim().length > 0 && !isLoading.value);

async function handleSubmit() {
  if (!canSend.value) return;
  const content = input.value.trim();
  const model = selected.value;
  input.value = '';
  await sendMessage(content, model ? { body: { model } } : undefined);
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
      <div
        ref="scrollRef"
        role="log"
        aria-label="Mensajes del chat"
        class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
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
          :data-testid="m.role === 'user' ? 'msg-user' : 'msg-assistant'"
        >
          <div
            class="chat-bubble max-w-[85%] text-sm whitespace-pre-wrap"
            :class="m.role === 'user' ? 'chat-bubble-primary' : 'bg-base-200 text-base-content'"
          >
            {{ textOf(m) || '…' }}
          </div>
        </div>
      </div>

      <p v-if="error" role="alert" class="px-4 pt-2 text-center text-xs text-error">
        {{ error.message }}
      </p>
      <form class="flex flex-col gap-2 border-t border-base-200 p-3" @submit.prevent="handleSubmit">
        <ModelSelect :disabled="isLoading" />
        <div class="flex gap-2">
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
            <button type="button" class="btn btn-primary" aria-label="Detener" @click="stop()">
              <Square />
            </button>
          </div>
        </div>
      </form>
    </div>
  </section>
</template>
