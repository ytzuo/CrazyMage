import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: { game: 'index.html', bestiary: 'bestiary.html' },
      output: { manualChunks: { phaser: ['phaser'] } },
    },
  },
});
