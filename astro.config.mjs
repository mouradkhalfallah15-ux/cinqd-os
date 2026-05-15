import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), react()],
  output: 'static',
  server: {
    port: 4325,
    host: true
  },
  vite: {
    ssr: {
      noExternal: ['react-icons', '@google/generative-ai', 'firebase']
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'firebase/app', 'firebase/firestore', 'firebase/app-check']
    }
  }
});