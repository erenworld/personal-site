// @ts-check

import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import UnoCSS from 'unocss/astro';
import vue from '@astrojs/vue';

import expressiveCode from "astro-expressive-code";
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers'

// https://astro.build/config
export default defineConfig({
  site: "https://erenkad.com",
  output: "static",
  integrations: [
    expressiveCode({
      themes: ['catppuccin-latte'],
      plugins: [pluginLineNumbers()],
      styleOverrides: {
        frames: {
          frameBoxShadowCssValue: '',
        },
      },
    }),
    mdx(), sitemap(),
    UnoCSS({
      injectReset: true
    }),
    vue(),
  ],
  devToolbar: {
    enabled: false,
  },
});
