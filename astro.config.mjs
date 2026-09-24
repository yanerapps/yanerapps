// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://yanerapps.com',
  vite: {
    // three is only reached through a dynamic import, so pre-bundle it up front for the dev server.
    optimizeDeps: { include: ['three'] },
  },
});
