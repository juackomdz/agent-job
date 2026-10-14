<script setup lang="ts">
import { ref } from 'vue';

const file = ref<File | null>(null);

const handleFile = (event: Event) => {
  const target = event.target as HTMLInputElement;

  if (!target.files || target.files.length === 0) {
    file.value = null;
    return;
  }
  file.value = target.files[0]!;
};

const subir = async () => {
  if (!file.value) {
    console.log('No ha subido archivo');
    return;
  }
  const formData = new FormData();
  formData.append('file', file.value);

  try {
    const response = await fetch('/api/cv', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.log('error en api');
    }
  } catch (error) {
    console.log('Error al enviar');
  }
};
</script>

<template>
  <div class="mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center">
    <h1 class="text-xl font-bold tracking-tight">Probar PDF</h1>
    <form class="flex w-full flex-col items-center gap-3" @submit.prevent="subir">
      <input type="file" class="file-input file-input-bordered w-full" @change="handleFile" />
      <button class="btn btn-primary btn-sm">Subir</button>
    </form>
  </div>
</template>
