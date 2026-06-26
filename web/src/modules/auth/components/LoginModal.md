# LoginModal

## Responsabilidad

`LoginModal` muestra la experiencia visual de inicio de sesion de Cubitat como un modal sobre la pagina actual. Su objetivo en Fase 1 es ofrecer una entrada clara para usuarios que quieren publicar, guardar favoritos o administrar avisos.

El componente todavia no ejecuta autenticacion real. La integracion prevista es Supabase Auth.

## Ubicacion

- Componente: `src/modules/auth/components/LoginModal.tsx`
- Estilos: `src/styles/app.css`
- Integracion: `src/app/CubitatApp.tsx`

## API del Componente

```ts
type LoginModalProps = {
  onClose?: () => void
}
```

### Props

- `onClose`: callback opcional para cerrar el modal. Se usa en el boton de cierre, en el backdrop y al presionar `Escape`.

## Estructura Visual

El modal se compone de dos zonas principales:

- Panel lateral de marca:
  - Marca Cubitat.
  - Mensaje de valor: gestion de propiedades.
  - Mensajes de confianza: verificacion de usuario y perfil para vendedores/agentes.
  - Fondo con `src/assets/hero.png` y overlay verde.

- Panel de formulario:
  - Titulo: `Iniciar sesion`.
  - Botones visuales para Google y Facebook.
  - Separador `o usa tu correo`.
  - Campos de correo y contrasena usando el componente compartido `Input`.
  - Opcion `Recordarme`.
  - Enlace de recuperacion.
  - CTA principal usando el componente compartido `Button`.
  - Enlace para crear cuenta y texto legal.

## Decisiones de Implementacion

- Se usa `createPortal` para renderizar el modal en `document.body` y evitar problemas de stacking context dentro del layout principal.
- Se usa estado `mounted` para evitar renderizar el portal antes de que exista `document.body`.
- Se escucha la tecla `Escape` con `useEffect` para cerrar el modal de forma natural.
- El backdrop es un boton transparente para permitir cierre por click fuera del panel.
- La UI usa clases propias en `app.css`, no estilos inline ni clases Tailwind sueltas.
- Los controles principales reutilizan `Button` e `Input` desde `shared/ui` para mantener consistencia con el resto del sistema visual.
- Los iconos se toman de `lucide-react`, excepto los logotipos simples de Google/Facebook que estan embebidos como SVG por tratarse de marcas especificas.
- El texto se mantiene en ASCII para evitar problemas de encoding en el repo.

## Responsive

Desktop:

- Modal de hasta `930px` de ancho.
- Dos columnas: panel lateral + formulario.
- Altura maxima controlada por viewport.

Tablet:

- El modal pasa a una sola columna.
- El panel lateral se compacta.
- Se ocultan el parrafo descriptivo lateral y las etiquetas de confianza para reducir altura.

Movil:

- Padding reducido.
- Botones sociales apilados.
- Fila de `Recordarme` y recuperacion en columna.
- Modal dentro del viewport sin desbordar visualmente.

## Accesibilidad

- El contenedor principal usa `role="dialog"` y `aria-modal="true"`.
- El modal tiene `aria-label="Inicio de sesion"`.
- El boton de cierre y el backdrop tienen labels accesibles.
- El cierre por `Escape` esta implementado.

Pendiente recomendado:

- Gestionar focus trap dentro del modal.
- Devolver el foco al boton `Ingresar` al cerrar.
- Asociar labels a inputs con `htmlFor`/`id` si se endurece la accesibilidad del formulario.

## Integracion Actual

En `CubitatApp.tsx`:

- Se agrego `isLoginOpen` como estado local.
- El boton `Ingresar` abre el modal.
- `LoginModal` se renderiza condicionalmente cuando `isLoginOpen` es `true`.
- `onClose` cambia `isLoginOpen` a `false`.

## Pendientes Funcionales

Para conectar con Supabase Auth:

- Implementar login con correo y contrasena.
- Implementar registro de usuario.
- Implementar recuperacion de contrasena.
- Definir si Google/Facebook se activan en Fase 1 o quedan ocultos hasta tener OAuth listo.
- Mostrar estados de carga y errores amigables.
- Persistir sesion y redirigir al dashboard o publicacion segun el flujo.
- Validar el formulario con React Hook Form + Zod cuando se integre la capa real.

## Verificacion Realizada

Al crear la version visual se verifico:

- `npm run build`
- `npm run lint`
- Render desktop en `1365x768`.
- Render movil en `390x844`.
- Modal centrado y sin desbordar.
- CTA principal con texto blanco y sin borde.
- Inputs renderizados mediante `shared/ui/Input`.

## Notas de Mantenimiento

- Si se cambia la estructura visual del modal, actualizar este archivo.
- Si se agregan nuevos props o eventos, actualizar la seccion `API del Componente`.
- Si se conecta Supabase Auth, documentar servicios, estados de error y flujo de navegacion resultante.
