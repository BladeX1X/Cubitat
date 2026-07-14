# Controles separados de visibilidad de publicaciones

## Problema

Moderación permite eliminar propiedades, pero una publicación ya publicada no
tiene una retirada reversible y claramente separada según quién la decidió. El
propietario tampoco puede retirar temporalmente su anuncio sin eliminarlo.

## Objetivo

- Permitir que moderación oculte y restaure una publicación.
- Permitir que el propietario oculte y restaure únicamente su publicación.
- Distinguir ambos orígenes mediante estados, etiquetas y filtros separados.
- Impedir en base de datos que admin, Worker o cualquier otro usuario restaure
  una publicación ocultada por su propietario.
- Conservar eliminación como acción destructiva independiente.

## Fuera de alcance

- Programar ocultamientos futuros o fechas de expiración.
- Cambiar el flujo de revisión IA de publicaciones nuevas.
- Modificar o eliminar publicaciones reales durante la verificación.
