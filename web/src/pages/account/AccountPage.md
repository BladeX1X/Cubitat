# Centro de cuenta

## Diseño responsive

- Las secciones de datos de cuenta pueden encogerse dentro de la columna de
  contenido (`min-w-0`).
- Los correos se parten dentro de su contenedor para evitar desbordamiento
  horizontal en móviles estrechos, incluidos viewports de 320 px.
- Mantener etiquetas y acciones legibles; no ocultar datos para resolver el
  desbordamiento.

## Verificación

`AccountPage.test.tsx` comprueba el ajuste de correos largos en la cuenta. La
revisión de viewport autenticado y contenido remoto se documenta por separado;
las pruebas de componente no sustituyen esa comprobación visual.
