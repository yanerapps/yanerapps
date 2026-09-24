// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://yanerapps.com',
  vite: {
    // Pre-bundle three and its addon together, or the dev server ships two copies of three.
    optimizeDeps: { include: ['three', 'three/addons/controls/OrbitControls.js'] },
  },
});
