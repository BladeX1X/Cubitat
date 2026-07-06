interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Interceptar solicitudes a la página de detalles: /propiedad/uuid
    const match = path.match(/^\/propiedad\/([^\/]+)/);

    if (match) {
      const propertyId = match[1];

      try {
        const supabaseUrl = env.VITE_SUPABASE_URL;
        const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

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
                text(textNode: any) {
                  if (textNode.lastInTextNode) {
                    textNode.replace(title);
                  }
                }
              })
              .transform(assetResponse);
          }
        }
      } catch (err) {
        console.error('Error al interceptar tags dinámicos:', err);
      }
    }

    // Retorno por defecto (activos estáticos normales del frontend)
    return env.ASSETS.fetch(request);
  }
};
