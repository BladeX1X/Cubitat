# MAIN-P2-021 — detección y actualización de dependencias

Fecha: 2026-10-30 (CDMX)  
Estado: PR #161 integrado en `main`, commit `f7a1b81b32a6cb283fbe0c3dcaa22a9151d10d98`. CI quality y database-security PASS.
Producción: sin relación ni cambios.

## Hallazgo

En el SHA auditado no estaba `.github/dependabot.yml`, no había escaneo
programado y la API de GitHub devolvía `404 Vulnerability alerts are disabled`.

## Cambios

- En GitHub se habilitaron Dependabot alerts y Dependabot security updates. Los
  endpoints REST devolvieron `204`; consultas posteriores indicaron alertas
  habilitadas y security updates `enabled: true, paused: false`.
- Se añade `.github/dependabot.yml` con actualizaciones npm para `/web` y
  GitHub Actions para `/`, cada lunes en horario de Ciudad de México; máximo
  cinco PR abiertos por ecosistema.
- Se añade ejecución semanal al workflow `phase2-quality.yml`, que conserva
  `npm audit --audit-level=high` y ejecuta las mismas puertas de calidad.

## Validación y alcance

- Gates locales: lint PASS; Vitest 154 archivos, 677 PASS, 1 SKIP; build estático y guards PASS. CI remoto pasó en ambas ejecuciones.
- Ambos archivos versionados están presentes en `main`. El primer ciclo programado aún no se ha ejecutado.
- Settings de GitHub comprobados mediante API; el dependency graph se habilitó
  junto con las alertas. No se infiere contenido de avisos a partir del ajuste.
- No hubo despliegues ni acceso a servicios Cubitat DEV/producción.

Referencias oficiales: [Dependabot alerts y dependency graph (REST API)](https://docs.github.com/en/rest/repos/repos#enable-vulnerability-alerts), [archivo dependabot.yml](https://docs.github.com/en/code-security/concepts/supply-chain-security/about-the-dependabot-yml-file), [security updates](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-security-updates).
