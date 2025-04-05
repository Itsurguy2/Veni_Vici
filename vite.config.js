import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        if (warning.message.includes('The message port closed before a response was received')) {
          return;
        }
        warn(warning);
      }
    }
  },
  server: {
    hmr: {
      overlay: false
    }
  },
  optimizeDeps: {
    exclude: ['chrome-extension']
  }
})


