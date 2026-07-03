# Convertir Aplicación en PWA con vite-plugin-pwa

## Why
El usuario quiere que el portal inmobiliario Cubitat funcione como una Aplicación Web Progresiva (PWA). Esto permite que el sitio sea instalable en dispositivos móviles/escritorio, funcione fuera de línea (offline) mediante Service Workers y cargue mucho más rápido.

## What Changes
- Instalar la dependencia de desarrollo `@vitejs/plugin-react` y `vite-plugin-pwa`.
- Configurar `vite.config.ts` para registrar el Service Worker y definir los metadatos del manifest (usando el favicon vectorial SVG para compatibilidad completa de escalado).
- Actualizar `index.html` para incluir los metatags necesarios para dispositivos móviles y de Apple iOS.
