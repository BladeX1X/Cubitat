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

El reporte de npm sugiere `--force` para parte de los avisos moderados, lo que
intentaría degradar `vite-plugin-pwa` a `1.1.0`. No se aplicó esa opción porque
implica un cambio rompedor no validado. MAIN-P2-007 queda **parcialmente
remediado**: el gate high/critical pasa y no hay avisos de producción; el
toolchain aún conserva avisos moderados que requieren revisar/actualizar la
cadena PWA en un cambio separado.
