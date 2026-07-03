# LoginModal

## Responsabilidad

`LoginModal` muestra la experiencia visual de inicio de sesión de Cubitat como un modal sobre la página actual. Conecta la interfaz directamente con el servicio de autenticación de Supabase (Supabase Auth) para soportar tanto el inicio de sesión como la creación de cuentas en la nube en tiempo real.

## Ubicación

- Componente: `src/modules/auth/components/LoginModal.tsx`
- Estilos: `src/styles/app.css`
- Integración: `src/app/CubitatApp.tsx`

## API del Componente

```ts
type LoginModalProps = {
  onClose?: () => void
}
```

### Props

- `onClose`: Callback opcional para cerrar el modal. Se activa mediante el botón de cierre, el backdrop transparente o al presionar la tecla `Escape`.

## Estructura Visual

El modal se compone de dos zonas principales:

- **Panel lateral de marca (Desktop):**
  - Logotipo e identidad de Cubitat.
  - Mensaje de valor e indicadores de confianza (verificación de usuario y roles de vendedor/agente).
  - Fondo con overlay verde sobre `src/assets/hero.png`.

- **Panel de formulario interactivo:**
  - Alternador de vistas: Soporta vistas de **Iniciar sesión** y **Crear cuenta**.
  - Boton social Google: Activo mediante Supabase OAuth cuando el proveedor Google este configurado en Supabase.
  - Boton social Facebook: Desactivado hasta crear app de Meta y activar el proveedor en Supabase.
  - Mensajes de error en color rojo y confirmaciones en color verde.
  - Formulario dinámico:
    - **Registro:** Pide Nombre Completo, Tipo de Perfil (Comprador, Propietario, Gestor/Agente), Correo Electrónico y Contraseña.
    - **Login:** Pide Correo Electrónico y Contraseña.
    - Ojo interactivo para mostrar/ocultar caracteres de la contraseña.

## Decisiones de Implementación y Base de Datos

- **Supabase Auth:** Integrado mediante `supabase.auth.signInWithPassword`, `supabase.auth.signUp` y `supabase.auth.signInWithOAuth`.
- **OAuth Google:** El boton Google usa `supabase.auth.signInWithOAuth({ provider: 'google' })` y redirige a `/auth/callback?flow=oauth` para que el callback cierre sesion de OAuth directo al inicio sin mostrar pantalla de correo confirmado.
- **Metadata en el Registro:** El flujo de registro envía `options.data` con el nombre completo y el rol del usuario (`buyer`, `seller` o `agent`).
- **Trigger en Base de Datos (PostgreSQL):** Al crear una cuenta en la nube, el disparador automático `on_auth_user_created` captura el registro en `auth.users` y propaga los metadatos para inicializar automáticamente la ficha del usuario en la tabla pública `profiles` en la nube.
- **Portales de React:** Se utiliza `createPortal` hacia `document.body` para garantizar que la superposición z-index funcione perfectamente sobre mapas y galerías.
- **Accesibilidad:** Se mantiene el atributo `aria-modal="true"`, `role="dialog"` y el control de cierre mediante escape.

## Responsive

El diseño se adapta automáticamente:
- **Desktop:** Dimensiones máximas de `930px` distribuidas en 2 columnas (Aside de marca a la izquierda, Formulario a la derecha).
- **Tablet & Móvil:** Se oculta el panel lateral de marca para ahorrar espacio vertical. El formulario ocupa todo el ancho disponible y compacta márgenes e inputs.

## Verificación Realizada

- `npm run build`
- `npm run test:run`
- Validación de inserción de perfiles en la base de datos de Supabase tras registrar un usuario de prueba en el frontend.

## Flujos de Email y Recuperacion

- **Confirmacion de email:** El registro envia `emailRedirectTo` hacia `/auth/callback`. Esa pagina intercambia el `code` de Supabase por sesion cuando aplica y muestra el resultado de verificacion.
- **Recuperacion de contrasena:** El boton `Olvide mi contrasena` usa `supabase.auth.resetPasswordForEmail` y redirige a `/recuperar-contrasena`.
- **Privacidad en recuperacion:** El mensaje de recuperacion no confirma si el correo existe. Siempre debe decir: `Si el correo esta registrado, recibiras un enlace para crear una nueva contrasena.`
- **Rate limit de Supabase:** Si Supabase devuelve `email rate limit exceeded`, el modal muestra un mensaje amable de limite temporal. El arreglo real es configurar SMTP propio con dominio verificado.
- **Nueva contrasena:** `/recuperar-contrasena` prepara la sesion temporal enviada por Supabase, limpia la URL para no dejar tokens visibles y guarda la nueva clave con `supabase.auth.updateUser`.
- **Plantillas de correo:** los HTML de Supabase deben usar siempre `{{ .ConfirmationURL }}`; la ruta final la define el frontend mediante `emailRedirectTo` o `redirectTo`.
- **Configuracion local:** `supabase/config.toml` usa `site_url = "http://127.0.0.1:5173"`, permite los redirects de auth y exige confirmacion de correo.
