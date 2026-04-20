import { defineConfig } from 'vite';
import autoprefixer from 'autoprefixer';
import { resolve } from 'path';

export default defineConfig({
  css: {
    postcss: {
      plugins: [
        autoprefixer(),
      ],
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        shop: resolve(__dirname, 'shop.html'),
      }
    }
  },
});
