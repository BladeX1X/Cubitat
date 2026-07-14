# Diseño

## Casos de uso

1. Un administrador oculta una publicación pública con un motivo; pasa a
   `paused` y deja de aparecer públicamente.
2. Un administrador vuelve a publicar una fila `paused`.
3. Un propietario oculta su publicación pública; pasa a `owner_hidden`.
4. Solo el mismo propietario vuelve a publicar una fila `owner_hidden`.
5. El panel distingue “Oculta por moderación” de “Oculta por propietario”.

## Matriz de transiciones

| Origen | Destino | Actor autorizado |
| --- | --- | --- |
| `published` | `paused` | administrador |
| `paused` | `published` | administrador |
| `published` | `owner_hidden` | propietario de la fila |
| `owner_hidden` | `published` | propietario, sin editar contenido |
| `owner_hidden` | `pending_review` | propietario, al guardar cambios |

Admin, `service_role`, automatización y otros usuarios MUST NOT sacar una fila
de `owner_hidden`. Si el propietario la edita, el flujo existente guarda en
`pending_review` y vuelve a llamar a `/api/ai-moderate`; solo una restauración
sin cambios regresa directamente a `published`. El frontend ocultará acciones inválidas, pero un trigger
`BEFORE UPDATE OF status` será la autoridad final para impedir saltos directos.

## Datos y permisos

Se añadirá `owner_hidden` al enum `property_status`. La política RLS de edición
del propietario lo admitirá como destino no público. Un trigger validará actor,
propiedad y transición usando `auth.uid()`; no confiará en campos enviados por
el cliente.

La bitácora existente capturará las transiciones automáticamente y distinguirá
la fuente `admin` o `owner`. Los resultados públicos continuarán leyendo solo
`published`, por lo que ambos estados ocultos quedarán fuera sin cambiar las
consultas públicas.

## Interfaz modular

- `modules/admin/properties`: acciones “Ocultar con motivo” y “Volver a
  publicar”, además de filtros separados para `paused` y `owner_hidden`.
- `pages/my-properties`: acción reversible “Ocultar”/“Volver a publicar” solo
  en los dos estados relevantes, con carga y error por tarjeta.
- “Eliminar” permanece visualmente separada y conserva confirmación destructiva.

En móvil las acciones se envolverán sin desbordamiento y mantendrán icono,
texto y jerarquía visual coherentes.

## Casos borde

- Acción repetida o estado obsoleto: actualizar solo si el estado origen aún
  coincide; de lo contrario mostrar error y recargar.
- Red lenta: deshabilitar acciones de la tarjeta afectada.
- Admin intenta restaurar `owner_hidden`: el trigger rechaza la escritura.
- Worker intenta moderar `owner_hidden`: el trigger rechaza la escritura.
- Propietario edita `owner_hidden`: pasa a `pending_review` y la IA la revisa
  nuevamente antes de cualquier publicación automática.
- Otro usuario conoce el UUID: RLS y el trigger rechazan la escritura.
- Propiedad eliminada: no existe restauración; la bitácora conserva evidencia.

## Rollback

Una migración posterior puede retirar las acciones y mantener `owner_hidden`
como estado no público. Los valores de un enum PostgreSQL no se eliminan de
forma destructiva; cualquier reconciliación de filas requerirá una decisión
operativa explícita.
