# MAIN-P2-018 — Actions fijadas a SHA inmutable

Fecha: 2026-10-30 (CDMX)
Estado: integrado en `main` mediante PR #172, merge commit `06305c169775ed31ac66d9b21dcf647b5c80f97b`.
Entornos Supabase/Cloudflare: no consultados ni modificados.

## Hallazgo

Los workflows de GitHub Actions referenciaban Actions de terceros con etiquetas
móviles (`@v4` y `@v3`). Una etiqueta puede apuntar a otro código en el futuro.

## Cambio

Se fijaron todas las referencias `uses:` encontradas en `.github/workflows/` a
commits completos obtenidos al resolver las etiquetas estables de sus
repositorios oficiales. Se conserva la versión como comentario para facilitar
la revisión de Dependabot:

| Action | Versión | SHA fijado |
|---|---|---|
| `actions/checkout` | `v4.4.0` | `11d5960a326750d5838078e36cf38b85af677262` |
| `actions/setup-node` | `v4.4.0` | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| `actions/upload-artifact` | `v4.6.2` | `ea165f8d65b6e75b540449e92b4886f43607fa02` |
| `supabase/setup-cli` | `v3.0.1` | `45a513f8c64c0bc8e0e3dfe572b5c95be85f6359` |

Dependabot para `github-actions` ya está configurado semanalmente en
`.github/dependabot.yml`; los comentarios de versión permiten proponer nuevas
versiones sin volver a usar referencias móviles.

## Validación y límites

- Los cuatro SHAs se verificaron resolviendo las etiquetas Git oficiales vía
  GitHub API. La validación estática confirma que cada referencia `uses:` tiene
  un SHA hexadecimal de 40 caracteres y que no quedan etiquetas `@vN`.
- `git diff --check` pasa.
- CI `quality` y `database-security` PASS en dos ejecuciones completas.
- No se ejecutó el workflow de backup ni los workflows que contienen secretos
  de producción.
- No se inspeccionaron artefactos de backup ni se consultaron secretos.

Esto fija el código de las Actions referenciadas; no crea protección de rama ni
resuelve otros controles de los workflows con secretos.
