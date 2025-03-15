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
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'livekit-client', 'uuid'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['uuid'],
  },
  resolve: {
    alias: {
      'react': 'react',
      'react-dom': 'react-dom',
    },
  },
  server: {
    port: 8900,
    host: true,
  },
});
