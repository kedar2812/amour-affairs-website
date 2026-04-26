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
        main:               resolve(__dirname, 'index.html'),
        shop:               resolve(__dirname, 'shop.html'),
        weddings:           resolve(__dirname, 'weddings/index.html'),
        films:              resolve(__dirname, 'films/index.html'),
        coupleShoots:       resolve(__dirname, 'couple-shoots/index.html'),
        premiumAlbums:      resolve(__dirname, 'premium-albums/index.html'),
        privacyPolicy:      resolve(__dirname, 'privacy-policy/index.html'),
        disclaimer:         resolve(__dirname, 'disclaimer/index.html'),
        careers:            resolve(__dirname, 'careers/index.html'),
        termsAndConditions: resolve(__dirname, 'terms-and-conditions/index.html'),
        faqs:               resolve(__dirname, 'faqs/index.html'),
      }
    }
  },
});
