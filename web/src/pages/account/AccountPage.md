# Centro de cuenta

## Diseño responsive

- Las secciones de datos de cuenta pueden encogerse dentro de la columna de
  contenido (`min-w-0`).
- La navegación compartida del área privada muestra Cuenta, Favoritos,
  Publicaciones y, cuando están habilitados, Mis servicios y Mis materiales.
  El Panel de Agente permanece en todos los submenús para roles agente/admin;
  la ruta del panel valida la verificación antes de mostrar sus datos. En móvil,
  los mismos accesos aparecen en una barra horizontal desplazable.
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
