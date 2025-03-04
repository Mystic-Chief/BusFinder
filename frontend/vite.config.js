import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development')
    },
    plugins: [react()],
    build: {
      minify: 'terser',
      terserOptions: {
        compress: { drop_console: true }
      }
    }
  };
});