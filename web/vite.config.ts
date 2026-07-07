/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || ''

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon-32.png', 'favicon-48.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'Cubitat Inmobiliaria',
          short_name: 'Cubitat',
          description: 'El portal de propiedades para Cuba',
          theme_color: '#035f53',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          navigateFallbackDenylist: [/\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^(https:\/\/.*\.supabase\.co|\/api\/supabase)\/rest\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 1 semana
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^(https:\/\/.*\.supabase\.co|\/api\/supabase)\/storage\/v1\/object\/public\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-image-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 días
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    server: {
      allowedHosts: true,
      proxy: {
        '/api/supabase': {
          target: 'https://tohjzoncoosvjbjcakdl.supabase.co',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/supabase/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const authHeader = req.headers['authorization'];
              const apiKeyHeader = req.headers['apikey'];
              console.log('[Proxy Debug] Incoming:', { authHeader, apiKeyHeader, resolvedKeyExists: !!supabaseAnonKey });
              if (!authHeader || authHeader === 'Bearer dummy-key-safe-from-browsers') {
                proxyReq.setHeader('Authorization', `Bearer ${supabaseAnonKey}`);
              }
              if (!apiKeyHeader || apiKeyHeader === 'dummy-key-safe-from-browsers') {
                proxyReq.setHeader('apikey', supabaseAnonKey);
              }
              console.log('[Proxy Debug] Outgoing headers:', proxyReq.getHeaders());
            });
          }
        }
      }
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/setupTests.ts'],
      exclude: ['node_modules', 'dist', 'e2e']
    }
  }
})
