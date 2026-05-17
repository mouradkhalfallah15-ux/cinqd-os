import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), react()],
  output: 'static',
  server: {
    port: 4325,
    host: true
  },
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    ssr: {
      noExternal: ['react-icons', '@google/generative-ai', 'firebase']
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/app-check']
    }
  }
});