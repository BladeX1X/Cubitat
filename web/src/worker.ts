interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

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
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

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
      
      console.log('Worker Proxy Request:', {
        path,
        method,
        apiKeyHeader,
        authHeader,
        envKeyLength: env.VITE_SUPABASE_ANON_KEY ? env.VITE_SUPABASE_ANON_KEY.length : 0,
        envKeyStart: env.VITE_SUPABASE_ANON_KEY ? env.VITE_SUPABASE_ANON_KEY.substring(0, 10) : 'none'
      });

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

    return response;
  }
};
