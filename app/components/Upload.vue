<script setup lang="ts">
import { ref, computed } from 'vue';
import { useChat, fetchServerSentEvents } from '@tanstack/ai-vue';

const {
  messages,
  isLoading,
  sendMessage,
  error: chatError,
} = useChat({
  connection: fetchServerSentEvents('/api/chat'),
});

const fileInputRef = ref<HTMLInputElement | null>(null);
const fileName = ref('');
const fileSize = ref(0);
const fileType = ref('');
const cvText = ref('');
const fileError = ref('');
const isDragOver = ref(false);
const localParsed = ref<Record<string, unknown> | null>(null);
const showRawPreview = ref(true);

const ACCEPTED_TYPES = ['.pdf', '.txt', '.md', '.docx', '.doc'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const charCount = computed(() => cvText.value.length);
const canSend = computed(() => cvText.value.trim().length > 10 && !isLoading.value);
const hasFile = computed(() => fileName.value !== '');

function reset() {
  fileName.value = '';
  fileSize.value = 0;
  fileType.value = '';
  cvText.value = '';
  fileError.value = '';
  localParsed.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateFile(file: File): string | null {
  const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
  if (!ACCEPTED_TYPES.includes(ext) && file.type !== 'text/plain') {
    // permitimos txt/md/pdf/docx aunque mime varie
    if (!['.txt', '.md', '.pdf', '.docx', '.doc'].includes(ext)) {
      return `Tipo no soportado (${ext}). Usa: ${ACCEPTED_TYPES.join(', ')}`;
    }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `Archivo muy grande (${formatSize(file.size)}). Máx ${MAX_SIZE_MB} MB.`;
  }
  if (file.size === 0) return 'Archivo vacío.';
  return null;
}

async function readFileAsText(file: File) {
  fileError.value = '';

  // PDF: intentamos leer como texto, si falla avisamos
  if (file.name.toLowerCase().endsWith('.pdf')) {
    try {
      const text = await file.text();
      // PDFs binarios contienen muchos caracteres no legibles; heurística simple
      const readableRatio =
        (text.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9@. ]/g)?.length ?? 0) / Math.max(text.length, 1);
      if (readableRatio < 0.4 || text.length < 50) {
        fileError.value =
          'PDF detectado: el texto no se pudo extraer como texto plano. Para probar la utilidad pega el contenido en el área de texto o usa un .txt/.md exportado del CV.';
        cvText.value = text.slice(0, 8000);
        return;
      }
      cvText.value = text.slice(0, 15000);
    } catch {
      fileError.value =
        'No se pudo leer el PDF. Exporta el CV a .txt y súbelo de nuevo, o pega el texto manualmente.';
    }
    return;
  }

  // docx/doc: no parseamos binario, pedimos texto plano
  if (file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
    fileError.value =
      'DOCX/DOC es binario: por ahora exporta a .txt/.md o copia/pega el texto abajo para probar la utilidad.';
    // igual intentamos leer por si es texto
    try {
      const t = await file.text();
      if (t.trim().length > 20) cvText.value = t.slice(0, 15000);
    } catch {}
    return;
  }

  try {
    const text = await file.text();
    if (!text.trim()) {
      fileError.value = 'El archivo está vacío o no contiene texto legible.';
      return;
    }
    cvText.value = text.slice(0, 15000);
  } catch {
    fileError.value = 'Error leyendo el archivo.';
  }
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const err = validateFile(file);
  if (err) {
    fileError.value = err;
    return;
  }
  fileName.value = file.name;
  fileSize.value = file.size;
  fileType.value = file.type || file.name.split('.').pop() || '';
  await readFileAsText(file);
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = true;
}

function onDragLeave() {
  isDragOver.value = false;
}

async function onDrop(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  const err = validateFile(file);
  if (err) {
    fileError.value = err;
    return;
  }
  fileName.value = file.name;
  fileSize.value = file.size;
  fileType.value = file.type || file.name.split('.').pop() || '';
  await readFileAsText(file);
}

function openPicker() {
  fileInputRef.value?.click();
}

// Utilidad local: simula get_cv sin llamar al LLM
function testLocalParser() {
  const text = cvText.value.trim();
  if (!text) {
    fileError.value = 'No hay texto para parsear. Sube un archivo o pega tu CV.';
    return;
  }
  fileError.value = '';
  const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] ?? '';
  const phone =
    text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/)?.[0] ?? '';
  const name =
    text
      .split('\n')
      .find((l) => l.trim().length > 3 && l.trim().length < 60)
      ?.trim() ?? '';
  // heurística simple para skills
  const skillKeywords = [
    'javascript',
    'typescript',
    'vue',
    'react',
    'node',
    'python',
    'java',
    'sql',
    'aws',
    'docker',
    'kubernetes',
    'nuxt',
    'next',
    'git',
    'agile',
    'scrum',
  ];
  const lower = text.toLowerCase();
  const skills = skillKeywords.filter((k) => lower.includes(k));
  // educación
  const education =
    text.match(
      /(universidad|grado|licenciatura|ingeniería|master|máster|bootcamp|certificación)[^\n]{0,80}/i,
    )?.[0] ?? '';
  // experiencia: buscar líneas con año o empresa
  const expLines = text
    .split('\n')
    .filter((l) => /(20\d{2}|empresa|experience|experiencia)/i.test(l))
    .slice(0, 5);
  const experience = expLines.map((line) => ({
    job: line.slice(0, 80).trim(),
    years: Number(line.match(/(\d+)\s*(años|years|año)/i)?.[1] ?? 1),
    company: line.match(/(?:en|at|@)\s+([A-Za-z0-9 .]+)/)?.[1]?.trim() ?? 'N/D',
  }));

  localParsed.value = {
    name: name.slice(0, 100),
    email,
    phone: phone.trim(),
    education: education.trim() || 'No detectada',
    skills,
    experience: experience.length
      ? experience
      : [{ job: 'No detectado', years: 0, company: 'N/D' }],
    _rawChars: text.length,
    _note: 'Parser local heurístico — la herramienta real get_cv lo hace el LLM en /api/chat',
  };
}

async function handle() {
  if (!cvText.value.trim()) {
    fileError.value = 'Sube un CV o pega texto antes de enviar.';
    return;
  }
  if (cvText.value.trim().length < 10) {
    fileError.value = 'El CV es muy corto para analizar.';
    return;
  }
  fileError.value = '';
  localParsed.value = null;
  const prompt = `Analiza este CV y extrae datos con la herramienta get_cv. Luego busca ofertas relevantes.\n\n--- CV ---\n${cvText.value.slice(0, 12000)}`;
  await sendMessage(prompt);
}

function loadExample() {
  fileName.value = 'ejemplo.txt';
  fileSize.value = 0;
  fileType.value = 'text/plain';
  fileError.value = '';
  cvText.value = `María González\nmaria.gonzalez@email.com | +54 11 5555-1234 | linkedin.com/in/mariagonzalez\n\nPerfil: Desarrolladora Full Stack con 4 años de experiencia en Vue, Nuxt, Node y TypeScript. Busco roles LatAm remoto.\n\nExperiencia:\n- Frontend Developer en Globant — 2 años — Vue 3, Nuxt 4, TypeScript, TanStack Query\n- Full Stack Developer en Mercado Libre — 2 años — Node.js, PostgreSQL, AWS\n\nEducación: Ingeniería en Sistemas, UTN (2018-2023). Certificación AWS Cloud Practitioner.\n\nSkills: JavaScript, TypeScript, Vue, Nuxt, React, Node.js, SQL, AWS, Docker, Git, Scrum\n\nIdiomas: Español nativo, Inglés B2`;
}
</script>

<template>
  <div class="upload-wrap">
    <h2>Suba un archivo — Probar CV</h2>
    <p class="hint">
      Sube tu CV en <code>.txt</code> / <code>.md</code> (recomendado) o <code>.pdf</code>. Podrás
      previsualizar el texto, probar el parser local (<code>get_cv</code>) y enviarlo al chat IA
      (<code>/api/chat</code>).
    </p>

    <!-- Dropzone -->
    <div
      class="dropzone"
      :class="{ dragover: isDragOver, hasfile: hasFile }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="openPicker"
    >
      <div class="dz-icon">📄</div>
      <div class="dz-text">
        <strong>Arrastra tu CV aquí</strong> o haz clic para seleccionar
        <br />
        <span class="dz-sub">{{ ACCEPTED_TYPES.join(' · ') }} · máx {{ MAX_SIZE_MB }} MB</span>
      </div>
      <div v-if="hasFile" class="file-badge">
        <span class="fname">{{ fileName }}</span>
        <span v-if="fileSize" class="fsize">{{ formatSize(fileSize) }}</span>
        <span class="ftype">{{ fileType }}</span>
      </div>
    </div>

    <form @submit.prevent="handle">
      <input
        ref="fileInputRef"
        type="file"
        :accept="ACCEPTED_TYPES.join(',')"
        style="display: none"
        @change="onFileChange"
      />

      <div class="actions">
        <button type="button" class="btn secondary" @click="openPicker">Elegir archivo</button>
        <button type="button" class="btn ghost" @click="loadExample">Cargar ejemplo</button>
        <button type="button" class="btn ghost" :disabled="!hasFile && !cvText" @click="reset">
          Limpiar
        </button>
      </div>

      <div v-if="fileError" class="alert error">{{ fileError }}</div>
      <div v-if="chatError" class="alert error">Error chat: {{ String(chatError) }}</div>

      <!-- Editor / preview -->
      <label class="label" for="cv-text"
        >Contenido del CV (editable — {{ charCount }} caracteres)</label
      >
      <textarea
        id="cv-text"
        v-model="cvText"
        placeholder="Pega aquí el texto de tu CV si el PDF no se extrae bien..."
        rows="12"
        class="cv-textarea"
      />

      <div class="row">
        <label class="check">
          <input type="checkbox" v-model="showRawPreview" />
          Mostrar preview recortado (800 chars)
        </label>
        <span class="counter" :class="{ warn: charCount > 12000 }">{{ charCount }} / 15000</span>
      </div>

      <div v-if="showRawPreview && cvText" class="preview">
        <pre>{{ cvText.slice(0, 800) }}{{ cvText.length > 800 ? '\n... (recortado)' : '' }}</pre>
      </div>

      <!-- Botones utilidad -->
      <div class="actions main">
        <button
          type="button"
          class="btn secondary"
          :disabled="!cvText.trim()"
          @click="testLocalParser"
        >
          🧪 Probar utilidad local (parser heurístico)
        </button>
        <button type="submit" class="btn primary" :disabled="!canSend">
          <span v-if="isLoading">Enviando…</span>
          <span v-else>🚀 Enviar a IA (get_cv)</span>
        </button>
      </div>
      <p class="hint small">
        <em>Probar utilidad local</em> no llama al LLM — te muestra qué extraería
        <code>get_cv</code> con regex. <em>Enviar a IA</em> hace <code>sendMessage()</code> y el
        modelo invocará la tool <code>get_cv</code> vía SSE.
      </p>
    </form>

    <!-- Resultado parser local -->
    <div v-if="localParsed" class="card">
      <h3>Resultado parser local</h3>
      <pre class="json">{{ JSON.stringify(localParsed, null, 2) }}</pre>
    </div>

    <!-- Chat / mensajes SSE -->
    <div class="chat-section">
      <h3>Conversación ({{ messages.length }} mensajes)</h3>
      <div v-if="messages.length === 0" class="empty">
        Aún no hay mensajes. Envía tu CV para ver la respuesta y la invocación de
        <code>get_cv</code>.
      </div>
      <div v-else class="messages">
        <div v-for="message in messages" :key="message.id" class="msg" :class="message.role">
          <div class="msg-head">
            <strong>{{
              message.role === 'assistant'
                ? '🤖 Assistant'
                : message.role === 'user'
                  ? '🧑 Tú'
                  : message.role
            }}</strong>
            <span class="msg-id">#{{ String(message.id).slice(0, 8) }}</span>
          </div>
          <div v-for="(part, idx) in message.parts" :key="idx" class="part">
            <p v-if="part.type === 'text'" class="part-text">
              {{ (part as any).content ?? (part as any).text }}
            </p>
            <details v-else class="part-tool">
              <summary>{{ part.type }} — ver detalle</summary>
              <pre>{{ JSON.stringify(part, null, 2) }}</pre>
            </details>
          </div>
        </div>
      </div>
      <div v-if="isLoading" class="loading">⏳ Generando respuesta… (stream SSE)</div>
    </div>
  </div>
</template>

<style scoped>
.upload-wrap {
  max-width: 760px;
  margin: 2rem auto;
  padding: 1.5rem;
  font-family: ui-sans-serif, system-ui, sans-serif;
  color: #1a1a1a;
}
h2 {
  margin: 0 0 0.5rem;
  font-size: 1.35rem;
}
h3 {
  margin: 1.25rem 0 0.5rem;
  font-size: 1.05rem;
}
.hint {
  color: #555;
  font-size: 0.9rem;
  line-height: 1.4;
}
.hint.small {
  font-size: 0.8rem;
}
.hint code {
  background: #f3f3f3;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.85em;
}
.dropzone {
  border: 2px dashed #bbb;
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  cursor: pointer;
  background: #fafafa;
  transition: all 0.15s;
  margin: 1rem 0;
}
.dropzone:hover,
.dropzone.dragover {
  border-color: #3b82f6;
  background: #eff6ff;
}
.dropzone.hasfile {
  border-style: solid;
  border-color: #22c55e;
  background: #f0fdf4;
}
.dz-icon {
  font-size: 1.6rem;
}
.dz-sub {
  font-size: 0.8rem;
  color: #777;
}
.file-badge {
  margin-top: 0.75rem;
  display: inline-flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 0.85rem;
}
.fname {
  font-weight: 600;
  background: #fff;
  border: 1px solid #ddd;
  padding: 2px 8px;
  border-radius: 999px;
}
.fsize,
.ftype {
  background: #fff;
  border: 1px solid #eee;
  padding: 2px 8px;
  border-radius: 999px;
  color: #555;
}
.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.75rem 0;
}
.actions.main {
  margin-top: 1rem;
}
.btn {
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  border: 1px solid #ddd;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.primary {
  background: #111827;
  color: #fff;
  border-color: #111827;
}
.btn.secondary {
  background: #fff;
}
.btn.ghost {
  background: transparent;
}
.label {
  display: block;
  margin-top: 1rem;
  font-weight: 600;
  font-size: 0.9rem;
}
.cv-textarea {
  width: 100%;
  margin-top: 0.35rem;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  line-height: 1.45;
  resize: vertical;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.4rem 0;
  font-size: 0.85rem;
}
.check {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}
.counter {
  color: #666;
}
.counter.warn {
  color: #d97706;
  font-weight: 700;
}
.preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  max-height: 260px;
  overflow: auto;
}
.preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.82rem;
}
.alert {
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  font-size: 0.88rem;
  margin: 0.5rem 0;
}
.alert.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}
.card {
  margin-top: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1rem;
}
.json {
  margin: 0;
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.85rem;
  border-radius: 8px;
  overflow: auto;
  font-size: 0.82rem;
}
.chat-section {
  margin-top: 1.5rem;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}
.empty {
  color: #777;
  font-size: 0.9rem;
  background: #fafafa;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px dashed #ddd;
}
.messages {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.msg {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.75rem;
}
.msg.user {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.msg.assistant {
  background: #f0fdf4;
  border-color: #bbf7d0;
}
.msg-head {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 0.35rem;
}
.msg-id {
  color: #999;
  font-family: monospace;
}
.part-text {
  white-space: pre-wrap;
  margin: 0.35rem 0;
  line-height: 1.5;
  font-size: 0.92rem;
}
.part-tool {
  font-size: 0.82rem;
}
.part-tool pre {
  background: #111827;
  color: #e5e7eb;
  padding: 0.6rem;
  border-radius: 6px;
  overflow: auto;
}
.loading {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: #2563eb;
}
</style>
