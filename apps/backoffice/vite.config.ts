import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 3002,
  },
  ssr: {
    noExternal: ['@repo/database'],
    external: ['@prisma/client'],
  },
  optimizeDeps: {
    exclude: ['@prisma/client', '@repo/database'],
  },
});
