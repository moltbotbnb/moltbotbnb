import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'levr-sdk': path.resolve(__dirname, 'node_modules/levr-sdk'),
      'levr-sdk/client': path.resolve(__dirname, 'node_modules/levr-sdk/dist/esm/client/index.js'),
    },
  },
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    include: ['levr-sdk', 'levr-sdk/client'],
  },
})
