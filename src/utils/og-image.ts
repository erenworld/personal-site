import satori from 'satori';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import fs from 'node:fs';
import path from 'node:path';
import siteConfig from '../site-config';

let wasmInitialized = false;

interface OGImageOptions {
  width?: number;
  height?: number;
}

export async function generateOGImage(
  html: any,
  options: OGImageOptions = {}
) {
  const { width = 1200, height = 600 } = options;

  const nodeModules = path.join(process.cwd(), 'node_modules');

  // Initialize WASM once
  if (!wasmInitialized) {
    const wasmPath = path.join(nodeModules, '@resvg/resvg-wasm/index_bg.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    await initWasm(wasmBuffer);
    wasmInitialized = true;
  }

  // Load fonts from @fontsource/inter
  const fontPath = path.join(nodeModules, '@fontsource/inter/files');
  const interRegular = fs.readFileSync(path.join(fontPath, 'inter-latin-400-normal.woff'));
  const interBold = fs.readFileSync(path.join(fontPath, 'inter-latin-700-normal.woff'));

  // Generate SVG with satori
  const svg = await satori(html, {
    width,
    height,
    fonts: [
      {
        name: 'Inter',
        data: interRegular,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Inter',
        data: interBold,
        weight: 700,
        style: 'normal',
      },
    ],
  });

  // Convert SVG to PNG with resvg-wasm
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(pngBuffer as any, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

// Astro doesn't support tsx endpoints so using React-element objects
export function ogTemplate(title: string, subtitle: string, category: string) {
  return generateOGImage({
    type: 'div',
    props: {
      children: [
        // Main Content
        {
          type: 'div',
          props: {
            tw: 'flex flex-col items-start px-16 w-full',
            children: [
              {
                type: 'div',
                props: {
                  tw: 'text-6xl font-bold leading-tight',
                  children: title,
                },
              },
              {
                type: 'div',
                props: {
                  tw: 'text-2xl text-gray-500 mt-4',
                  children: subtitle,
                },
              },
            ],
          },
        },
        // Footer with Author & Category
        {
          type: 'div',
          props: {
            tw: 'absolute right-10 bottom-10 flex items-center text-3xl',
            children: [
              {
                type: 'div',
                props: {
                  tw: 'text-sky-600',
                  children: siteConfig.author,
                },
              },
              {
                type: 'div',
                props: {
                  tw: 'text-gray-400 mx-2',
                  style: { fontSize: '30px' },
                  children: '|',
                },
              },
              {
                type: 'div',
                props: {
                  tw: 'text-gray-800',
                  children: category,
                },
              },
            ],
          },
        },
      ],
      tw: 'w-full h-full flex items-center justify-center relative px-22',
      style: {
        background: '#FAF4ED',
      },
    },
  }, {
    width: 1200,
    height: 600,
  });
}
