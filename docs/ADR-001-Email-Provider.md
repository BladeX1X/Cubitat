# ADR 001: Proveedor de correos transaccionales para Cubitat

## Estado

Aceptado.

## Contexto

Cubitat usa Supabase Auth para registro, confirmacion de correo y recuperacion de contrasena. Para que esos flujos funcionen de forma estable en produccion, Supabase necesita un proveedor SMTP propio. El envio por defecto de Supabase no debe ser la base de produccion porque tiene limites y puede generar errores o baja entregabilidad.

## Decision

Usaremos **Resend** como proveedor de correo transaccional para Supabase Auth.

Resend se conectara a Supabase mediante SMTP:

- Host: `smtp.resend.com`
- Port: `465`
- User: `resend`
- Password: API key de Resend (`re_...`)
- Sender name: `Cubitat`
- Sender email recomendado: `notificaciones@cubitat.com` o `noreply@cubitat.com`

## Por que Resend

- Buena experiencia de desarrollo.
- Buen plan inicial para MVP.
- Entregabilidad adecuada para correos transaccionales.
- CLI util para verificar dominios, API keys y estado de cuenta.
- Compatible con Supabase via SMTP, sin tener que crear backend propio para emails.

## Archivos del proyecto relacionados

- `web/supabase/config.toml`: configuracion local de Supabase Auth + SMTP Resend usando variables de entorno.
- `web/.env.example`: variables necesarias sin secretos reales.
- `web/supabase/templates/confirmation.html`: plantilla de confirmacion de correo.
- `web/supabase/templates/recovery.html`: plantilla de recuperacion de contrasena.
- `web/supabase/templates/password_changed_notification.html`: notificacion de contrasena actualizada.
- `web/src/modules/auth/components/LoginModal.tsx`: registro y recuperacion disparan los correos desde Supabase.
- `web/src/pages/auth/AuthCallbackPage.tsx`: destino `/auth/callback`.
- `web/src/pages/auth/ResetPasswordPage.tsx`: destino `/recuperar-contrasena`.
- `docs/DNS-Resend-Cubitat.md`: registros DNS generados por Resend para verificar `cubitat.com`.

## Configuracion local

Copiar `web/.env.example` a `.env` y completar:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SMTP_ADMIN_EMAIL=notificaciones@cubitat.com
```

Nunca commitear la API key real de Resend.

## Configuracion en Resend con CLI

La documentacion indicada para este proyecto es:

- `https://resend.com/docs/cli`

El paquete ejecutable correcto es `resend-cli`, no `resend`.

Comprobar CLI:

```powershell
npx --yes resend-cli@latest --help
```

Login:

```powershell
npx --yes resend-cli@latest login
```

En Windows/Codex es preferible usar el script del proyecto para no escribir la API key en el chat ni dejarla en el historial:

```powershell
cd D:\Proyectos\Cubitat\web
.\scripts\setup-resend.ps1
```

El script pide `RESEND_API_KEY` con `Read-Host -AsSecureString`, ejecuta `resend login --key ...` y luego `resend doctor`.

Verificar estado:

```powershell
npx --yes resend-cli@latest doctor
```

Estado actual de pruebas:

```txt
API key: configurada en el perfil local de Resend CLI.
Dominios: ninguno configurado todavia.
```

Mientras no exista un dominio verificado, Resend queda en **modo de pruebas limitadas**. En ese modo no se debe considerar listo el envio real a usuarios de Cubitat.

Correccion importante:

- La API de Resend permite pruebas limitadas con `onboarding@resend.dev`.
- El SMTP de Resend usado por Supabase Auth requiere dominio verificado.
- Por eso una prueba directa por API puede quedar `delivered`, pero Supabase Auth puede fallar con `Error sending confirmation email` si se intenta usar SMTP sin dominio verificado.

## Pruebas limitadas sin dominio verificado

Antes de comprar o verificar `cubitat.com`, se pueden hacer pruebas tecnicas para confirmar que la cuenta, la API key y la integracion basica existen, pero con restricciones:

- Usar remitente de pruebas: `onboarding@resend.dev`.
- No usar todavia `notificaciones@cubitat.com` ni `noreply@cubitat.com`.
- No prometer entrega a usuarios reales hasta verificar dominio.
- Las pruebas de envio deben hacerse solo contra direcciones permitidas por Resend para cuentas sin dominio verificado, normalmente el email propietario de la cuenta o direcciones especiales de prueba de Resend.

Comandos utiles:

```powershell
npx --yes resend-cli@latest whoami --json
npx --yes resend-cli@latest domains list --json
npx --yes resend-cli@latest doctor
```

Si `domains list` devuelve una lista vacia, el siguiente paso no es tocar el frontend: es verificar dominio en Resend.

Para probar Supabase Auth antes de verificar dominio hay dos opciones:

1. Usar el proveedor de correo por defecto de Supabase, aceptando sus limites de prueba.
2. Verificar `cubitat.com` o un subdominio como `mail.cubitat.com` en Resend y entonces activar SMTP.

No usar `onboarding@resend.dev` como remitente SMTP de Supabase Auth para pruebas reales de registro, porque Resend documenta dominio verificado como prerequisito para SMTP.

### Prueba limitada ejecutada

Se creo un script local para enviar una prueba puntual sin guardar la API key:

```txt
web/scripts/test-resend-email.ps1
```

Comando:

```powershell
cd D:\Proyectos\Cubitat\web
.\scripts\test-resend-email.ps1 -To "pochiprats18@gmail.com"
```

Resultado verificado con:

```powershell
npx --yes resend-cli@latest emails list --json
```

Evidencia:

```txt
Email ID: d526bf1e-10f9-4c76-9649-0258b99a679b
To: pochiprats18@gmail.com
From: onboarding@resend.dev
Subject: Cubitat prueba de confirmacion
Last event: delivered
Fecha UTC: 2026-07-01 22:45:28
```

Conclusion: Resend esta funcionando para pruebas limitadas por API. Para conectar Supabase Auth por SMTP falta verificar dominio en Resend.

## Configuracion remota de Supabase via CLI

El proyecto Supabase remoto esta enlazado por CLI:

```txt
Project ref: tohjzoncoosvjbjcakdl
Project name: Cubitat
```

Para empujar la configuracion SMTP de `web/supabase/config.toml` al proyecto remoto sin guardar la API key en el repo:

```powershell
cd D:\Proyectos\Cubitat\web
.\scripts\push-supabase-resend-smtp.ps1
```

El script pide la API key de Resend con entrada segura, define temporalmente:

```env
RESEND_API_KEY=<api-key-temporal>
SUPABASE_SMTP_ADMIN_EMAIL=onboarding@resend.dev
```

y ejecuta:

```powershell
supabase config push --project-ref tohjzoncoosvjbjcakdl --yes
```

Mientras `cubitat.com` no este verificado en Resend, no debe activarse SMTP de Resend para Supabase Auth. Cuando el dominio este verificado, usar:

```txt
notificaciones@cubitat.com
```

Estado temporal aplicado:

```txt
Confirmacion de email: enabled
Custom SMTP Resend: disabled
Rate limit de emails para desarrollo: 30 correos/hora
Site URL local: http://127.0.0.1:5173
Redirect local confirmacion: http://127.0.0.1:5173/auth/callback
Redirect local recuperacion: http://127.0.0.1:5173/recuperar-contrasena
```

Se verifico con un registro remoto real usando alias de Gmail. Supabase devolvio `HTTP 200 OK` y el campo `confirmation_sent_at`, por lo que el correo de confirmacion ya se dispara desde Supabase mientras se verifica el dominio de Resend.

Limitacion detectada:

```txt
email rate limit exceeded
```

Este limite viene del proveedor de correo por defecto de Supabase. En free tier y sin SMTP propio verificado, no se debe depender de ese proveedor para pruebas intensivas ni produccion. El arreglo real es verificar `cubitat.com` o `mail.cubitat.com` en Resend y activar SMTP propio. Mientras tanto, esperar a que se libere el limite horario o crear menos pruebas de registro/recuperacion.

Crear dominio:

```powershell
npx --yes resend-cli@latest domains create --name cubitat.com
```

Ese comando devuelve registros DNS que deben agregarse en el proveedor DNS del dominio.

Dominio creado para este proyecto:

```txt
cubitat.com
ID: af3dd8bf-de2f-40ca-a0c3-d9b948f466ad
Estado actual: not_started
```

Los registros DNS completos estan en:

```txt
D:\Proyectos\Cubitat\docs\DNS-Resend-Cubitat.md
```

Verificar dominio:

```powershell
npx --yes resend-cli@latest domains verify <domain-id>
npx --yes resend-cli@latest domains get <domain-id>
```

Crear API key:

```powershell
npx --yes resend-cli@latest api-keys create --name "Cubitat Supabase SMTP"
```

La API key solo se muestra una vez. Guardarla inmediatamente en un gestor seguro.

## Configuracion en Supabase Dashboard

En produccion, configurar desde:

```txt
Supabase Dashboard > Project Settings > Authentication > SMTP Settings
```

Activar Custom SMTP:

```txt
Host: smtp.resend.com
Port: 465
Username: resend
Password: RESEND_API_KEY
Sender email: notificaciones@cubitat.com
Sender name: Cubitat
```

Tambien configurar URLs permitidas:

```txt
https://cubitat.com/auth/callback
https://cubitat.com/recuperar-contrasena
https://staging.cubitat.com/auth/callback
https://staging.cubitat.com/recuperar-contrasena
http://127.0.0.1:5173/auth/callback
http://127.0.0.1:5173/recuperar-contrasena
```

Rutas frontend responsables:

```txt
web/src/pages/auth/AuthCallbackPage.tsx
web/src/pages/auth/ResetPasswordPage.tsx
```

Las paginas aceptan enlaces con `?code=...` y tambien tokens en `#access_token` / `#refresh_token` para cubrir formatos de Supabase. Despues de validar la sesion limpian la URL con `history.replaceState`.

Para produccion, ajustar `Site URL` al dominio canonico:

```txt
https://cubitat.com
```

## Plantillas de correo

Supabase puede usar las plantillas en:

```txt
web/supabase/templates/
```

Variables usadas:

- `{{ .ConfirmationURL }}` para confirmacion y recuperacion.

Importante:

- Mantener HTML simple e inline styles para compatibilidad de clientes de correo.
- No depender de CSS externo.
- No incluir imagenes remotas criticas.
- El enlace de recuperacion debe aterrizar en `/recuperar-contrasena`.
- El enlace de confirmacion debe aterrizar en `/auth/callback`.
- No escribir manualmente esas rutas dentro del HTML. Usar `{{ .ConfirmationURL }}`; Supabase incorpora el codigo o token y respeta el redirect enviado por el frontend.

## Prueba end-to-end

1. Configurar Resend y Supabase SMTP.
2. Crear usuario desde el modal de Cubitat.
3. Confirmar que llega correo de verificacion.
4. Abrir el enlace y confirmar que aterriza en `/auth/callback`.
5. Cerrar sesion.
6. Usar `Olvide mi contrasena`.
7. Confirmar que llega correo de recuperacion.
8. Abrir enlace y cambiar contrasena en `/recuperar-contrasena`.
9. Iniciar sesion con la nueva contrasena.

## Riesgos y mitigaciones

- **API key expuesta:** nunca guardar `RESEND_API_KEY` en el repo.
- **Dominio no verificado:** no pasar a produccion hasta que `resend doctor` indique dominio verificado.
- **Correos en spam:** verificar SPF/DKIM/DMARC y usar un remitente del dominio oficial.
- **Bloqueo por dependencia externa:** si el cliente exige maxima independencia, mantener Supabase SMTP como contrato intercambiable; se puede cambiar de proveedor sin tocar el frontend.

## Resultado esperado

El registro deja de fallar por envio de correo y los usuarios reciben mensajes consistentes de:

- confirmacion de cuenta;
- recuperacion de contrasena;
- aviso de contrasena actualizada.
