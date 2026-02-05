import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
  clearScreen: false,
  server: {
    port: Number(process.env.PORT) || 3002,
    fs: {
      allow: ['..']
    }
  },
  ssr: {
    noExternal: ['@repo/database'],
    external: ['@prisma/client'],
  },
  optimizeDeps: {
    exclude: ['@prisma/client', '@repo/database'],
  },
  assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.otf']
});
