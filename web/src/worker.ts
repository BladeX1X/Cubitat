interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  SUPABASE_MANAGEMENT_TOKEN?: string;
  SUPABASE_PROJECT_ID?: string;
  GA_SERVICE_ACCOUNT_JSON?: string;
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
}

const rateLimitCache = new Map<string, { count: number; resetTime: number }>();
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
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

function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitCache.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitCache.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  record.count++;
  if (record.count > limit) {
    return true;
  }
  return false;
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

    // 1. Interceptar solicitudes de API de Supabase Proxy
    if (path.startsWith('/api/supabase/')) {
      const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
      const method = request.method;
      const subPath = path.replace('/api/supabase', '');

      // 1. Denuncias (POST a rest/v1/property_reports) - Máximo 3 cada 5 minutos (300,000 ms)
      if (method === 'POST' && subPath.startsWith('/rest/v1/property_reports')) {
        const key = `${clientIp}:reports`;
        if (isRateLimited(key, 3, 300000)) {
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
      // 2. Publicaciones (POST a rest/v1/properties) - Máximo 5 cada 10 minutos (600,000 ms)
      else if (method === 'POST' && subPath.startsWith('/rest/v1/properties')) {
        const key = `${clientIp}:publish`;
        if (isRateLimited(key, 5, 600000)) {
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
      // 3. Subida de Imágenes (POST/PUT a storage/v1/object/*) - Máximo 40 cada 10 minutos (600,000 ms)
      else if ((method === 'POST' || method === 'PUT') && subPath.startsWith('/storage/v1/object/')) {
        const key = `${clientIp}:storage`;
        if (isRateLimited(key, 40, 600000)) {
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
      // 4. Límite general (GET, OPTIONS, etc.) - Máximo 100 cada 1 minuto (60,000 ms)
      else {
        const key = `${clientIp}:general`;
        if (isRateLimited(key, 100, 60000)) {
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
      const targetUrl = request.url.replace(
        url.origin + '/api/supabase',
        supabaseUrl
      );

      const headers = new Headers(request.headers);
      headers.delete('host');

      // Inyectar la Anon Key real si falta o es la clave dummy en el cliente
      const apiKeyHeader = headers.get('apikey');
      const authHeader = headers.get('Authorization');
      
      console.log(JSON.stringify({
        message: 'supabase proxy request',
        path,
        method,
        hasApiKeyHeader: Boolean(apiKeyHeader),
        hasAuthHeader: Boolean(authHeader)
      }));

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

      // Si la respuesta es una redirección (3xx), construir una nueva respuesta de redirección limpia para el navegador
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

      return response;
    }

    // Interceptar solicitudes a la página de detalles: /propiedad/uuid o /propiedad/slug-uuid
    const match = path.match(/^\/propiedad\/([^\/]+)/);

    if (match) {
      const slug = match[1];
      const propertyId = extractIdFromSlug(slug);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(propertyId)) {
        try {
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
            return new HTMLRewriter()
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
    if (contentType.includes('text/html') && !contentType.includes('charset')) {
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Content-Type', 'text/html; charset=utf-8');
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    return response;
  }
};
