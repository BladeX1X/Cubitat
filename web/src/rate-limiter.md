# RateLimiter Durable Object

`RateLimiter` mantiene un contador atómico por clave y ventana fija. Una solicitud permitida incrementa el contador; una denegada conserva el valor en el límite en vez de aumentarlo, evitando que ráfagas de solicitudes bloqueadas prolonguen o amplifiquen el cupo agotado.

## Reservas compensables

Las llamadas que incluyen `reservationId` guardan ese identificador solo si la reserva fue permitida. El Worker puede solicitar `operation=release` con la misma clave e ID para decrementar una sola vez una reserva propia cuando un proveedor confirma que la operación no pasó CAPTCHA. La liberación es idempotente: ID desconocido, duplicado o vencido no cambia el contador. La lista de reservas solo crece por operaciones permitidas y se borra al vencer la ventana.

El Worker usa este mecanismo en el reenvío de confirmación: en cuentas pendientes, libera la cuota si Supabase Auth devuelve específicamente `captcha_failed`; en cuentas confirmadas, valida Turnstile antes de reservar y enviar. Los errores de proveedor que no permiten conocer el resultado de entrega conservan la reserva para reducir duplicados.

Las reservas pueden ocupar brevemente el cupo mientras Auth valida solicitudes simultáneas. Si el Durable Object no responde durante una compensación, una reserva podría permanecer hasta el vencimiento de su ventana. Los llamadores deben fallar de forma segura, y las claves nunca deben contener datos personales en claro.
