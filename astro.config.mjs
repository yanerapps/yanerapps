// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://yanerapps.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  // Astro's compressor drops the space where a line break comes before an inline element.
  compressHTML: false,
  integrations: [sitemap(), svelte()],
  vite: {
    // three is only reached through a dynamic import, so pre-bundle it up front for the dev server.
    optimizeDeps: { include: ['three'] },
  },
});
