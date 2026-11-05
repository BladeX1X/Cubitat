# ServiceReviewsPanel

F4-REV se monta opcionalmente en el detalle público de F4-SVC. Recibe el UUID
opaco del perfil y el ID de la sesión actual. No consulta la tabla de perfiles.

La lectura pública solo muestra reseñas moderadas y no revela autor. El envío,
la denuncia y la solicitud de retirada usan RPC propias; las reseñas entran a
revisión antes de aparecer. Una retirada del autor quita el texto de la vista
pública y deja un registro privado para seguimiento.

La cola administrativa pertenece a `modules/admin/service-reviews` y verifica
AAL2 en cada RPC de servidor. Denunciante y autor nunca se muestran en la cola.
