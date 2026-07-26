import { defineConfig, envField } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@astrojs/mdx'

export default defineConfig({
  site: 'https://erenkad.com',
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      GITHUB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  devToolbar: {
    enabled: false,
  },
})
