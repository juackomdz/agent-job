<script setup lang="ts">
import { computed, ref } from 'vue';

type Estado = 'idle' | 'enviando' | 'extrayendo' | 'guardando' | 'listo' | 'error';

const MENSAJES: Record<Estado, string> = {
  idle: '',
  enviando: 'Subiendo PDF…',
  extrayendo: 'Extrayendo los datos del CV, puede tardar unos segundos…',
  guardando: 'Guardando tu perfil…',
  listo: '¡Perfil guardado correctamente!',
  error: 'Hubo un error al procesar el CV',
};

const file = ref<File | null>(null);
const estado = ref<Estado>('idle');
const errorMensaje = ref('');
const resultado = ref<{ id: number; totalPages: number } | null>(null);

const isProcesando = computed(
  () => estado.value !== 'idle' && estado.value !== 'listo' && estado.value !== 'error',
);

const handleFile = (event: Event) => {
  const target = event.target as HTMLInputElement;

  if (!target.files || target.files.length === 0) {
    file.value = null;
    return;
  }
  file.value = target.files[0]!;

  estado.value = 'idle';
  errorMensaje.value = '';
  resultado.value = null;
};

const subir = async () => {
  if (!file.value) {
    estado.value = 'error';
    errorMensaje.value = 'Primero selecciona un archivo PDF';
    return;
  }

  estado.value = 'enviando';
  errorMensaje.value = '';
  resultado.value = null;

  const formData = new FormData();
  formData.append('file', file.value);

  try {
    estado.value = 'extrayendo';

    const response = await fetch('/api/cv', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.statusMessage ?? 'Error en la API');
    }

    estado.value = 'guardando';

    const data = await response.json();
    if (!data?.success) {
      throw new Error('El servidor no pudo guardar el perfil');
    }

    resultado.value = { id: data.id, totalPages: data.totalPages };
    estado.value = 'listo';
  } catch (error) {
    estado.value = 'error';
    errorMensaje.value = error instanceof Error ? error.message : 'Error al enviar el archivo';
  }
};
</script>

<template>
  <div class="mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center">
    <h1 class="text-xl font-bold tracking-tight">Subir Curriculum</h1>

    <form class="flex w-full flex-col items-center gap-3" @submit.prevent="subir">
      <input
        type="file"
        class="file-input file-input-bordered w-full"
        :disabled="isProcesando"
        @change="handleFile"
      />
      <p>Solo archivos .pdf - Max. 5 mb</p>
      <button class="btn btn-primary btn-sm" :disabled="isProcesando || !file">
        <span v-if="isProcesando" class="loading loading-spinner loading-xs" />
        {{ isProcesando ? 'Procesando…' : 'Subir' }}
      </button>
    </form>

    <div v-if="isProcesando" class="w-full">
      <progress class="progress progress-primary w-full" />
      <p class="mt-2 text-sm text-base-content/70">{{ MENSAJES[estado] }}</p>
    </div>

    <div v-if="estado === 'listo' && resultado" role="alert" class="alert alert-success">
      <span class="text-sm">
        {{ MENSAJES.listo }}.
      </span>
    </div>

    <div v-if="estado === 'error'" role="alert" class="alert alert-error">
      <span class="text-sm">{{ errorMensaje || MENSAJES.error }}</span>
    </div>
  </div>
</template>
