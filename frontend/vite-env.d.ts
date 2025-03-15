/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_LIVEKIT_URL: string
    // Add other env variables as needed
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
  
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import { resolve } from 'path';
  
  export default defineConfig({
    plugins: [react()],
    root: '.',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false,
      minify: true,
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'livekit-client'],
          },
        },
      },
    },
    server: {
      port: 8900,
      host: true,
    },
  });