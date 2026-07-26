/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://tohjzoncoosvjbjcakdl.supabase.co'

  return {
    plugins: [
      react(),
      {
        name: 'local-api-metrics',
        configureServer(server) {
          server.middlewares.use('/api/metrics', async (req, res) => {
            let cloudflareData = { requests: null as number | null, error: 'Falta configurar CF_API_TOKEN y CF_ACCOUNT_ID en .env' };
            let supabaseData = { storage_bytes: null as number | null, egress_bytes: null as number | null, db_bytes: null as number | null, error: 'Falta configurar SUPABASE_MANAGEMENT_TOKEN y SUPABASE_PROJECT_ID en .env' };
            
            const cfToken = env.CF_API_TOKEN || process.env.CF_API_TOKEN;
            const cfAccount = env.CF_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
            const sbToken = env.SUPABASE_MANAGEMENT_TOKEN || process.env.SUPABASE_MANAGEMENT_TOKEN;
            const sbProject = env.SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_ID;
            const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
            const authHeader = req.headers.authorization || '';

            if (!supabaseUrl || !supabaseAnonKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Supabase no está configurado.' }));
              return;
            }

            if (!authHeader || authHeader === 'Bearer dummy-key-safe-from-browsers') {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }

            const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
              headers: { apikey: supabaseAnonKey, Authorization: authHeader }
            });

            if (!userRes.ok) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }

            const user = await userRes.json() as { id?: string };
            const roleRes = user.id
              ? await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`, {
                  headers: { apikey: supabaseAnonKey, Authorization: authHeader }
                })
              : null;
            const roles = roleRes?.ok ? await roleRes.json() as { role?: string }[] : [];

            if (roles[0]?.role !== 'admin') {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Forbidden' }));
              return;
            }
            
            // Fetch Cloudflare
            if (cfToken && cfAccount) {
              try {
                const date = new Date();
                const todayStr = date.toISOString().split('T')[0] + 'T00:00:00Z';
                const cfQuery = `
                  query {
                    viewer {
                      accounts(filter: {accountTag: "${cfAccount}"}) {
                        workersInvocationsAdaptive(limit: 10000, filter: {datetime_geq: "${todayStr}"}) {
                          sum { requests }
                        }
                      }
                    }
                  }
                `;
                const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: cfQuery })
                });
                const cfJson: any = await cfRes.json();
                if (cfJson?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive?.[0]?.sum?.requests !== undefined) {
                  cloudflareData = { requests: cfJson.data.viewer.accounts[0].workersInvocationsAdaptive[0].sum.requests, error: '' };
                } else {
                  const cfErr = cfJson?.errors?.[0]?.message || 'Error desconocido';
                  cloudflareData.error = `Error GraphQL CF: ${cfErr}`;
                }
              } catch (e: any) {
                cloudflareData.error = `Excepción CF: ${e.message}`;
              }
            }

            // Fetch Supabase
            // Supabase API doesn't expose usage metrics publicly
            if (sbToken && sbProject) {
              supabaseData = {
                db_bytes: null,
                storage_bytes: null,
                egress_bytes: null,
                error: 'Usa el dashboard de Supabase para ver el ancho de banda y storage real.'
              };
            }
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              cloudflare: cloudflareData,
              supabase: supabaseData,
              analytics: { activeUsers: null, error: 'Integración GA pendiente de Service Account' },
            }));
          });

          server.middlewares.use('/api/ai-moderate', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method Not Allowed');
              return;
            }
            
            const geminiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

            let bodyStr = '';
            req.on('data', chunk => { bodyStr += chunk.toString(); });
            req.on('end', async () => {
              try {
                const body = JSON.parse(bodyStr);
                const authHeader = req.headers.authorization || '';
                const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
                const anonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

                if (!url || !anonKey) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Supabase no está configurado.' }));
                  return;
                }

                if (!authHeader || authHeader === 'Bearer dummy-key-safe-from-browsers') {
                  res.statusCode = 401;
                  res.end(JSON.stringify({ error: 'Unauthorized' }));
                  return;
                }

                const userRes = await fetch(`${url}/auth/v1/user`, {
                  headers: { apikey: anonKey, Authorization: authHeader }
                });

                if (!userRes.ok) {
                  res.statusCode = 401;
                  res.end(JSON.stringify({ error: 'Unauthorized' }));
                  return;
                }

                if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.property_id || '')) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid property_id' }));
                  return;
                }

                const propertyRes = await fetch(`${url}/rest/v1/properties?id=eq.${encodeURIComponent(body.property_id)}&select=id`, {
                  headers: { apikey: anonKey, Authorization: authHeader }
                });
                const properties = propertyRes.ok ? await propertyRes.json() as any[] : [];
                if (!propertyRes.ok || properties.length === 0) {
                  res.statusCode = 403;
                  res.end(JSON.stringify({ error: 'Forbidden' }));
                  return;
                }

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 202;
                res.end(JSON.stringify({ status: 'processing', reason: 'Moderación en background iniciada' }));
                
                let aiResult = { status: 'pending_review', reason: 'IA deshabilitada en local. Pendiente de revisión manual.' };
                
                if (geminiKey) {
                  const prompt = `Eres un moderador experto de bienes raíces en Cuba para la plataforma Cubitat. 
Tu tarea es analizar el siguiente anuncio y determinar si cumple con las reglas (sin lenguaje ofensivo, sin spam evidente, precio razonable, descripción coherente).
Devuelve estrictamente un objeto JSON con dos propiedades:
"status": "ai_approved" o "ai_rejected".
"reason": Una breve explicación de por qué lo aprobaste o rechazaste.

Anuncio:
Título: ${body.title}
Descripción: ${body.description}
Precio: ${body.price_usd} USD
Tipo: ${body.property_type}`;

                  try {
                    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                      })
                    });

                    const geminiJson = await geminiRes.json() as any;
                    if (geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text) {
                      aiResult = JSON.parse(geminiJson.candidates[0].content.parts[0].text);
                    } else {
                      aiResult = { status: 'pending_review', reason: 'Error al parsear IA local. Pendiente de revisión manual.' };
                    }
                  } catch (e: any) {
                    aiResult = { status: 'pending_review', reason: `Excepción local IA: ${e.message}` };
                  }
                }
                
                // Actualizar en base de datos
                if (url && anonKey) {
                  await fetch(`${url}/rest/v1/rpc/set_property_ai_moderation`, {
                    method: 'POST',
                    headers: {
                      'apikey': anonKey,
                      'Authorization': authHeader,
                      'Content-Type': 'application/json',
                      'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                      p_property_id: body.property_id,
                      p_status: aiResult.status || 'pending_review',
                      p_message: aiResult.reason || ''
                    })
                  });
                }

              } catch (e) {
                console.error("Error en proxy local IA:", e);
              }
            });
          });
        }
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon-32.png', 'favicon-48.png', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          scope: '/',
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
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          navigateFallbackDenylist: [/\/api\//],
          globIgnores: ['**/vendor-maplibre-*.js', '**/vendor-maplibre-*.css'],
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
          target: supabaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/supabase/, ''),
          configure: (proxy) => {
            const remoteUrl = 'https://tohjzoncoosvjbjcakdl.supabase.co'
            const remoteAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaGp6b25jb29zdmpiamNha2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTY1OTgsImV4cCI6MjA5ODM3MjU5OH0.ytR4ykmBVrUh4hvPDKWpQdbTcM42_owdKEGiwta1pqo'

            proxy.on('proxyReq', (proxyReq, req) => {
              const authHeader = req.headers['authorization'];
              const apiKeyHeader = req.headers['apikey'];
              if (!authHeader || authHeader === 'Bearer dummy-key-safe-from-browsers') {
                proxyReq.setHeader('Authorization', `Bearer ${supabaseAnonKey}`);
              }
              if (!apiKeyHeader || apiKeyHeader === 'dummy-key-safe-from-browsers') {
                proxyReq.setHeader('apikey', supabaseAnonKey);
              }
            });

            proxy.on('error', async (err: any, req, res) => {
              if (err.code === 'ECONNREFUSED' && supabaseUrl.includes('127.0.0.1')) {
                try {
                  const targetPath = (req.url || '').replace(/^\/api\/supabase/, '')
                  const authHeader = req.headers['authorization'] === 'Bearer dummy-key-safe-from-browsers'
                    ? `Bearer ${remoteAnonKey}`
                    : (req.headers['authorization'] || `Bearer ${remoteAnonKey}`)
                  const response = await fetch(`${remoteUrl}${targetPath}`, {
                    method: req.method,
                    headers: {
                      'Content-Type': req.headers['content-type'] || 'application/json',
                      'apikey': remoteAnonKey,
                      'Authorization': authHeader,
                    },
                  })
                  res.statusCode = response.status
                  const body = await response.text()
                  res.setHeader('Content-Type', 'application/json')
                  res.end(body)
                  return
                } catch {
                  // Fallback
                }
              }
              if (!res.headersSent) {
                res.statusCode = 502
                res.end(JSON.stringify({ error: 'No se pudo conectar con el servidor.' }))
              }
            })
          }
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined
            }

            if (id.includes('maplibre-gl')) {
              return 'vendor-maplibre'
            }

            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }

            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react'
            }

            if (
              id.includes('@radix-ui') ||
              id.includes('cmdk') ||
              id.includes('embla-carousel-react')
            ) {
              return 'vendor-ui'
            }

            return 'vendor'
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/setupTests.ts'],
      exclude: ['node_modules', 'dist', 'e2e']
    }
  }
})
