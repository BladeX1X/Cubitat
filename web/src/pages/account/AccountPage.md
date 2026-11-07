# Centro de cuenta

## Diseño responsive

- Las secciones de datos de cuenta pueden encogerse dentro de la columna de
  contenido (`min-w-0`).
- La navegación lateral de Cuenta/Favoritos/Publicaciones/Panel de Agente se
  muestra desde `md`; por debajo se ofrece una barra horizontal desplazable con
  los mismos destinos para que la navegación no desaparezca al reducir la
  ventana o usar zoom del navegador.
- Los correos se parten dentro de su contenedor para evitar desbordamiento
  horizontal en móviles estrechos, incluidos viewports de 320 px.
- Mantener etiquetas y acciones legibles; no ocultar datos para resolver el
  desbordamiento.

## Estado de postulación de agente

Con Fase 3 habilitada, la cuenta consulta la postulación más reciente del usuario
mediante `agent_applications.status`, filtrada por su `user_id` y protegida por
RLS. La tarjeta muestra carga, estado, error con reintento o el CTA para una nueva
postulación si no existe una solicitud abierta. No consulta ni muestra documentos,
rutas privadas ni motivos administrativos. Si está aprobada, ofrece un acceso al
Panel de Agente.

## Verificación

`AccountPage.test.tsx` comprueba el ajuste de correos largos en la cuenta. La
prueba de estado de postulación comprueba que una cuenta en revisión ve su estado
y no recibe una invitación duplicada. La revisión de viewport autenticado y
contenido remoto se documenta por separado; las pruebas de componente no
sustituyen esa comprobación visual.
