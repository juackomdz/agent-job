<script setup lang="ts">
import { ref } from 'vue';
import { useChat, fetchServerSentEvents } from '@tanstack/ai-vue';

const input = ref('');

const { messages, sendMessage, isLoading, stop } = useChat({
  connection: fetchServerSentEvents('/api/chat'),
});

function handleSubmit() {
  if (input.value.trim() && !isLoading.value) {
    sendMessage(input.value);
    input.value = '';
  }
}
</script>

<template>
  <div class="chat">
    <div class="messages">
      <div v-for="message in messages" :key="message.id" :class="message.role">
        <strong>{{ message.role === 'assistant' ? 'Assistant' : 'You' }}</strong>
        <div v-for="(part, idx) in message.parts" :key="idx">
          <p v-if="part.type === 'thinking'">THINK{{ part.content }}THINK</p>
          <p v-if="part.type === 'text'">{{ part.content }}</p>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit">
      <input v-model="input" placeholder="Type a message..." :disabled="isLoading" />
      <button type="submit" :disabled="!input.trim() || isLoading">Send</button> 
      <button type="button" :disabled="!isLoading" @click="stop()">Cancelar</button>
    </form>
    <div v-if="isLoading">
      <p>Pensando..</p>
    </div>
  </div>
</template>
