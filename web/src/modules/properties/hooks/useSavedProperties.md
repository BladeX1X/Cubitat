# useSavedProperties

Proveedor compartido del estado de favoritos para catálogos, resultados, fichas y el mapa.

## Identidad y lecturas

- Los favoritos visibles pertenecen al UID de la sesión vigente; al cambiar de cuenta, los IDs anteriores no se muestran.
- Una lectura captura la revisión de mutaciones existente al iniciarse. Si un guardado o retiro ocurre mientras la consulta está pendiente, su respuesta puede ser anterior a la escritura y no se aplica. Las lecturas que terminan mientras hay una escritura activa quedan aplazadas; al terminar la última escritura de esa cuenta se solicita una lectura autoritativa.
- Una recarga de la misma cuenta conserva los favoritos actuales mientras refresca la base.

## Guardado y retiro

- `sessionReady` distingue una sesión anónima confirmada de una consulta de sesión pendiente. Los controles compartidos de favorito permanecen deshabilitados hasta conocer la identidad, para evitar prompts de acceso incorrectos en la carga inicial.
- `toggleSave` actualiza el estado de manera optimista, limita la escritura al UID capturado y revierte el cambio si la operación falla para la sesión que sigue activa.
- Si una escritura vieja falla después de cambiar de cuenta, se descarta sin alterar la cuenta nueva ni mostrar el fallo como si perteneciera a esa sesión.
- Un bloqueo inmediato por cuenta/propiedad evita duplicar escrituras al hacer doble clic; el bloqueo se libera ante éxito o error.

## Verificación

- `useSavedProperties.test.tsx` cubre cambio de cuenta, consulta obsoleta, lectura que responde antes de una escritura pendiente, reintento, cambio de sesión durante mutación y activaciones repetidas.
- `SavePropertyButton.test.tsx` verifica el estado accesible durante la consulta de sesión y la activación posterior.
