# MAIN-P2-007 — parche del toolchain de desarrollo

Fecha: 2026-10-30
Alcance: lockfile y herramientas de desarrollo; integrado a `main` por PR #154
(`b3505c8e44cce97299bc0b6c8802bc9fe7096cec`). Producción no afectada.

## Hallazgo observado al ejecutar CI

El `npm audit` del registro devolvió 19 avisos en el estado de `origin/main`,
incluidos tres de severidad alta en Vite, Happy DOM y Undici. La etapa de
`Dependency audit` detenía el workflow antes de lint, pruebas y build. La
auditoría de dependencias de producción (`npm audit --omit=dev`) devolvió cero.

## Corrección aplicada en la rama

- `npm audit fix` actualizó dependencias compatibles del lockfile, incluidas
  Vite, Vitest, Wrangler y Undici.
- Happy DOM se actualizó de la línea 20 a `^21.0.4`, el primer parche sin el
  aviso alto correspondiente. Esta dependencia solo se usa en desarrollo y
  pruebas.
- No se usó `npm audit fix --force`.

## Evidencia

- `npm audit --audit-level=high --registry=https://registry.npmjs.org`: exit 0;
  cero avisos altos/críticos. Permanecen 10 avisos de severidad baja/moderada,
  asociados sobre todo a la cadena PWA/Workbox.
- `npm audit --omit=dev`: cero vulnerabilidades.
- `npm run lint`: PASS.
- `npm run test:run`: 152 archivos, 667 PASS y 1 SKIP.
- `SITEMAP_MODE=static npm run build`: PASS; guards de producción, Worker y
  secretos PASS.

El reporte de npm sugería `--force`, que degrada `vite-plugin-pwa` a una versión
antigua. No se usó esa opción.

## Continuación: reducir avisos moderados (2026-10-30)

En una rama separada se añadieron overrides acotados a las dependencias de
desarrollo `workbox-build` y `filelist`: `glob` 14.0.2 y `minimatch` 11.0.1.
Esto elimina los avisos moderados de `glob` y `minimatch` sin reemplazar el
plugin PWA ni forzar una versión mayor no validada. El test de host local, que
ocasionalmente excedía su timeout mientras Vite iniciaba su optimizador, ahora
dispone de 15 segundos.

Evidencia en la rama, 2026-10-30:

- `npm audit`: 4 avisos bajos, 0 moderados/altos/críticos.
- `npm audit --audit-level=high`: exit 0.
- `npm audit --omit=dev --audit-level=low`: cero vulnerabilidades.
- `npm run lint`: PASS.
- `npm run test:run`: 152 archivos, 667 PASS y 1 SKIP.
- `SITEMAP_MODE=static npm run build`: PASS; guards de producción, Worker y
  secretos PASS.
- `git diff --check`: PASS.

Los cuatro avisos bajos corresponden a `deepmerge` 4.x dentro de
`@rollup/plugin-node-resolve` → Workbox. GitHub Advisory Database no ofrece una
versión corregida de `deepmerge` para ese aviso; npm propone `--force`, que
degrada `vite-plugin-pwa` y no se aplicó. MAIN-P2-007 queda parcialmente
remediado: desaparecieron todos los avisos moderados y no hay vulnerabilidades
de producción, pero persiste ese aviso bajo en herramientas de desarrollo.
El cambio aún debe pasar por revisión de PR/CI antes de considerarse integrado.
