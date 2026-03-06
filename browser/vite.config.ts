import { defineConfig } from 'vite';
import { resolve } from 'path';
import { saveLevelPlugin } from './server/save-level';

export default defineConfig({
  plugins: [saveLevelPlugin()],
  base: './',
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor.html'),
      },
    },
  },
  server: {
    open: true,
  },
});
