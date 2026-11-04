<script lang="ts" setup>
import { ref, watchEffect } from 'vue'
import { onClickOutside, useWindowSize } from '@vueuse/core'
import siteConfig from '../site-config'

const navLinks = siteConfig.headerNavLinks || []

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
  <header text-sm sm:text-lg max-w-3xl mx-auto h-18 px-6 flex justify-between items-center gap-2 whitespace-nowrap relative>
    <div>
      <a href="/" nav-link font-500 text-base sm:text-xl hover:text-gray-800>Eren Türkoglu</a>
    </div>
    <div flex items-center gap-2 sm:gap-6>
      <a v-for="link in navLinks" :key="link.text" nav-link
        :class="pathname.includes(link.href) ? 'text-sky-600' : 'opacity-60  hover:opacity-100'" :href="link.href">
        {{ link.text }}
      </a>
      <div class="rss-link" flex items-center>
        <a nav-link href="/rss.xml" i-ri-rss-line opacity-60 hover:opacity-100 w-5 h-5 />
      </div>
    </div>
  </header>
</template>

<style scoped>
/* The smallest phones have no room for the icon on the same line. */
@media (max-width: 339px) {
  .rss-link {
    display: none;
  }
}
</style>
