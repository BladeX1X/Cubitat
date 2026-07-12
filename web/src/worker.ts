import { RateLimiter } from './rate-limiter';

export { RateLimiter };

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  SUPABASE_MANAGEMENT_TOKEN?: string;
  SUPABASE_PROJECT_ID?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
  GA_SERVICE_ACCOUNT_JSON?: string;
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  RATE_LIMITER: any;
}
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status = 200): Response {
  return withSecurityHeaders(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  }));
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  if (response.headers.get('Content-Type')?.includes('text/html')) {
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' blob: https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://tohjzoncoosvjbjcakdl.supabase.co https://www.google-analytics.com https://www.google.com https://static.cloudflareinsights.com https://*.cubitathome.com https://tiles.openfreemap.org; frame-src 'self' https://www.google.com https://www.openstreetmap.org; media-src 'self' blob:;");
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function getAuthenticatedUser(authHeader: string, env: Env): Promise<{ id: string } | null> {
  if (!authHeader.startsWith('Bearer ') || authHeader === 'Bearer dummy-key-safe-from-browsers') {
    return null;
  }

  const response = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': env.VITE_SUPABASE_ANON_KEY,
      'Authorization': authHeader
    }
  });

  if (!response.ok) {
    return null;
  }

  const user = await response.json() as { id?: string };
  return user.id ? { id: user.id } : null;
}

async function getUserRole(userId: string, authHeader: string, env: Env): Promise<string | null> {
  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role`,
    {
      headers: {
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Authorization': authHeader
      }
    }
  );

  if (!response.ok) {
    return null;
  }

  const rows = await response.json() as { role?: string }[];
  return rows[0]?.role || null;
}

async function canModerateProperty(propertyId: string, userId: string, authHeader: string, env: Env): Promise<boolean> {
  const response = await fetch(
    `${env.VITE_SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}&select=id,user_id`,
    {
      headers: {
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Authorization': authHeader
      }
    }
  );

  if (!response.ok) {
    return false;
  }

  const rows = await response.json() as { user_id?: string }[];
  const property = rows[0];
  if (!property) {
    return false;
  }

  if (property.user_id === userId) {
    return true;
  }

  return (await getUserRole(userId, authHeader, env)) === 'admin';
}

async function isRateLimited(env: Env, ip: string, limit: number, windowMs: number): Promise<boolean> {
  const id = env.RATE_LIMITER.idFromName('global');
  const stub = env.RATE_LIMITER.get(id);
  const url = `https://dummy/check?key=${encodeURIComponent(ip)}&limit=${limit}&windowMs=${windowMs}`;
  const res = await stub.fetch(url);
  const data = await res.json() as { allowed: boolean };
  return !data.allowed;
}

async function checkRateLimit(env: Env, key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const id = env.RATE_LIMITER.idFromName('global');
  const stub = env.RATE_LIMITER.get(id);
  const url = `https://dummy/check?key=${encodeURIComponent(key)}&limit=${limit}&windowMs=${windowMs}`;
  const res = await stub.fetch(url);
  return await res.json() as { allowed: boolean; remaining: number; resetAt: number };
}

function rateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return withSecurityHeaders(new Response(JSON.stringify({
    error: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
    },
  }));
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function getRequestEmail(request: Request): Promise<string> {
  try {
    const contentType = request.headers.get('content-type') || '';
    const clonedRequest = request.clone();

    if (contentType.includes('application/json')) {
      const body = await clonedRequest.json() as any;
      return normalizeEmail(body?.email || body?.data?.email || body?.user?.email);
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = await clonedRequest.formData();
      return normalizeEmail(form.get('email'));
    }
  } catch {
    return '';
  }

  return '';
}

async function enforceAuthRateLimit(request: Request, env: Env, clientIp: string, subPath: string): Promise<Response | null> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const isPasswordToken = method === 'POST'
    && subPath.startsWith('/auth/v1/token')
    && url.searchParams.get('grant_type') === 'password';
  const isSignup = method === 'POST' && subPath === '/auth/v1/signup';
  const isRecover = method === 'POST' && subPath === '/auth/v1/recover';
  const isOtp = method === 'POST' && subPath === '/auth/v1/otp';
  const isResend = method === 'POST' && subPath === '/auth/v1/resend';

  if (!isPasswordToken && !isSignup && !isRecover && !isOtp && !isResend) {
    return null;
  }

  let action = 'auth';
  let ipLimit = 20;
  let ipWindowMs = 60000;
  let emailLimit = 8;
  let emailWindowMs = 600000;

  if (isPasswordToken) {
    action = 'login';
    ipLimit = 10;
    ipWindowMs = 60000;
    emailLimit = 6;
    emailWindowMs = 600000;
  } else if (isSignup) {
    action = 'signup';
    ipLimit = 5;
    ipWindowMs = 600000;
    emailLimit = 3;
    emailWindowMs = 3600000;
  } else if (isRecover || isResend || isOtp) {
    action = isRecover ? 'recover' : isResend ? 'resend' : 'otp';
    ipLimit = 5;
    ipWindowMs = 600000;
    emailLimit = 3;
    emailWindowMs = 3600000;
  }

  const ipCheck = await checkRateLimit(env, `${clientIp}:auth:${action}:ip:v1`, ipLimit, ipWindowMs);
  if (!ipCheck.allowed) {
    console.info(`auth ${action} blocked by IP rate limit`);
    return rateLimitResponse(ipCheck.resetAt);
  }

  const email = await getRequestEmail(request);
  if (email) {
    const emailHash = await sha256Hex(email);
    const emailCheck = await checkRateLimit(env, `email:${emailHash}:auth:${action}:v1`, emailLimit, emailWindowMs);
    if (!emailCheck.allowed) {
      console.info(`auth ${action} blocked by email rate limit`);
      return rateLimitResponse(emailCheck.resetAt);
    }
  }

  return null;
}

function extractIdFromSlug(slug: string): string {
  if (!slug) return ''
  const parts = slug.split('-')
  if (parts.length >= 5) {
    const uuidCandidate = parts.slice(-5).join('-')
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(uuidCandidate)) {
      return uuidCandidate
    }
  }
  return slug
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function getEmailConfirmedAt(email: string, env: Env): Promise<string | null> {
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const response = await fetch(
        `${env.VITE_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json() as any;
        const users = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
        const user = users.find((item: any) => normalizeEmail(item?.email) === email) || users[0];
        return user?.email_confirmed_at || user?.confirmed_at || null;
      }

      console.warn('Could not query auth user with service role:', response.status);
    } catch (error) {
      console.warn('Error checking email confirmation status with service role:', error);
    }
  }

  if (!env.SUPABASE_MANAGEMENT_TOKEN || !env.SUPABASE_PROJECT_ID) {
    return null;
  }

  try {
    const safeEmail = email.replace(/'/g, "''");
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${encodeURIComponent(env.SUPABASE_PROJECT_ID)}/database/query/read-only`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_MANAGEMENT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `select email_confirmed_at from auth.users where lower(email) = lower('${safeEmail}') order by created_at desc limit 1;`,
        }),
      }
    );

    if (!response.ok) {
      console.warn('Could not query auth user confirmation status:', response.status);
      return null;
    }

    const data = await response.json() as any;
    const rows = Array.isArray(data)
      ? data
      : Array.isArray(data?.result)
        ? data.result
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.rows)
            ? data.rows
            : Array.isArray(data?.result?.rows)
              ? data.result.rows
              : [];
    const row = Array.isArray(rows) ? rows[0] : null;
    return row?.email_confirmed_at || null;
  } catch (error) {
    console.warn('Error checking email confirmation status:', error);
    return null;
  }
}

async function sendAlreadyConfirmedEmail(email: string, env: Env): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not configured; skipping already-confirmed email.');
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Cubitat <notificaciones@cubitathome.com>',
      to: [email],
      subject: 'Tu correo ya esta confirmado en Cubitat',
      html: `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f4f7f6;color:#10231f;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f6;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dce6e2;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px;color:#60716e;font-size:16px;line-height:1.55;">
                <p style="margin:0 0 12px;color:#006b5d;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Cubitat</p>
                <h1 style="margin:0 0 16px;color:#10231f;font-size:26px;line-height:1.15;">Tu correo ya esta confirmado</h1>
                <p style="margin:0 0 18px;">Recibimos una solicitud para reenviar la confirmacion, pero este correo ya esta confirmado en Cubitat.</p>
                <p style="margin:0 0 26px;">Puedes iniciar sesion con tu contrasena. Si no la recuerdas, usa la opcion de recuperar contrasena.</p>
                <p style="margin:0;font-size:13px;color:#8a9895;">Si no fuiste tu, puedes ignorar este mensaje.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    }),
  });

  if (!response.ok) {
    console.warn('Resend already-confirmed email failed:', response.status, await response.text());
  }
}

async function resendSignupConfirmation(email: string, env: Env): Promise<void> {
  await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/resend`, {
    method: 'POST',
    headers: {
      'apikey': env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'signup',
      email,
      options: {
        email_redirect_to: 'https://cubitathome.com/auth/callback',
      },
    }),
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    
    // Redirigir siempre de HTTP a HTTPS (solo en producción) y de www a la raíz para consolidar SEO
    let shouldRedirect = false;
    const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
    if (proto === 'http' && !isLocal) {
      url.protocol = 'https:';
      shouldRedirect = true;
    }
    
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.replace('www.', '');
      shouldRedirect = true;
    }

    if (shouldRedirect) {
      return new Response(null, {
        status: 301,
        headers: {
          'Location': url.toString()
        }
      });
    }

    const path = url.pathname;

    // Endpoint interno para moderación con IA
    if (path === '/api/ai-moderate' && request.method === 'POST') {
      let body: any;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON' }, 400);
      }

      const authHeader = request.headers.get('Authorization') || '';
      const user = await getAuthenticatedUser(authHeader, env);
      if (!user) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      if (!body.property_id || !uuidRegex.test(body.property_id)) {
        return jsonResponse({ error: 'Invalid property_id' }, 400);
      }

      const allowed = await canModerateProperty(body.property_id, user.id, authHeader, env);
      if (!allowed) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      // Proceso de fondo para no colgar el cliente
      async function moderateBackground(body: any, authHeader: string, env: Env) {
        try {
          if (!body.property_id) return; // Si no hay ID, no podemos actualizar
          
          if (!env.GROQ_API_KEY) {
            await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/set_property_ai_moderation`, {
              method: 'POST',
              headers: {
                'apikey': env.VITE_SUPABASE_ANON_KEY,
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                p_property_id: body.property_id,
                p_status: 'pending_review',
                p_message: 'IA deshabilitada. Pendiente de revisión manual.'
              })
            });
            return;
          }
          
          const systemPrompt = `Eres un moderador experto de bienes raíces en Cuba para la plataforma Cubitat. 
Tu tarea es analizar el siguiente anuncio y determinar si cumple con las reglas (sin lenguaje ofensivo, sin spam evidente, precio razonable, descripción coherente).
IMPORTANTE: Si se adjuntan imágenes, analízalas también. Rechaza el anuncio si las imágenes contienen desnudos, violencia, contenido irrelevante que no sea de propiedades, o exceso de texto promocional (spam).
Responde Únicamente con un objeto JSON válido, sin texto adicional, con exactamente estas dos propiedades:
"status": "ai_approved" o "ai_rejected".
"reason": Una breve explicación de por qué lo aprobaste o rechazaste. Incluye una descripción breve de las imágenes si se adjuntaron.`;

          const userContent: any[] = [
            {
              type: 'text',
              text: `Título: ${body.title}\nUbicación: ${body.location}\nDescripción: ${body.description}\nPrecio: ${body.price_usd} USD\nTipo: ${body.property_type}`
            }
          ];

          if (body.images && Array.isArray(body.images)) {
            const imagesToProcess = body.images.slice(0, 5); // Groq soporta hasta 5 imágenes
            
            for (const dataUrl of imagesToProcess) {
              if (typeof dataUrl === 'string') {
                if (dataUrl.startsWith('data:image/')) {
                  userContent.push({
                    type: 'image_url',
                    image_url: { url: dataUrl }
                  });
                } else if (dataUrl.startsWith(`${env.VITE_SUPABASE_URL}/storage/v1/object/public/property_images/`)) {
                  try {
                    const imgRes = await fetch(dataUrl);
                    if (imgRes.ok) {
                      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
                      const arrayBuffer = await imgRes.arrayBuffer();
                      if (arrayBuffer.byteLength > 100) {
                        let binary = '';
                        const bytes = new Uint8Array(arrayBuffer);
                        const chunkSize = 8192;
                        for (let i = 0; i < bytes.byteLength; i += chunkSize) {
                          const chunk = bytes.subarray(i, i + chunkSize);
                          binary += String.fromCharCode.apply(null, Array.from(chunk));
                        }
                        const base64Data = btoa(binary);
                        userContent.push({
                          type: 'image_url',
                          image_url: { url: `data:${contentType};base64,${base64Data}` }
                        });
                      }
                    }
                  } catch (e) {
                    console.warn('Error fetching remote image for AI:', e);
                  }
                }
              }
            }
          }

          let finalStatus = 'pending_review';
          let finalReason = '';

          try {
            const groqApiKey = (env.GROQ_API_KEY || '').trim().replace(/[\r\n]/g, '');
            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqApiKey}`
              },
              body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userContent }
                ],
                temperature: 0.1,
                max_tokens: 512,
                response_format: { type: 'json_object' }
              })
            });

            const groqJson = await groqRes.json() as any;

            if (!groqRes.ok) {
              finalStatus = 'pending_review';
              if (groqRes.status === 429) {
                finalReason = 'Servicio de IA temporalmente saturado. Pendiente de revisión manual.';
              } else {
                finalReason = `Error de API de IA (${groqRes.status}): ${groqJson?.error?.message || 'Desconocido'}`;
              }
            } else {
              const rawText = groqJson?.choices?.[0]?.message?.content || '';
              if (rawText) {
                try {
                  const cleanText = rawText.replace(/```(?:json)?/gi, '').trim();
                  const aiResult = JSON.parse(cleanText);
                  finalStatus = aiResult.status || 'pending_review';
                  finalReason = aiResult.reason || '';
                } catch(e: any) {
                  finalStatus = 'pending_review';
                  finalReason = 'Fallo al interpretar respuesta de IA. Pendiente de revisión manual.';
                }
              } else {
                finalStatus = 'pending_review';
                finalReason = 'No hay texto en IA. Pendiente de revisión manual.';
              }
            }
          } catch (e: any) {
            finalStatus = 'pending_review';
            finalReason = 'Fallo de conexión con IA. Pendiente de revisión manual.';
          }

          await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/set_property_ai_moderation`, {
            method: 'POST',
            headers: {
              'apikey': env.VITE_SUPABASE_ANON_KEY,
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              p_property_id: body.property_id,
              p_status: finalStatus,
              p_message: finalReason
            })
          });

        } catch (error) {
          console.error("Error en moderateBackground:", error);
        }
      }

      ctx.waitUntil(moderateBackground(body, authHeader, env));

      return new Response(JSON.stringify({ status: 'processing', reason: 'Moderación iniciada en segundo plano.' }), { 
        status: 202, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Endpoint interno para obtener las métricas de plataformas usando APIs directamente
    if (path === '/api/metrics') {
      const authHeader = request.headers.get('Authorization') || '';
      const user = await getAuthenticatedUser(authHeader, env);
      if (!user) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      const role = await getUserRole(user.id, authHeader, env);
      if (role !== 'admin') {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      // 1. Fetch Cloudflare Metrics (si tenemos los tokens)
      let cloudflareData = { requests: null as number | null, error: 'Falta configurar CF_API_TOKEN y CF_ACCOUNT_ID' };
      if (env.CF_API_TOKEN && env.CF_ACCOUNT_ID) {
        try {
          const date = new Date();
          const todayStr = date.toISOString().split('T')[0] + 'T00:00:00Z'; // Inicio del dia UTC
          const cfQuery = `
            query {
              viewer {
                accounts(filter: {accountTag: "${env.CF_ACCOUNT_ID}"}) {
                  workersInvocationsAdaptive(limit: 10000, filter: {datetime_geq: "${todayStr}"}) {
                    sum { requests }
                  }
                }
              }
            }
          `;
          const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.CF_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
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

      // 2. Supabase API doesn't expose usage metrics publicly
      let supabaseData = { storage_bytes: null as number | null, egress_bytes: null as number | null, db_bytes: null as number | null, error: 'Falta configurar SUPABASE_MANAGEMENT_TOKEN y SUPABASE_PROJECT_ID' };
      if (env.SUPABASE_MANAGEMENT_TOKEN && env.SUPABASE_PROJECT_ID) {
        supabaseData = {
          db_bytes: null,
          storage_bytes: null,
          egress_bytes: null,
          error: 'Usa el dashboard de Supabase para ver el ancho de banda y storage real.'
        };
      }

      // 3. Mock Analytics for now
      const responseBody = {
        cloudflare: cloudflareData,
        supabase: supabaseData,
        analytics: { activeUsers: null, error: 'Integración GA pendiente de Service Account' },
      };

      return new Response(JSON.stringify(responseBody), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/api/auth/resend-confirmation' && request.method === 'POST') {
      const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      if (await isRateLimited(env, `${clientIp}:resend-confirmation:v2`, 5, 600000)) {
        console.info('resend-confirmation skipped by rate limit');
        return jsonResponse({ ok: true });
      }

      let body: any;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: true });
      }

      const email = normalizeEmail(body?.email);
      if (!isValidEmail(email)) {
        return jsonResponse({ ok: true });
      }

      const confirmedAt = await getEmailConfirmedAt(email, env);
      if (confirmedAt) {
        console.info('resend-confirmation sending already-confirmed email');
        await sendAlreadyConfirmedEmail(email, env);
      } else {
        console.info('resend-confirmation requesting signup confirmation email');
        await resendSignupConfirmation(email, env);
      }

      return jsonResponse({ ok: true });
    }

// 1. Interceptar solicitudes de API de Supabase Proxy
    if (path.startsWith('/api/supabase/')) {
      const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      const method = request.method;
      const subPath = path.replace('/api/supabase', '');

      // ── Lista blanca de tablas y métodos permitidos ──
      const authHeader = request.headers.get('Authorization') || '';
      const authenticated = authHeader.startsWith('Bearer ') && authHeader !== 'Bearer dummy-key-safe-from-browsers';

      const allowedWriteTables = ['properties', 'property_reports', 'notifications', 'search_alerts', 'saved_properties'];

      const restMatch = subPath.match(/^\/rest\/v1\/([^/?]+)/);
      const tableName = restMatch ? restMatch[1] : null;

      const authRateLimitResponse = await enforceAuthRateLimit(request, env, clientIp, subPath);
      if (authRateLimitResponse) {
        return authRateLimitResponse;
      }

      // Bloquear métodos mutantes (PATCH, PUT, DELETE) a menos que sea una tabla permitida y usuario autenticado
      if (method === 'DELETE' || method === 'PATCH') {
        if (!tableName || !allowedWriteTables.includes(tableName) || !authenticated) {
          return jsonResponse({ error: 'Operación no permitida.' }, 403);
        }
      }

      // Bloquear POST a tablas no permitidas
      if (method === 'POST' && tableName && !allowedWriteTables.includes(tableName)) {
        return jsonResponse({ error: 'Operación no permitida.' }, 403);
      }

      // Rate limiting por tipo de operación
      // 1. Denuncias (POST a property_reports) - Máximo 3 cada 5 minutos
      if (method === 'POST' && tableName === 'property_reports') {
        const key = `${clientIp}:reports`;
        if (await isRateLimited(env, key, 3, 300000)) {
          return new Response(
            JSON.stringify({ error: 'Límite de denuncias excedido. Por favor, intenta de nuevo más tarde.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '300'
              }
            }
          );
        }
      }
      // 2. Publicaciones (POST a properties) - Máximo 5 cada 10 minutos
      else if (method === 'POST' && tableName === 'properties') {
        const key = `${clientIp}:publish`;
        if (await isRateLimited(env, key, 5, 600000)) {
          return new Response(
            JSON.stringify({ error: 'Límite de publicaciones excedido. Por favor, intenta de nuevo más tarde.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '600'
              }
            }
          );
        }
      }
      // 3. Subida de Imágenes (POST/PUT a storage/v1/object/*) - Máximo 40 cada 10 minutos
      else if ((method === 'POST' || method === 'PUT') && subPath.startsWith('/storage/v1/object/')) {
        const key = `${clientIp}:storage`;
        if (await isRateLimited(env, key, 40, 600000)) {
          return new Response(
            JSON.stringify({ error: 'Límite de subida de imágenes excedido. Por favor, intenta de nuevo más tarde.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '600'
              }
            }
          );
        }
      }
      // 4. Límite general (GET, OPTIONS, etc.) - evita falsos positivos en navegación pública
      else {
        const key = `${clientIp}:general`;
        if (await isRateLimited(env, key, 300, 60000)) {
          return new Response(
            JSON.stringify({ error: 'Límite de peticiones excedido. Demasiadas solicitudes.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '60'
              }
            }
          );
        }
      }

      const supabaseUrl = env.VITE_SUPABASE_URL || "https://tohjzoncoosvjbjcakdl.supabase.co";
      let targetUrl = request.url.replace(
        url.origin + '/api/supabase',
        supabaseUrl
      );

      if (subPath.startsWith('/realtime/')) {
        const realtimeUrl = new URL(targetUrl);
        if (realtimeUrl.searchParams.get('apikey') === 'dummy-key-safe-from-browsers') {
          realtimeUrl.searchParams.set('apikey', env.VITE_SUPABASE_ANON_KEY);
          targetUrl = realtimeUrl.toString();
        }
      }

      const headers = new Headers(request.headers);
      headers.delete('host');

      // Inyectar la Anon Key real si falta o es la clave dummy en el cliente
      const apiKeyHeader = headers.get('apikey');

      if (!apiKeyHeader || apiKeyHeader === 'dummy-key-safe-from-browsers') {
        headers.set('apikey', env.VITE_SUPABASE_ANON_KEY);
      }

      if (!authHeader || authHeader === 'Bearer dummy-key-safe-from-browsers') {
        headers.set('Authorization', `Bearer ${env.VITE_SUPABASE_ANON_KEY}`);
      }

      const fetchOptions: RequestInit = {
        method: request.method,
        headers: headers,
        redirect: 'manual'
      };

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        fetchOptions.body = request.body;
      }

      const response = await fetch(targetUrl, fetchOptions);

      if (response.status >= 300 && response.status < 400) {
        const redirectUrl = response.headers.get('Location') || response.headers.get('location');
        if (redirectUrl) {
          return new Response(null, {
            status: response.status,
            headers: {
              'Location': redirectUrl
            }
          });
        }
      }

      return withSecurityHeaders(response);
    }

    // Interceptar solicitudes a la página de detalles: /propiedad/uuid o /propiedad/slug-uuid
    const match = path.match(/^\/propiedad\/([^\/]+)/);

    if (match) {
      const slug = match[1];
      const propertyId = extractIdFromSlug(slug);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(propertyId)) {
        try {
          const cache = (caches as any).default;
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          const supabaseUrl = env.VITE_SUPABASE_URL || "https://tohjzoncoosvjbjcakdl.supabase.co";
          const supabaseKey = env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaGp6b25jb29zdmpiamNha2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTY1OTgsImV4cCI6MjA5ODM3MjU5OH0.ytR4ykmBVrUh4hvPDKWpQdbTcM42_owdKEGiwta1pqo";

          // Consultar la propiedad de manera asíncrona usando la API REST pública de Supabase
          const supabaseResponse = await fetch(
            `${supabaseUrl}/rest/v1/properties?id=eq.${propertyId}&select=title,description,cover_image,price_usd`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            }
          );

          if (supabaseResponse.ok) {
            const properties = await supabaseResponse.json() as any[];
            if (properties && properties.length > 0) {
              const property = properties[0];
              const price = property.price_usd 
                ? `USD ${property.price_usd.toLocaleString('en-US')}` 
                : 'Precio no informado';
              
              const title = `${property.title} - ${price}`;
              const description = property.description 
                ? `${property.description.slice(0, 150)}... Contacto en Cubitat.`
                : 'Encuentra propiedades en venta y renta en Cuba con Cubitat.';
              const image = property.cover_image || '';

              // Obtener el HTML estático base desde el manejador de activos
              const assetResponse = await env.ASSETS.fetch(request);

              // Re-escribir las etiquetas HTML usando HTMLRewriter al vuelo
              // @ts-ignore
              const rewritten = new HTMLRewriter()
                .on('meta[property="og:title"]', {
                  element(el: any) {
                    el.setAttribute('content', title);
                  }
                })
                .on('meta[name="twitter:title"]', {
                  element(el: any) {
                    el.setAttribute('content', title);
                  }
                })
                .on('meta[property="og:description"]', {
                  element(el: any) {
                    el.setAttribute('content', description);
                  }
                })
                .on('meta[name="twitter:description"]', {
                  element(el: any) {
                    el.setAttribute('content', description);
                  }
                })
                .on('meta[property="og:image"]', {
                  element(el: any) {
                    el.setAttribute('content', image);
                  }
                })
                .on('meta[name="twitter:image"]', {
                  element(el: any) {
                    el.setAttribute('content', image);
                  }
                })
                .on('meta[property="og:url"]', {
                  element(el: any) {
                    el.setAttribute('content', url.toString());
                  }
                })
                .on('meta[property="og:type"]', {
                  element(el: any) {
                    el.setAttribute('content', 'article');
                  }
                })
                .on('title', {
                  element(el: any) {
                    el.setInnerContent(title);
                  }
                })
                .transform(assetResponse);

              // Configurar cabeceras de cacheo y seguridad
              const baseHeaders = new Headers(rewritten.headers);
              baseHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
              
              const rawResponse = new Response(rewritten.body, {
                status: rewritten.status,
                statusText: rewritten.statusText,
                headers: baseHeaders
              });

              const finalResponse = withSecurityHeaders(rawResponse);

              // Guardar en la caché global de Cloudflare en segundo plano
              ctx.waitUntil(cache.put(request, finalResponse.clone()));

              return finalResponse;
            }
          }
        } catch (err) {
          console.error('Error al interceptar tags dinámicos:', err);
        }
      }
    }

    // Retorno por defecto (activos estáticos normales del frontend)
    let response = await env.ASSETS.fetch(request);

    if (path === '/sw.js' || path === '/registerSW.js') {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      newHeaders.set('Pragma', 'no-cache');
      newHeaders.set('Expires', '0');
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    // Inyectar cabeceras de Content-Type con charset=utf-8 para documentos HTML
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      const newHeaders = new Headers(response.headers);
      if (!contentType.includes('charset')) {
        newHeaders.set('Content-Type', 'text/html; charset=utf-8');
      }
      newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      newHeaders.set('Pragma', 'no-cache');
      newHeaders.set('Expires', '0');
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    return withSecurityHeaders(response);
  }
};
