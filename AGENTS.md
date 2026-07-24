# Instrucciones obligatorias para agentes

Este archivo es el punto de entrada de reglas para cualquier agente que trabaje
en el repositorio Cubitat. Aplica a todo el árbol del proyecto.

## Lectura obligatoria antes de actuar

Leer completamente, en este orden:

1. `.agents/AGENTS.md`: reglas generales de arquitectura, TDD, validación, Git,
   seguridad, diseño mobile-first y flujo multiagente.
2. `Cubitat - Guia Operativa Fase 1.md`: objetivo, alcance, arquitectura y
   criterios de aceptación del MVP.
3. `docs/DESPLIEGUE_COMPLETO.md`: flujo de producción, Cloudflare, Supabase,
   correo, OAuth, analítica, PWA y rollback.
4. `web/supabase/DATABASE_MIGRATIONS.md`: inventario y procedimiento vigente de
   migraciones del backend.
5. `docs/MULTI_AGENT_HANDOFF.md`: estado actual, reparto de carriles y protocolo
   para que varios agentes trabajen sin solaparse.
6. La checklist operativa de Obsidian:
   `G:\Mi unidad\Obsidian\Vault_IA_Second_Brain\02 Projects\Cubitat\Cubitat - Checklist de Lanzamiento.md`.

Si alguno de estos archivos no está disponible, el agente debe indicarlo antes
de tomar decisiones que dependan de su contenido.

## Reglas de descubrimiento del código

El proyecto mantiene un grafo mediante `codebase-memory-mcp`. Para descubrir
código, preferir en este orden:

1. `search_graph`
2. `trace_path`
3. `get_code_snippet`
4. `query_graph`
5. `get_architecture`
6. `search_code`

Usar búsqueda directa de archivos solamente para texto literal, configuración,
scripts, SQL, Markdown o cuando el grafo no tenga información suficiente.
Ejecutar `index_repository` si el proyecto no está indexado o el índice está
desactualizado.

## Antes de modificar

- Respetar las reglas adicionales del `AGENTS.md` más cercano al archivo.
- Leer la especificación en `web/openspec/specs/<modulo>/spec.md` cuando exista.
- Leer el Markdown asociado al componente antes de una refactorización o cambio
  significativo.
- No trabajar directamente en `main`. Usar una rama `feature/`, `bugfix/`,
  `hotfix/`, `docs/` o `release/` apropiada.
- No incluir secretos, `.env`, credenciales ni artefactos generados.

## Actualización obligatoria del vault de Obsidian

La documentación operativa de Cubitat está en:

```text
G:\Mi unidad\Obsidian\Vault_IA_Second_Brain\02 Projects\Cubitat\
```

El vault es documentación viva del producto, pero el repositorio continúa
siendo la fuente de verdad para código, configuración y migraciones.

### Cuándo actualizarlo

Actualizar las notas relacionadas dentro del mismo trabajo cuando ocurra alguno
de estos casos:

- Se completa o descarta una tarea del roadmap o de lanzamiento.
- Cambia el dominio, despliegue, proveedor, arquitectura o flujo de datos.
- Se crea o modifica una tabla, migración, política RLS, bucket o integración.
- Cambia un flujo de usuario, criterio de aceptación o alcance de fase.
- Se verifica una prueba real de producción, móvil, PWA, OAuth, correo o SEO.
- Aparece un riesgo, bloqueo, deuda técnica o decisión que afecte la operación.

### Notas que deben revisarse

- `Cubitat - Checklist de Lanzamiento.md`: marcar únicamente resultados
  comprobados; anotar fecha y evidencia breve.
- `Cubitat - Roadmap Fase 1.md`: reflejar cambios de alcance y avance, sin borrar
  el historial útil.
- `Cubitat - Dashboard del Proyecto.md`: mantener estado ejecutivo, bloqueos y
  próximos pasos.
- `Cubitat - Índice del Proyecto.md`: añadir o corregir enlaces a documentación.
- `Cubitat - Registro de Avance Produccion 2026-07-03.md`: no reescribir hechos
  históricos; crear una nota de avance con fecha nueva para hitos posteriores.
- La guía temática correspondiente: Supabase, dominio/DNS, PWA, mapas, hosting,
  recuperación de contraseña o métricas.

### Procedimiento

1. Verificar el resultado en código, pruebas o producción antes de marcarlo.
2. Editar solo las notas afectadas y conservar enlaces wiki `[[...]]`.
3. Usar fechas `YYYY-MM-DD` y distinguir entre `implementado`, `verificado en
   local` y `verificado en producción`.
4. Si una casilla antigua contradice evidencia actual, corregirla o señalar que
   se conserva como historial; no dejar dos estados incompatibles sin nota.
5. Registrar pendientes accionables con un criterio de cierre observable.
6. Comprobar que el archivo siga siendo Markdown UTF-8 legible y que sus enlaces
   principales no hayan sido eliminados.
7. Resumir al usuario qué notas del vault se actualizaron.

### Restricciones

- Nunca copiar secretos, tokens, contraseñas, claves privadas ni contenido de
  `.env` al vault.
- No marcar producción como verificada basándose solo en un build local.
- No inventar métricas, resultados de pruebas ni estados de proveedores.
- No convertir notas históricas en documentación actual sin conservar fecha y
  contexto.
- No hacer cambios masivos en notas personales o carpetas fuera de
  `02 Projects\Cubitat` salvo solicitud explícita del usuario.

## Criterio obligatorio de cierre

Todo cambio de código debe terminar con:

```powershell
cd web
npm run lint
npm run test:run
npm run build
```

No se considera completado un cambio si alguno falla. El agente debe corregir y
repetir el ciclo. Los cambios significativos deben actualizar su especificación,
documentación de componente, documentación técnica y checklist cuando aplique.
