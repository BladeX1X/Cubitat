# Reglas para `web/`

Este archivo aplica a todo el contenido de `web/` y complementa el
`AGENTS.md` de la raíz.

## Lectura obligatoria

Antes de modificar código, leer completamente:

1. `../AGENTS.md`.
2. `.agents/AGENTS.md`, que contiene las reglas específicas de componentes,
   Supabase, shadcn/ui, persistencia y documentación.
3. La especificación correspondiente en `openspec/specs/<modulo>/spec.md`.
4. El archivo `.md` asociado al componente, cuando exista.

Para cambios de base de datos, Storage o RLS, leer además:

1. `supabase/DATABASE_MIGRATIONS.md`.
2. Todas las migraciones relacionadas dentro de `supabase/migrations/`.
3. `../docs/DESPLIEGUE_COMPLETO.md`.

Después de un cambio funcional o técnico verificable, seguir también la sección
"Actualización obligatoria del vault de Obsidian" de `../AGENTS.md` y modificar
solo las notas de Cubitat afectadas.

## Reglas de implementación

- Seguir TDD: especificación, prueba que falla, implementación mínima y
  refactorización.
- Mantener separación entre `app`, `shared`, `modules`, `pages` y servicios.
- `shared` no debe depender de módulos de dominio.
- Priorizar shadcn/ui para componentes nuevos.
- Mantener TypeScript estricto y evitar `any`.
- Manejar carga, éxito, vacío y error en todos los flujos asíncronos.
- Preservar diseño mobile-first, conexiones lentas, compresión WebP, carga
  diferida y comportamiento PWA/offline.
- Toda tabla nueva requiere claves, constraints, índices pertinentes, RLS y
  políticas explícitas mediante una nueva migración numerada.
- Nunca modificar el esquema de producción directamente desde el dashboard.

## Validación obligatoria

Desde `web/`:

```powershell
npm run lint
npm run test:run
npm run build
```

Para cambios en flujos críticos, ejecutar también las pruebas E2E pertinentes.
No versionar `dist/`, `reports/`, resultados de pruebas ni secretos.
