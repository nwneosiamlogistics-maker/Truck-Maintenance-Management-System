import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/line-api': {
          target: 'https://api.line.me',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/line-api/, '')
        },
        '/telegram-api': {
          target: 'https://api.telegram.org',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/telegram-api/, '')
        }
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            charts: ['recharts'],
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
            xlsx: ['xlsx'],
            ui: ['sweetalert2', 'lucide-react']
          }
        }
      }
    }
  };
});
