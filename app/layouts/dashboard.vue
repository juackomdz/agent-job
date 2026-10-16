<script setup lang="ts">
import { House, MessagesCircle, FileUser, List } from '@lucide/vue';

const route = useRoute();

const links = [
  { to: '/', label: 'Panel', icon: House },
  { to: '/chat', label: 'Chat', icon: MessagesCircle },
  { to: '/subir-cv', label: 'Subir CV', icon: FileUser },
  { to: '/ofertas', label: 'Todas tus ofertas', icon: List },
];

function isActive(to: string) {
  return route.path === to;
}
</script>

<template>
  <div data-theme="garden" class="min-h-screen bg-base-100 text-base-content">
    <div class="drawer lg:drawer-open">
      <input id="sidebar-drawer" type="checkbox" class="drawer-toggle" />

      <div class="drawer-content flex min-h-screen flex-col">
        <header class="navbar border-b border-base-200 px-4 lg:hidden">
          <div class="navbar-start">
            <label for="sidebar-drawer" class="btn btn-ghost btn-sm" aria-label="Abrir menú">
              Menú
            </label>
          </div>
          <div class="navbar-end">
            <NuxtLink to="/" class="text-sm font-bold tracking-tight">Job Agent</NuxtLink>
          </div>
        </header>

        <main class="mx-auto flex w-full max-w-5xl flex-1 justify-center px-4 py-6 lg:px-8">
          <div class="w-full max-w-5xl">
            <slot />
          </div>
        </main>
      </div>

      <div class="drawer-side">
        <label for="sidebar-drawer" aria-label="Cerrar menú" class="drawer-overlay" />
        <aside class="flex min-h-full w-60 flex-col border-r border-base-200 bg-base-100 px-3 py-5">
          <NuxtLink to="/" class="px-2 text-sm font-bold tracking-tight">Job Agent</NuxtLink>

          <nav class="mt-6">
            <ul class="menu w-full gap-1 p-0">
              <li v-for="l in links" :key="l.to">
                <NuxtLink :to="l.to" :class="{ active: isActive(l.to) }">
                  <component :is="l.icon" class="size-5" />
                  {{ l.label }}
                </NuxtLink>
              </li>
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  </div>
</template>
