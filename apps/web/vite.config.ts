import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/translation': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/translation-qa': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/glossary': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/polar': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/checkout': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/ai-health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-health/, '/health'),
      },
      '/ai-glossary': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-glossary/, '/glossary'),
      },
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      checks: {
        pluginTimings: false,
      },
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'livekit-client',
              test(id: string) {
                return id.includes('node_modules/livekit-client') || id.includes('node_modules\\livekit-client');
              },
              priority: 30,
            },
            {
              name: 'livekit-components',
              test(id: string) {
                return id.includes('node_modules/@livekit') || id.includes('node_modules\\@livekit');
              },
              priority: 25,
            },
            {
              name: 'vendor-react',
              test(id: string) {
                const match = id.includes('node_modules/react') || id.includes('node_modules\\react') ||
                  id.includes('node_modules/scheduler') || id.includes('node_modules\\scheduler');
                return match;
              },
              priority: 40,
            },
            {
              name: 'vendor-supabase',
              test(id: string) {
                return id.includes('node_modules/@supabase') || id.includes('node_modules\\@supabase');
              },
              priority: 35,
            },
          ],
        },
      },
    },
  },
});
