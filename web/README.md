# Cubitat web

Aplicacion web de Cubitat construida con React + Vite + TypeScript.

## Enfoque de Fase 1

- PWA mobile-first.
- Arquitectura modular.
- Mapa open source desacoplado por adaptadores.
- Datos mock iniciales listos para migrar a Supabase.
- Experiencia de busqueda tipo portal inmobiliario.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Flujo de ramas

- La rama de trabajo para cambios de desarrollo es `dev`.
- `main` queda como rama estable para codigo probado y listo para produccion.
- Antes de subir, fusionar o publicar cambios en `main` en GitHub, hay que pedir confirmacion explicita del usuario.

Flujo recomendado para pruebas:

```bash
git switch dev
# hacer cambios y validar
npm run build
git push origin dev
```

Cuando una mejora este validada en `dev`, crear PR hacia `main` o pedir confirmacion explicita antes de fusionar/publicar en `main`.

## Optimizaciones de performance aplicadas

Cambios aplicados en el commit `perf: optimize initial web load`:

- Se movio la carga de Google Fonts desde `@import` en CSS hacia `index.html` con `preconnect` y `display=swap`.
- Se agrego `preconnect` para `images.unsplash.com` y `preload` para la imagen hero actual.
- Las imagenes de tarjetas y provincias pasaron de `background-image` a `<img>` para habilitar `loading`, `decoding` y prioridad selectiva.
- `ResultsPage`, paginas secundarias, modales de auth y menu de usuario cargan con `React.lazy`.
- Solo las primeras 4 tarjetas visibles priorizan su imagen principal; el resto queda lazy.

Resultado de build medido:

- Bundle inicial antes: `669.13 kB`.
- Bundle inicial despues: `446.77 kB`.
- Reduccion aproximada: `222.36 kB` (`33.2%`).

Estado del ultimo informe Unlighthouse revisado en `http://localhost:5678/`:

- Performance promedio: `60.6/100` en 29 URLs.
- Promedios: FCP `2.74 s`, LCP `10.06 s`, CLS `0.204`, TBT `91 ms`, Speed Index `7.60 s`.
- Cuello de botella pendiente: LCP alto en todas las URLs.
- Riesgo pendiente: CLS alto en varias paginas de resultados.
- Siguiente foco recomendado: imagen/contenido LCP, estabilidad de layout en resultados y optimizacion de render inicial de listados.

## Estructura

```text
src/
  app/               # CubitatApp (orquestador principal)
  shared/            # Componentes UI compartidos (Button, Input, etc.)
  modules/
    properties/      # PropertyCard, tipos de propiedad
    search/          # SearchBar, FilterBar, tipos de filtros
    maps/            # PropertyMap, adaptadores (MapLibre, SVG)
    auth/            # LoginModal, autenticación Supabase
    admin/           # Panel de administración
    contact/         # Contacto con anunciantes
    referrals/       # Sistema de referidos
  pages/
    home/            # HomePage (portada con hero + 16 provincias)
    results/         # ResultsPage (grid paginado 16 items)
    detail/          # DetailPage (slug SEO + breadcrumbs + similares)
    publish/         # PublishPage (wizard 8 pasos + autoguardado)
    my-properties/   # MyPropertiesPage (gestión CRUD del usuario)
```

El resto de la aplicacion usa `PropertyMap`; el proveedor real del mapa queda encapsulado en `modules/maps/adapters`.

Proveedor actual: `MapLibre GL JS` con tiles de `OpenFreeMap`. Si luego se decide autohospedar mapas o cambiar de proveedor, el cambio debe quedar contenido dentro del modulo `modules/maps`.

## Correo transaccional con Resend

Cubitat usa Supabase Auth para confirmacion de email y recuperacion de contrasena. El proveedor elegido para SMTP es Resend.

Guia completa:

```txt
../docs/ADR-001-Email-Provider.md
```

Archivos relevantes:

- `supabase/config.toml`
- `supabase/templates/confirmation.html`
- `supabase/templates/recovery.html`
- `supabase/templates/password_changed_notification.html`
- `.env.example`

Comando util para verificar Resend CLI:

```bash
npx --yes resend-cli@latest doctor
```

Pruebas limitadas antes de verificar dominio:

- Usar `onboarding@resend.dev` como remitente temporal solo para pruebas por API.
- Confirmar con `npx --yes resend-cli@latest domains list --json` si el dominio ya esta verificado.
- No usar `notificaciones@cubitat.com` hasta que `cubitat.com` tenga SPF/DKIM/DMARC verificados en Resend.
- No activar Resend SMTP en Supabase Auth hasta verificar dominio; Resend exige dominio verificado para SMTP.
- Si Supabase falla con `Error sending confirmation email`, no es fallo del frontend: falta dominio verificado o hay que volver temporalmente al proveedor de correo por defecto de Supabase.

Script de prueba limitada:

```powershell
.\scripts\test-resend-email.ps1 -To "pochiprats18@gmail.com"
```

Este script pide la API key de forma temporal y no la guarda en el repo.

Conectar Supabase remoto con Resend via CLI:

```powershell
.\scripts\push-supabase-resend-smtp.ps1
```

No usar este script hasta verificar `cubitat.com` o `mail.cubitat.com` en Resend. Para el estado temporal, Supabase Auth queda con confirmacion activa y SMTP externo desactivado.

Importante: no guardar `RESEND_API_KEY` real en el repositorio.

### Alertas de búsqueda por correo (Fase 2, solo DEV)

El Cron Worker reclama alertas pendientes desde Supabase y las entrega mediante
la API de Resend. Para probarlo en DEV se requieren bindings separados de
producción:

- `VITE_SUPABASE_URL`: URL del proyecto Supabase DEV accesible por el Worker.
- `SUPABASE_SERVICE_ROLE_KEY`: secreto del proyecto Supabase DEV.
- `RESEND_API_KEY`: secreto de Resend limitado a pruebas.
- `ALERT_EMAIL_FROM`: remitente DEV, por ejemplo
  `Cubitat DEV <onboarding@resend.dev>` mientras no exista un dominio verificado.
- `PUBLIC_SITE_URL`: URL pública que se incluirá en el correo.
- `ALERT_EMAIL_PROVIDER_URL`: opcional; permite usar un capturador HTTP local.

La configuración dedicada `wrangler.phase2-dev.jsonc` conserva intencionalmente
`https://dev-supabase.invalid` como marcador seguro. No desplegar el Cron hasta
reemplazarlo por un proyecto DEV real; nunca apuntarlo al Supabase productivo
para validar Fase 2. Los secretos se cargan mediante `.dev.vars.dev` en local o
`wrangler secret put <NOMBRE> --config wrangler.phase2-dev.jsonc` en Cloudflare,
y no se versionan. `wrangler.jsonc` es exclusivamente productivo y no contiene
Cron, RPC ni imports de KYC o métricas de agente.

Prueba local del handler programado:

```powershell
npx wrangler dev --config wrangler.phase2-dev.jsonc --test-scheduled
Invoke-WebRequest "http://localhost:8787/cdn-cgi/handler/scheduled?format=json"
```

Fase 2 continúa siendo exclusivamente local: Vite solo activa estos módulos
durante `npm run dev`. La configuración Wrangler separada permite probar el
Worker DEV con `wrangler dev`, pero no autoriza un despliegue.

## Login social con Google

El boton de Google del modal de login ya esta conectado a Supabase OAuth. Para terminar la activacion hay que crear el OAuth Client en Google Cloud Console y pegar `Client ID` / `Client Secret` en:

```txt
Supabase Dashboard > Authentication > Sign In / Providers > Google
```

Guia del proyecto:

```txt
../docs/OAuth-Google-Supabase.md
```

## Tareas Pendientes (TODO)

- [ ] **Configuración de Correo (SMTP):** Integrar [Resend](https://resend.com) en el panel de Supabase (`Project Settings` > `Authentication` > `SMTP Settings`) para poder activar la confirmación de correo electrónico durante el registro de usuarios. (Ver la decisión arquitectónica en [ADR-001](../docs/ADR-001-Email-Provider.md)).
- [ ] **Sistema de Notificaciones:** Implementar el sistema de Notificaciones (campanita en el header) para mostrar mensajes reales de Supabase.
- [ ] **Secciones Servicios y Productos:** Implementar contenido real para las secciones que actualmente están exportadas pero ocultas en HomePage. Reactivar en el JSX cuando estén listas.
- [ ] **Extraer Header y Footer:** Crear `components/layout/Header.tsx` y `components/layout/SiteFooter.tsx` para separar del orquestador principal.
- [ ] **React Router:** Evaluar migración cuando la cantidad de rutas crezca significativamente.
- [ ] **Imágenes propias de provincias:** Reemplazar fotos de Unsplash de las 16 provincias por imágenes controladas del proyecto.
