# Diseño Técnico: Configuración de PWA

## Configuración de Vite (`vite.config.ts`):
Integramos `VitePWA` configurando el modo `generateSW` para auto-registro:
```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg'],
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
        src: 'favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ]
  }
})
```

## Metatags Móviles (`index.html`):
Añadimos tags meta de iOS:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="theme-color" content="#035f53" />
<link rel="apple-touch-icon" href="/favicon.svg" />
```
