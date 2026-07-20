# TurnstileWidget

## Responsabilidad

`TurnstileWidget` integra el desafio administrado de Cloudflare en formularios
publicos. El navegador obtiene el token del widget; en contacto y reportes lo
envia junto con el formulario al Worker principal de Cubitat. Ese Worker valida
el token mediante `siteverify` y solo entonces invoca una operacion confiable de
base de datos. El secreto y la credencial `service_role` nunca se exponen al
cliente.

## Contrato

- `action`: identifica el flujo protegido, por ejemplo `contact-owner`.
- `onVerify`: recibe el token cuando Cloudflare completa el desafio.
- `onExpire`: invalida el token cuando expira.
- `onError`: permite limpiar el token y mostrar un error recuperable.
- `theme`: selecciona el tema visual de Cloudflare.

## Ciclo de vida

El widget se monta una sola vez por combinacion de `action` y `theme`. Los
callbacks se conservan en referencias actualizables para que un render del
formulario no elimine y vuelva a crear un desafio ya aprobado. Al desmontar el
componente se elimina la instancia de Turnstile y se cancela la espera del
script externo.

## Seguridad

- La sitekey es publica; el secreto permanece unicamente en el Worker de
  verificacion.
- El navegador no llama directamente al endpoint privado de Cloudflare.
- Contacto y reportes no pueden insertar directamente en Supabase: la
  validacion y la escritura forman una unica operacion controlada por el Worker.
- El Worker exige que `success`, `hostname` y `action` coincidan con la
  solicitud antes de llamar al RPC exclusivo de `service_role`.
- Cada integracion conserva un `action` explicito para trazabilidad.
- Registro y recuperacion mantienen el flujo CAPTCHA de Supabase y se revisan
  como un parche independiente.

## Verificacion

`TurnstileWidget.test.tsx` reproduce una actualizacion del formulario desde
`onVerify` y comprueba que no se renderice una segunda instancia ni se elimine
el desafio aprobado. Las pruebas de `public-submissions` verifican el limite de
confianza entre navegador, Worker, `siteverify` y los RPCs protegidos.
