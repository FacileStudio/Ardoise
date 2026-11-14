import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
  clearScreen: false,
  server: {
    port: Number(process.env.PORT) || 3000,
    fs: {
      allow: ['..', '../../packages'],
    },
  },
  assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.otf'],
  optimizeDeps: {
    exclude: ['@facile/muse', '@facile/mise-en-scene', '@repo/database', 'pg', '@prisma/client'],
  },
  ssr: {
    noExternal: ['@repo/trpc-client', '@repo/storage-client', '@repo/database'],
    external: ['@prisma/client'],
  },
});
