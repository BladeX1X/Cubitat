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
