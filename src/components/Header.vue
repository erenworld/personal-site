<script lang="ts" setup>
import { ref, watchEffect } from 'vue'
import { onClickOutside, useWindowSize } from '@vueuse/core'
import siteConfig from '../site-config'

const navLinks = siteConfig.headerNavLinks || []

// Feather icons (MIT), https://feathericons.com
const icons: Record<string, string> = {
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
}

const menuRef = ref(null)

defineProps<{
  pathname: string
}>()

const menu = ref(false)

function toggleMenu() {
  menu.value = !menu.value
}

const { width } = useWindowSize()

onClickOutside(menuRef, () => {
  if (width.value < 640)
    menu.value = false
})

watchEffect(() => {
  if (width.value > 640)
    menu.value = true
  else
    menu.value = false
})
</script>

<template>
  <header max-w-3xl mx-auto h-18 px-6 flex justify-between items-center gap-2 whitespace-nowrap relative>
    <div>
      <a href="/" class="name" aria-label="Eren Türkoğlu" nav-link font-500 text-base sm:text-xl hover:text-gray-800>
        <span aria-hidden="true">Eren T<span class="swap"><span class="plain">u</span><span class="accent">ü</span></span>rko<span class="swap swap-late"><span class="plain">g</span><span class="accent">ğ</span></span>lu</span>
      </a>
    </div>
    <div flex items-center gap-4 sm:gap-6>
      <a v-for="link in navLinks" :key="link.text" nav-link
        :class="pathname.includes(link.href) ? 'text-sky-600' : 'opacity-60  hover:opacity-100'" :href="link.href">
        <span class="nav-item">
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" v-html="icons[link.icon]" />
          <span class="nav-label">{{ link.text }}</span>
        </span>
      </a>
      <a nav-link href="/rss.xml" title="RSS feed" aria-label="RSS feed" class="opacity-60 hover:opacity-100">
        <span class="nav-item">
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" v-html="icons.rss" />
        </span>
      </a>
    </div>
  </header>
</template>

<style scoped>
/* Both glyphs share one grid cell, so the name doesn't shift when they swap. */
.swap {
  display: inline-grid;
}

.plain,
.accent {
  grid-area: 1 / 1;
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.accent {
  opacity: 0;
  transform: translateY(-0.25em);
}

.swap-late .plain,
.swap-late .accent {
  transition-delay: 0.2s;
}

.name:hover .plain,
.name:focus-visible .plain {
  opacity: 0;
}

.name:hover .accent,
.name:focus-visible .accent {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .plain,
  .accent {
    transition: none;
  }
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 17px;
  line-height: 1.5;
}

.nav-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Phones only show the icons; labels stay available to screen readers. */
@media (max-width: 639px) {
  .nav-icon {
    width: 18px;
    height: 18px;
  }

  .nav-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
}
</style>
