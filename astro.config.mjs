// @ts-check

import { fileURLToPath } from "node:url";
import mdx from "@astrojs/mdx";
import { satteri } from "@astrojs/markdown-satteri";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import UnoCSS from "@unocss/astro";
import { satteriMdcToMdx } from "./src/plugins/remark-mdc-to-mdx.ts";
import { satteriMermaidAscii } from "./src/plugins/remark-mermaid-ascii.ts";

// https://astro.build/config
export default defineConfig({
  site: "https://erenkad.com",
  output: "static",
  integrations: [
    mdx({
      syntaxHighlight: "shiki",
      shikiConfig: {
        theme: "github-light",
      },
    }),
    sitemap(),
    UnoCSS(),
  ],
  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
  markdown: {
    processor: satteri({
      mdastPlugins: [satteriMermaidAscii(), satteriMdcToMdx()],
      features: { directive: true, gfm: true },
    }),
    shikiConfig: {
      theme: "github-dark",
    },
  },
  devToolbar: {
    enabled: false,
  },
});
