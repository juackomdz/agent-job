<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { fetchServerSentEvents, useChat, type UIMessage } from '@tanstack/ai-vue';
import { TextPart } from '@tanstack/ai-vue/ui';
import { Square } from '@lucide/vue';

withDefaults(
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
  persistence: true,
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

const visibleMessages = computed(() =>
  messages.value.filter(
    (m) => m.role === 'user' || (m.role === 'assistant' && textOf(m).trim().length > 0),
  ),
);

const showTyping = computed(() => {
  if (!isLoading.value) return false;
  const last = messages.value[messages.value.length - 1];
  return !last || last.role !== 'assistant' || textOf(last).trim().length === 0;
});

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
          v-if="!visibleMessages.length && !showTyping"
          class="mx-auto max-w-md text-center text-sm text-base-content/60"
        >
          Pide ofertas o consulta tu CV guardado.
        </p>

        <div
          v-for="m in visibleMessages"
          :key="m.id"
          class="chat"
          :class="m.role === 'user' ? 'chat-end' : 'chat-start'"
          :data-testid="m.role === 'user' ? 'msg-user' : 'msg-assistant'"
        >
          <div
            class="chat-bubble max-w-[85%] text-sm whitespace-pre-wrap"
            :class="m.role === 'user' ? 'chat-bubble' : 'bg-base-200 text-base-content'"
          >
            <TextPart :content="textOf(m)" :role="m.role === 'user' ? 'user' : 'assistant'" />
          </div>
        </div>

        <div v-if="showTyping" class="chat chat-start" data-testid="msg-typing">
          <div class="chat-bubble bg-base-200 text-base-content">
            <span
              class="loading loading-dots loading-sm"
              aria-label="El asistente está respondiendo"
            />
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
            <button type="submit" class="btn btn-secondary" :disabled="!canSend">Enviar</button>
          </div>
          <div v-else>
            <button type="button" class="btn btn-secondary" aria-label="Detener" @click="stop()">
              <Square />
            </button>
          </div>
        </div>
      </form>
    </div>
  </section>
</template>
