/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import {
  DEVELOPMENT_SERVICE_WORKER_CLEANUP_SCRIPT,
  isDevelopmentServiceWorkerRequest,
} from './src/shared/pwa/developmentServiceWorkerCleanup.js'
import { handleContactMetric } from './src/worker/contact-metrics.js'
import { getDevServerAllowedHosts } from './src/devServerHosts.js'
import { resolvePhase4Flags } from './scripts/phase4-profile.mjs'

let cachedLocalServiceRoleKey: string | undefined
const localContactMetricsSalt = randomBytes(32).toString('hex')

function readLocalSupabaseServiceRoleKey(): string {
  if (cachedLocalServiceRoleKey !== undefined) return cachedLocalServiceRoleKey
  try {
    const supabaseCli = process.env.SUPABASE_CLI_PATH
      || resolve(process.env.USERPROFILE || '', 'scoop/shims/supabase.exe')
    const output = execFileSync(supabaseCli, ['status', '-o', 'env'], {
      cwd: __dirname,
      encoding: 'utf8',
      windowsHide: true,
    })
    cachedLocalServiceRoleKey = output.match(/^SERVICE_ROLE_KEY="?([^"\r\n]+)"?$/m)?.[1] || ''
  } catch {
    cachedLocalServiceRoleKey = ''
  }
  return cachedLocalServiceRoleKey
}

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  // Ignore Vite's ambient additional-host escape hatch; use the validated app setting.
  delete process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
  const env = loadEnv(mode, __dirname, '')
  const phase34DevBuild = mode === 'phase34-dev'
  const phase2DevBuild = mode === 'phase2-dev' || mode === 'phase2-agents' || phase34DevBuild
  const phase2AgentConsentProduction = mode === 'phase2-agent-consent-production'
  const phase4Production = mode === 'phase4-production'
  const productionBuild = mode === 'phase2-production'
    || phase2AgentConsentProduction
    || mode === 'phase3-production'
    || phase4Production
  const phase3UiEnabled = phase34DevBuild || mode === 'phase3-production' || phase4Production || (phase2DevBuild && env.VITE_PHASE3_UI_ENABLED === 'true')
  const phase2UiEnabled = phase2DevBuild || productionBuild
  const agentWhatsappConsentUiEnabled = phase2AgentConsentProduction
    || phase3UiEnabled
    || (phase2DevBuild && env.VITE_AGENT_WHATSAPP_CONSENT_UI_ENABLED === 'true')
  const imageDuplicateModerationEnabled = phase2UiEnabled
  const phase34DevEnv = phase34DevBuild
    ? {
        ...env,
        VITE_PHASE4_SVC_ENABLED: 'true',
        VITE_PHASE4_REV_ENABLED: 'true',
        VITE_PHASE4_MAT_ENABLED: 'true',
        VITE_PHASE4_BIZ_ENABLED: 'true',
        VITE_PHASE4_VAL_ENABLED: 'false',
      }
    : env
  const phase4Flags = resolvePhase4Flags({ phase4Production, phase2DevBuild, env: phase34DevEnv })
  const kycUiEnabled = phase2UiEnabled || mode === 'phase2-kyc'
  const propertyVerificationUiEnabled = phase2UiEnabled || mode === 'phase2-documents'
  const phase2SupabaseUrl = phase2DevBuild
    ? 'https://bknwerqbbysveehcdmzr.supabase.co'
    : ''
  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  const publicSupabaseUrl =
    env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || phase2SupabaseUrl
  const supabaseUrl =
    publicSupabaseUrl ||
    'http://127.0.0.1:54321'

  if (phase34DevBuild) {
    if (publicSupabaseUrl !== 'https://bknwerqbbysveehcdmzr.supabase.co') {
      throw new Error('El perfil phase34-dev requiere el proyecto Supabase DEV bknwerqbbysveehcdmzr.')
    }
    if (!supabaseAnonKey && command !== 'build') {
      throw new Error('El perfil phase34-dev requiere VITE_SUPABASE_ANON_KEY del proyecto DEV; no uses la clave productiva.')
    }
  }

  if (mode === 'phase2-documents') {
    const productionSupabaseUrl = 'https://tohjzoncoosvjbjcakdl.supabase.co'
    if (publicSupabaseUrl !== productionSupabaseUrl) {
      throw new Error(`El perfil phase2-documents requiere VITE_SUPABASE_URL=${productionSupabaseUrl}`)
    }
    if (!supabaseAnonKey) {
      throw new Error('El perfil phase2-documents requiere VITE_SUPABASE_ANON_KEY del proyecto productivo.')
    }
  }

  if (productionBuild) {
    const productionSupabaseUrl = 'https://tohjzoncoosvjbjcakdl.supabase.co'
    if (publicSupabaseUrl !== productionSupabaseUrl) {
      throw new Error(`El perfil ${mode} requiere VITE_SUPABASE_URL=${productionSupabaseUrl}`)
    }
    if (!supabaseAnonKey) {
      throw new Error(`El perfil ${mode} requiere VITE_SUPABASE_ANON_KEY del proyecto productivo.`)
    }
  }

  return {
    resolve: {
      alias: phase4Production
        ? [{ find: '../pages/valuation/PropertyValuationPage', replacement: resolve(__dirname, 'src/pages/valuation/valuationDisabled.tsx') }]
        : [],
    },
    define: {
      'import.meta.env.VITE_PHASE2_UI_ENABLED': JSON.stringify(phase2UiEnabled ? 'true' : 'false'),
      'import.meta.env.VITE_PHASE3_UI_ENABLED': JSON.stringify(phase3UiEnabled ? 'true' : 'false'),
      'import.meta.env.VITE_AGENT_WHATSAPP_CONSENT_UI_ENABLED': JSON.stringify(agentWhatsappConsentUiEnabled ? 'true' : 'false'),
      'import.meta.env.VITE_KYC_UI_ENABLED': JSON.stringify(kycUiEnabled ? 'true' : 'false'),
      'import.meta.env.VITE_PROPERTY_VERIFICATION_UI_ENABLED': JSON.stringify(propertyVerificationUiEnabled ? 'true' : 'false'),
      'import.meta.env.VITE_IMAGE_DUPLICATE_MODERATION_ENABLED': JSON.stringify(imageDuplicateModerationEnabled ? 'true' : 'false'),
      'import.meta.env.VITE_PHASE4_SVC_ENABLED': JSON.stringify(phase4Flags.svc ? 'true' : 'false'),
      'import.meta.env.VITE_PHASE4_REV_ENABLED': JSON.stringify(phase4Flags.rev ? 'true' : 'false'),
      'import.meta.env.VITE_PHASE4_MAT_ENABLED': JSON.stringify(phase4Flags.mat ? 'true' : 'false'),
      'import.meta.env.VITE_PHASE4_BIZ_ENABLED': JSON.stringify(phase4Flags.biz ? 'true' : 'false'),
      'import.meta.env.VITE_PHASE4_VAL_ENABLED': JSON.stringify(phase4Flags.val ? 'true' : 'false'),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(publicSupabaseUrl),
    },
    plugins: [
      react(),
      {
        name: 'development-service-worker-cleanup',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (!isDevelopmentServiceWorkerRequest(req.url)) {
              next()
              return
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
            res.setHeader('Service-Worker-Allowed', '/')
            res.end(DEVELOPMENT_SERVICE_WORKER_CLEANUP_SCRIPT)
          })
        },
      },
      {
        name: 'local-api-metrics',
        configureServer(server) {
          const contactRateLimits = new Map<string, { count: number; resetAt: number }>()
          server.middlewares.use('/api/phase2/contact-click', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end('Method Not Allowed')
              return
            }

            const clientIp = req.socket.remoteAddress || '127.0.0.1'
            const now = Date.now()
            const currentLimit = contactRateLimits.get(clientIp)
            const nextLimit = !currentLimit || currentLimit.resetAt <= now
              ? { count: 1, resetAt: now + 60_000 }
              : { count: currentLimit.count + 1, resetAt: currentLimit.resetAt }
            contactRateLimits.set(clientIp, nextLimit)
            if (nextLimit.count > 20) {
              res.statusCode = 429
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: 'Demasiados intentos.' }))
              return
            }

            let body = ''
            req.on('data', (chunk) => {
              if (body.length <= 1_024) body += chunk.toString()
            })
            req.on('end', async () => {
              const serviceRoleKey = readLocalSupabaseServiceRoleKey()
              const request = new Request('http://127.0.0.1:5173/api/phase2/contact-click', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  'user-agent': req.headers['user-agent'] || 'local-vite',
                  'x-forwarded-for': req.socket.remoteAddress || '127.0.0.1',
                },
                body,
              })
              const response = await handleContactMetric(request, {
                VITE_SUPABASE_URL: supabaseUrl,
                SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
                CONTACT_METRICS_SALT: serviceRoleKey ? localContactMetricsSalt : undefined,
              })

              res.statusCode = response.status
              response.headers.forEach((value: string, name: string) => res.setHeader(name, value))
              res.end(await response.text())
            })
          })

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
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
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
          related_applications: [
            {
              platform: 'webapp',
              url: `${phase2DevBuild ? 'https://cubitat1-phase2-dev.pochiprats18.workers.dev' : 'https://cubitathome.com'}/manifest.webmanifest`,
              id: `${phase2DevBuild ? 'https://cubitat1-phase2-dev.pochiprats18.workers.dev' : 'https://cubitathome.com'}/`,
            },
          ],
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
        injectManifest: {
          globIgnores: ['**/vendor-maplibre-*.js', '**/vendor-maplibre-*.css'],
        }
      })
    ],
    server: {
      host: '127.0.0.1',
      allowedHosts: getDevServerAllowedHosts(
        env.CUBITAT_DEV_ADDITIONAL_ALLOWED_HOSTS
          || process.env.CUBITAT_DEV_ADDITIONAL_ALLOWED_HOSTS,
      ),
      proxy: {
        '/api/supabase': {
          target: supabaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/supabase/, ''),
          configure: (proxy) => {
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

            proxy.on('error', async (_err: unknown, _req, res) => {
              if (!('statusCode' in res)) {
                res.end()
                return
              }

              if (!res.headersSent) {
                res.statusCode = 502
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Supabase local no está disponible.' }))
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
