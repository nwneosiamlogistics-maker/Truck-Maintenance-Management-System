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
        },
        '/nas-api': {
          target: env.VITE_NAS_QUICKCONNECT_URL || 'https://neosiam.sg3.quickconnect.to',
          changeOrigin: true,
          secure: false,
          followRedirects: true,
          rewrite: (path) => path.replace(/^\/nas-api/, '/webapi'),
          configure: (proxy) => {
            proxy.on('proxyReq', (_proxyReq, req) => {
              console.log('[NAS Proxy]', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes) => {
              // เพิ่ม CORS headers ให้ทุก response
              proxyRes.headers['access-control-allow-origin'] = '*';
              proxyRes.headers['access-control-allow-methods'] = 'GET, POST, OPTIONS';
              proxyRes.headers['access-control-allow-headers'] = '*';

              // ถ้า QuickConnect redirect → เปลี่ยน Location ให้กลับมาผ่าน proxy
              if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                const loc = proxyRes.headers.location;
                if (loc.includes('quickconnect.to')) {
                  const newLoc = loc.replace(/https?:\/\/[^/]*quickconnect\.to\/webapi/, '/nas-api');
                  console.log('[NAS Proxy] Rewriting redirect:', loc, '->', newLoc);
                  proxyRes.headers.location = newLoc;
                }
              }
            });
          },
        },
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
