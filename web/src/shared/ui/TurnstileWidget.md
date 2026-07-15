# TurnstileWidget

## Responsabilidad

`TurnstileWidget` integra el desafio administrado de Cloudflare en formularios
publicos. El navegador obtiene el token del widget y los formularios lo validan
mediante el Worker `siteverify`; el secreto nunca se expone al cliente.

## Contrato

- `action`: identifica el flujo protegido, por ejemplo `contact-owner`.
- `onVerify`: recibe el token cuando Cloudflare completa el desafio.
- `onExpire`: invalida el token cuando expira.
- `onError`: permite limpiar el token y mostrar un error recuperable.
- `theme`: selecciona el tema visual de Cloudflare.

## Ciclo de vida

El widget se monta una sola vez por combinación de `action` y `theme`. Los
callbacks se conservan en referencias actualizables para que un render del
formulario no elimine y vuelva a crear un desafio ya aprobado. Al desmontar el
componente se elimina la instancia de Turnstile y se cancela la espera del
script externo.

## Seguridad

- La sitekey es publica; el secreto permanece únicamente en el Worker.
- El navegador no llama directamente al endpoint privado de Cloudflare.
- Un formulario solo ejecuta su handler existente después de recibir
  `success: true` del Worker de verificación.
- Cada integración conserva un `action` explícito para trazabilidad.

## Verificación

`TurnstileWidget.test.tsx` reproduce una actualización del formulario desde
`onVerify` y comprueba que no se renderice una segunda instancia ni se elimine
el desafío aprobado.
