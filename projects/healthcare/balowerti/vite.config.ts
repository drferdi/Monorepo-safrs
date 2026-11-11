// Architected and built by the one and only Drferdi.

import react from '@vitejs/plugin-react'
import path from 'path'
import type { UserConfig } from 'vite'
import { defineConfig } from 'vite'

const terserOpts: UserConfig['build'] = {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
  },
}

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    ...terserOpts,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-slot',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],
          'vendor-animation': ['motion', 'lenis'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 400,
  },
  preview: {
    allowedHosts: ['puskesmas-website-production.up.railway.app'],
  },
})
