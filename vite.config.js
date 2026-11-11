import { defineConfig } from 'vite';
export default defineConfig(({ command }) => ({
  // served from https://<user>.github.io/middle-earth-atlas/
  base: command === 'build' ? '/middle-earth-atlas/' : '/',
  server: { port: 5199, host: '127.0.0.1' },
  build: { chunkSizeWarningLimit: 2000 },
}));
