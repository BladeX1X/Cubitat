# Cubitat - Guia Operativa Fase 1

Estado: documento de ejecucion  
Fase: MVP inmobiliario  
Stack definido: React + Vite + Supabase  
Enfoque: PWA mobile-first, modular, preparada para conexiones lentas

## 1. Objetivo de la Fase 1

La Fase 1 debe entregar una version funcional y publicable de Cubitat para validar el mercado inmobiliario cubano con el menor riesgo tecnico posible.

El objetivo no es construir todo el ecosistema definitivo, sino probar si hay traccion real:

- Usuarios que publican propiedades.
- Visitantes que buscan inmuebles.
- Contactos generados entre interesados y anunciantes.
- Zonas con mayor demanda.
- Tipos de operacion mas frecuentes: compraventa, alquiler, permuta y rent-to-own.
- Viabilidad del canal de referidos y redes sociales.

La Fase 1 debe poder operar en produccion aunque todavia no tenga KYC avanzado, red formal de agentes, marketplace B2B ni analitica inmobiliaria avanzada.

## 2. Principios de Ejecucion

### Mobile-first

Cubitat debe disenarse primero para movil. El usuario principal probablemente llegara desde WhatsApp, Facebook, enlaces compartidos o redes sociales, no desde una computadora.

Prioridades:

- Carga rapida en conexiones lentas.
- Interfaz simple.
- Formularios cortos.
- Imagenes optimizadas.
- Navegacion clara con una mano.
- Botones grandes y faciles de tocar.

### PWA y bajo consumo

La aplicacion debe prepararse como PWA para cachear recursos estaticos y mejorar la experiencia en redes inestables.

En Fase 1 se busca:

- Instalable desde navegador.
- Cache basico de assets principales.
- Funcionamiento parcial cuando la conexion falla.
- Mensajes claros cuando una accion requiere internet.

### Modularidad desde el inicio

Cada area debe poder evolucionar sin romper el resto:

- Mapas.
- Propiedades.
- Autenticacion.
- Imagenes.
- Busqueda.
- Panel administrativo.
- Contacto.
- Referidos.

La regla es simple: ningun modulo debe conocer detalles internos de otro modulo si puede comunicarse mediante tipos, servicios o interfaces.

### Evitar dependencia innecesaria

Por el contexto operativo de Cuba, la plataforma no debe quedar atada a proveedores que puedan bloquear cuentas, exigir facturacion dificil de sostener o impedir el uso desde la isla.

Esto aplica especialmente a:

- Mapas.
- Hosting.
- Autenticacion.
- Almacenamiento de imagenes.
- Dominio.

## 3. Alcance Funcional de Fase 1

### Busqueda de propiedades

Debe permitir buscar por:

- Texto libre.
- Zona.
- Tipo de inmueble.
- Tipo de operacion.
- Rango de precio.
- Habitaciones, si aplica.

La busqueda debe estar conectada a una lista de resultados y a un modulo de mapa desacoplado.

### Listado de propiedades

Cada tarjeta debe mostrar:

- Imagen principal.
- Titulo.
- Zona.
- Precio o tipo de operacion.
- Tipo de inmueble.
- Datos basicos: habitaciones, area, estado.
- Accion de contacto o ver detalle.

### Detalle de propiedad

Debe incluir:

- Galeria de imagenes.
- Datos completos.
- Descripcion.
- Ubicacion aproximada.
- Datos de contacto controlados.
- Boton para compartir.
- Estado de publicacion.

### Publicacion de inmueble

Formulario inicial para que un usuario publique:

- Tipo de operacion.
- Tipo de inmueble.
- Zona.
- Precio.
- Datos basicos.
- Descripcion.
- Fotos.
- Datos de contacto.

La publicacion debe quedar pendiente de revision antes de aparecer publica.

### Autenticacion

En Fase 1 se usara Supabase Auth.

Debe permitir:

- Registro.
- Login.
- Recuperacion de acceso.
- Sesion persistente.
- Perfil basico.

### Panel administrativo basico

El administrador debe poder:

- Ver publicaciones pendientes.
- Aprobar propiedades.
- Rechazar propiedades.
- Pausar propiedades.
- Editar informacion basica.
- Revisar usuario anunciante.

### Contacto

La Fase 1 debe facilitar contacto sin construir todavia un CRM completo.

Opciones:

- Boton de WhatsApp.
- Formulario simple de contacto.
- Registro de contacto generado en Supabase.

### Compartir y referidos

Como el crecimiento esperado viene por redes sociales y referidos, cada propiedad debe estar preparada para compartirse bien.

Debe incluir:

- URL limpia.
- Titulo compartible.
- Imagen destacada.
- Texto breve.
- Codigo o identificador de referido si aplica.


## 4. Paginas Necesarias para Fase 1

La Fase 1 debe planearse con pocas paginas, pero bien separadas. La portada no debe cargar con toda la experiencia: busqueda, resultados, detalle y publicacion necesitan vistas propias para mantener claridad visual y crecer sin desorden.

### Paginas minimas del MVP

Para salir a produccion con un MVP completo hacen falta 6 paginas principales:

- `Inicio`: portada con hero, buscador principal, secciones comerciales, llamada a publicar y enlaces internos.
- `Resultados de busqueda`: listado de inmuebles, filtros, ordenamiento y futura vista de mapa/lista.
- `Detalle de propiedad`: galeria, precio, ubicacion aproximada, datos del inmueble, descripcion, contacto y propiedades similares.
- `Publicar propiedad`: formulario guiado para subir datos, fotos, ubicacion y datos de contacto.
- `Login / Registro`: acceso, creacion de cuenta y recuperacion de contrasena.
- `Panel de usuario`: propiedades publicadas, borradores, estado de revision y edicion basica.

### Paginas recomendadas para una Fase 1 solida

Si el tiempo lo permite, el MVP deberia llegar a 8-10 paginas:

- `Editar propiedad`: reutiliza el formulario de publicacion, pero carga una propiedad existente.
- `Favoritos / Guardados`: inmuebles guardados por el usuario.
- `Contacto / Soporte`: ayuda basica, dudas frecuentes y canal de comunicacion.
- `Terminos y privacidad`: condiciones de uso, manejo de datos, imagenes y responsabilidad de publicaciones.

### Criterio de priorizacion

La prioridad debe ser:

1. Inicio.
2. Resultados.
3. Detalle.
4. Publicar propiedad.
5. Login / Registro.
6. Panel de usuario.

Las demas paginas se agregan cuando el flujo principal ya pueda probarse completo: buscar, ver detalle, publicar, revisar y contactar.


## 5. Componentes Reutilizables Base

La Fase 1 debe mantenerse alrededor de 25-35 componentes reutilizables. No se trata de crear componentes por crear, sino de separar piezas que se repiten, tienen estado propio o representan una responsabilidad clara.

### Navegacion y estructura

- `Header`
- `Footer`
- `PageLayout`
- `SectionHeader`
- `Breadcrumbs`

### Busqueda y filtros

- `SearchBar`
- `OperationTabs`
- `PropertyTypeSelect`
- `LocationInput`
- `FilterBar`
- `FilterDropdown`
- `PriceFilter`
- `Pagination`

### Propiedades

- `PropertyCard`
- `PropertyGrid`
- `PropertyGallery`
- `PropertyDetailHeader`
- `PropertySpecs`
- `ContactOwnerBox`
- `UserPropertyCard`
- `StatusBadge`

### Mapas

- `PropertyMap`
- `MapMarker`
- `ClusterMarker`

El resto de la aplicacion no debe depender del proveedor del mapa. Si cambia de SVG autocontenido a MapLibre, PMTiles u otra solucion, la app debe seguir usando el mismo componente publico.

### Publicacion

- `PublishPropertyForm`
- `ImageUploader`
- `StepFormLayout`

### Autenticacion

- `AuthModal`
- `LoginForm`
- `RegisterForm`

### UI compartida

- `Button`
- `Input`
- `Select`
- `Modal`
- `Toast`
- `Badge`
- `EmptyState`
- `LoadingState`

### Regla de extraccion

Un bloque debe salir a componente cuando:

- Se usa en mas de una pagina.
- Tiene estado interno propio.
- Recibe datos desde Supabase o desde un servicio.
- Tiene logica visual condicional.
- Hace que una pagina empiece a crecer demasiado.

La meta es que las paginas coordinen el flujo y los componentes resuelvan piezas concretas de interfaz.

## 6. Tecnologias a Usar

### Comandos de Desarrollo Locales (Server & Túnel)

Para levantar el entorno de desarrollo y generar una URL pública (útil para pruebas en móviles o clientes):

1. **Servidor Local (Vite):**
   Abre una terminal en la carpeta `/web` y ejecuta:
   ```bash
   npm run dev
   ```
   Esto levantará la app en `http://localhost:5173`.

2. **Túnel Público (Cloudflare):**
   Abre una segunda terminal y ejecuta:
   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```
   Busca en la salida de la consola una URL que termina en `.trycloudflare.com`. Ese enlace es público y seguro.

---

### Módulos Frontend (`src/modules`)

Tecnologia: React + Vite.

Motivos:

- Bundle liviano.
- Desarrollo rapido.
- Salida estatica facil de hospedar.
- Mejor ajuste para PWA mobile-first.
- Menos complejidad que SSR para esta etapa.

Librerias recomendadas:

- React Router para rutas.
- TanStack Query o capa propia simple para consultas y cache.
- React Hook Form para formularios.
- Zod para validacion.
- Zustand o Context API para estado pequeno.
- Vite PWA Plugin cuando se implemente cache PWA.

### Backend

Tecnologia: Supabase.

Componentes:

- PostgreSQL para datos.
- Supabase Auth para usuarios.
- Supabase Storage para imagenes.
- Row Level Security para permisos.
- Edge Functions solo si aparece logica que no debe vivir en frontend.

### Hosting

Opciones:

- Cloudflare Pages.
- Vercel si el cliente lo mantiene en su cuenta.
- Hosting estatico alternativo si se decide reducir exposicion a proveedores especificos.

El frontend debe poder desplegarse como archivos estaticos generados por `npm run build`.

### Mapas

El mapa debe ser un modulo reemplazable.

La primera demo visual tipo Airbnb puede servir como referencia de experiencia:

- Lista lateral.
- Mapa interactivo.
- Marcadores por precio.
- Agrupacion por cantidad al alejar.

Pero la implementacion debe quedar desacoplada del proveedor.

Opciones de implementacion:

- SVG autocontenido.
- MapLibre con tiles autohospedados.
- PMTiles/Protomaps autohospedado.
- Proveedor externo solo si el cliente lo aprueba y no compromete continuidad.

## 7. Arquitectura Modular

La aplicacion debe organizarse por dominios funcionales, no por tipo generico de archivo.

Estructura recomendada:

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
  shared/
    ui/
    lib/
    hooks/
    types/
    config/
  modules/
    auth/
    properties/
    search/
    maps/
    admin/
    media/
    contact/
    referrals/
  services/
    supabase/
    analytics/
  styles/
    globals.css
```

### `app`

Contiene el arranque general:

- Router.
- Providers globales.
- Layout raiz.
- Configuracion de PWA cuando aplique.

No debe contener logica de negocio compleja.

### `shared`

Contiene piezas reutilizables sin dependencia de un dominio especifico:

- Botones.
- Inputs.
- Modales.
- Utilidades.
- Hooks genericos.
- Tipos compartidos.

Regla: `shared` no debe importar desde `modules`.

### `modules/auth`

Responsable de:

- Login.
- Registro.
- Sesion.
- Perfil basico.
- Roles.

Ejemplo:

```text
modules/auth/
  components/
  hooks/
  services/
  types.ts
```

### `modules/properties`

Responsable de:

- Modelo de propiedad.
- Tarjetas.
- Detalle.
- Formulario de publicacion.
- Estados de publicacion.

Ejemplo:

```text
modules/properties/
  components/
    PropertyCard.tsx
    PropertyGallery.tsx
    PropertyForm.tsx
  hooks/
    useProperties.ts
    usePropertyDetail.ts
  services/
    propertyRepository.ts
  types.ts
```

### `modules/search`

Responsable de:

- Filtros.
- Estado de busqueda.
- Ordenamiento.
- Sincronizacion con URL.

Debe comunicarse con `properties` mediante filtros tipados, no tocando directamente tablas internas.

### `modules/maps`

Este modulo debe ser intercambiable.

Estructura sugerida:

```text
modules/maps/
  components/
    PropertyMap.tsx
    MapControls.tsx
  adapters/
    SvgMapAdapter.tsx
    MapLibreAdapter.tsx
    PmtilesAdapter.tsx
  services/
    mapProviderRegistry.ts
  types.ts
```

El resto de la app solo debe usar `PropertyMap`.

No debe importar directamente `SvgMapAdapter`, `MapLibreAdapter` ni codigo de proveedor.

Interfaz sugerida:

```ts
export type MapProperty = {
  id: string;
  title: string;
  zoneId: string;
  price?: number;
  lat?: number;
  lng?: number;
};

export type MapAdapterProps = {
  properties: MapProperty[];
  selectedZoneId?: string;
  selectedPropertyId?: string;
  onSelectZone: (zoneId: string) => void;
  onSelectProperty: (propertyId: string) => void;
};
```

Con esto, cambiar de mapa no afecta:

- Busqueda.
- Listado.
- Detalle.
- Base de datos.
- Panel administrativo.
- Contactos.

### `modules/admin`

Responsable de:

- Vistas administrativas.
- Revision de publicaciones.
- Cambio de estados.
- Validaciones manuales.

Debe protegerse por rol.

### `modules/media`

Responsable de:

- Subida de imagenes.
- Compresion.
- Validacion de tamano y formato.
- Relacion imagen-propiedad.
- Imagen principal.

### `modules/contact`

Responsable de:

- Contactar anunciante.
- Registrar leads.
- Crear enlaces de WhatsApp.
- Evitar exponer datos innecesarios.

### `modules/referrals`

Responsable de:

- Codigos de referido.
- Tracking inicial.
- Asociar visitas o publicaciones a un agente/referidor.

En Fase 1 puede quedar basico, pero preparado.

## 8. Modelo de Datos Inicial

Tablas recomendadas en Supabase:

### `profiles`

Perfil extendido del usuario.

Campos:

- `id`
- `full_name`
- `phone`
- `role`
- `created_at`
- `updated_at`

Roles iniciales:

- `user`
- `admin`
- `agent` si se prepara desde Fase 1

### `properties`

Tabla principal de inmuebles.

Campos:

- `id`
- `owner_id`
- `title`
- `description`
- `operation_type`
- `property_type`
- `price`
- `currency`
- `zone_id`
- `address_hint`
- `bedrooms`
- `bathrooms`
- `area_m2`
- `status`
- `created_at`
- `updated_at`

Estados:

- `draft`
- `pending_review`
- `published`
- `paused`
- `rejected`

### `property_images`

Imagenes asociadas.

Campos:

- `id`
- `property_id`
- `storage_path`
- `is_cover`
- `sort_order`
- `created_at`

### `zones`

Zonas operativas del mapa.

Campos:

- `id`
- `name`
- `parent_id`
- `type`
- `svg_id`
- `center_lat`
- `center_lng`

`svg_id` permite conectar una zona de base de datos con un elemento del mapa SVG o con cualquier proveedor futuro.

### `contacts`

Leads generados.

Campos:

- `id`
- `property_id`
- `from_user_id`
- `contact_name`
- `contact_phone`
- `message`
- `source`
- `created_at`

### `referrals`

Referidos basicos.

Campos:

- `id`
- `code`
- `owner_user_id`
- `type`
- `created_at`

## 7. Seguridad y Permisos

Supabase debe usar Row Level Security.

Reglas minimas:

- Un usuario puede ver propiedades publicadas.
- Un usuario puede crear propiedades propias.
- Un usuario puede editar solo sus propiedades mientras no esten aprobadas o segun regla definida.
- Admin puede ver y cambiar estados.
- Imagenes deben asociarse a una propiedad del usuario.
- No exponer service role key en frontend.

Variables de entorno:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nunca usar en frontend:

```text
SUPABASE_SERVICE_ROLE_KEY
```

## 10. Control de Versiones

El proyecto debe estar en Git desde el primer dia.

Repositorio:

- Propiedad del cliente.
- Desarrollador como colaborador.
- Rama principal protegida.

Ramas recomendadas:

```text
main
develop
feature/nombre-corto
fix/nombre-corto
release/v1
```

Flujo recomendado:

1. `main` contiene lo publicado o listo para publicar.
2. `develop` contiene integracion de trabajo.
3. Cada funcionalidad se desarrolla en `feature/...`.
4. Cada bug se corrige en `fix/...`.
5. Todo cambio entra por pull request.

Convencion de commits:

```text
feat: agrega formulario de publicacion
fix: corrige filtro por precio
docs: actualiza guia de despliegue
refactor: separa adaptador de mapa
chore: actualiza dependencias
```

Antes de hacer merge:

- Build local correcto.
- No errores de TypeScript.
- Reglas de lint cumplidas.
- Cambios revisados.
- Variables sensibles fuera del repo.

## 11. Orden del Proyecto

### Documentacion viva

Todo lo importante debe quedar documentado en Obsidian:

- Decisiones tecnicas.
- Cambios de alcance.
- Costos.
- Accesos pendientes.
- Problemas encontrados.
- Soluciones aplicadas.

Documentos clave:

- `Cubitat - Índice del Proyecto.md`
- `Cubitat - Roadmap Fase 1.md`
- `Cubitat - Stack Tecnico React Vite Supabase.md`
- `Cubitat - Guia Operativa Fase 1.md`
- `ADR - Mapas libres para Cubitat.md`

### ADRs

Cada decision tecnica importante debe tener un ADR.

Ejemplos:

- Por que React + Vite.
- Por que Supabase.
- Por que mapas modulares.
- Por que SVG autocontenido o PMTiles.
- Por que Cloudflare/Vercel.

Formato:

```text
# ADR - Titulo

## Contexto
## Decision
## Consecuencias
## Alternativas consideradas
```

### Backlog

El trabajo debe estar dividido en tareas pequenas.

Cada tarea debe tener:

- Objetivo.
- Criterio de aceptacion.
- Rama asociada.
- Estado.
- Responsable.

Estados recomendados:

- `Backlog`
- `Ready`
- `In progress`
- `Review`
- `Done`
- `Blocked`

## 10. Estructura de Entornos

### Local

Para desarrollo diario.

Debe tener:

- `.env.local`
- Supabase local o proyecto de staging.
- Datos de prueba.

### Staging

Para probar antes de produccion.

Debe tener:

- URL privada o no indexable.
- Base de datos separada si el presupuesto lo permite.
- Datos parecidos a produccion pero no sensibles.

### Produccion

Para usuarios reales.

Debe tener:

- Dominio real.
- SSL activo.
- Variables de entorno correctas.
- Backups configurados.
- RLS activo.
- Storage revisado.

## 11. Checklist Tecnico por Semana

### Semana 1 - Base del Proyecto

- Crear repo en cuenta del cliente.
- Configurar React + Vite + TypeScript.
- Configurar estilos base.
- Definir estructura modular.
- Configurar rutas iniciales.
- Crear proyecto Supabase.
- Crear tablas iniciales.
- Configurar variables de entorno.
- Crear layout mobile-first.

### Semana 2 - Propiedades y Busqueda

- Crear modelo de propiedad.
- Crear listado.
- Crear tarjeta.
- Crear detalle.
- Crear filtros.
- Conectar busqueda con Supabase.
- Preparar URL compartible.

### Semana 3 - Publicacion e Imagenes

- Crear formulario de publicacion.
- Validar campos con Zod.
- Subir imagenes a Supabase Storage.
- Asociar imagenes a propiedad.
- Crear estado `pending_review`.
- Optimizar experiencia movil.

### Semana 4 - Admin y Mapa

- Crear panel admin basico.
- Aprobar/rechazar/pausar propiedades.
- Implementar modulo de mapas.
- Integrar primera experiencia visual tipo Airbnb o adaptador SVG/autohospedado.
- Conectar seleccion de zona con busqueda.
- Revisar permisos RLS.

### Semana 5 - PWA, QA y Ajustes

- Configurar PWA.
- Revisar cache basico.
- Optimizar imagenes.
- Probar en movil real.
- Corregir bugs.
- Revisar accesibilidad basica.
- Preparar staging.

### Semana 6 - Lanzamiento

- Configurar dominio.
- Revisar SSL.
- Verificar variables de produccion.
- Cargar propiedades iniciales.
- Probar flujo completo.
- Activar metricas.
- Publicar.

## 12. Criterios de Aceptacion de Fase 1

La Fase 1 se considera entregada cuando:

- El sitio abre correctamente en movil y escritorio.
- Un usuario puede registrarse e iniciar sesion.
- Un usuario puede publicar una propiedad.
- Las imagenes se suben correctamente.
- La propiedad queda pendiente de revision.
- Un admin puede aprobarla.
- Una propiedad aprobada aparece publica.
- El usuario puede buscar y filtrar.
- El mapa o selector geografico funciona.
- El contacto con anunciante funciona.
- El sitio esta desplegado en dominio o URL productiva.
- No hay claves sensibles en el repositorio.
- RLS esta activo.
- Existe documentacion minima de despliegue y mantenimiento.

## 13. Como Mantener Todo en Orden

### Reglas operativas

- No cambiar alcance sin anotarlo.
- No agregar dependencias sin razon clara.
- No mezclar cambios grandes en una sola rama.
- No tocar produccion directamente.
- No guardar claves en el repositorio.
- No construir modulos acoplados a proveedores si pueden abstraerse.

### Revision semanal

Cada semana revisar:

- Que se completo.
- Que esta bloqueado.
- Que cambio en alcance.
- Que decisiones tecnicas se tomaron.
- Que riesgos aparecieron.
- Que falta para publicar.

### Control de deuda tecnica

Registrar deuda tecnica cuando:

- Se implementa una solucion rapida.
- Falta test.
- Falta validacion.
- Falta manejo de errores.
- Falta documentacion.

No toda deuda tecnica bloquea el MVP, pero debe ser visible.

### Skills y Estándares de IA

Para garantizar calidad de nivel "Senior" durante el desarrollo, la IA debe adherirse a los siguientes 7 skills y directrices especializadas que estructurarán su trabajo:

1. **Interface Design**: Guías de diseño moderno (sombras, espaciado, consistencia) para mejorar la UI.
   - Enlaces: [Frontend Design Skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md) / [Interface Design](https://skills.sh/dammyjay93/interface-design/interface-design)
2. **Vercel React Best Practices**: Estándares profesionales en React y Next.js (lazy loading, memoization, data fetching).
   - Enlace: [Vercel React Best Practices](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices)
3. **Brainstorming Skill**: Definición de requisitos y planificación del flujo de desarrollo antes de escribir código.
   - Enlace: [Superpowers](https://github.com/obra/superpowers)
4. **Systematic Debugging**: Proceso de investigación estructurado para diagnosticar y resolver errores de raíz.
   - Enlace: [Superpowers](https://github.com/obra/superpowers)
5. **Changelog Generator**: Generación de resúmenes técnicos automáticos de los cambios realizados.
   - Enlace: [Changelog Generator](https://skills.sh/composiohq/awesome-claude-skills/changelog-generator)
6. **API Design Principles**: Principios REST y estándares de industria para mantener consistencia.
   - Enlace: [API Design Principles](https://github.com/wshobson/agents)
7. **Error Handling Patterns**: Implementación de patrones robustos de gestión de errores (try-catch, null handling).
   - Enlace: [Error Handling Patterns](https://github.com/wshobson/agents/blob/main/plugins/developer-essentials/skills/error-handling-patterns/SKILL.md)

### Herramientas CLI de Productividad y Pruebas

Para agilizar el flujo de trabajo, la automatización y las pruebas, el agente de IA integrará las siguientes herramientas de línea de comandos (CLIs) en su rutina operativa:

1. **Playwright CLI**: Para automatización de navegadores y pruebas visuales (E2E) de la UI. [Repositorio](https://github.com/microsoft/playwright)
2. **GitHub CLI (`gh`)**: Para gestión automatizada de repositorios, ramas y Pull Requests desde la terminal. [Repositorio](https://github.com/cli/cli)
3. **Cloudflare Tunnel (`cloudflared`)**: Para exponer de manera segura el entorno de desarrollo local mediante URLs públicas y facilitar pruebas con el cliente. [Repositorio](https://github.com/cloudflare/cloudflared)
4. **TestSprite CLI**: Para la generación automática de casos de prueba robustos en el frontend asistidos por IA. [Repositorio](https://github.com/TestSprite/testsprite-cli)

*(Nota: Railway CLI y Context7 también figuran como alternativas documentadas para escalado de infraestructura y contexto de memoria a largo plazo).*

## 14. Riesgos de Fase 1

### Mapas

Riesgo: dependencia de proveedor externo.

Mitigacion:

- Modulo de mapas desacoplado.
- Adaptador SVG o autohospedado.
- Interfaz comun para cambiar proveedor.

### Imagenes

Riesgo: imagenes pesadas en redes lentas.

Mitigacion:

- Limites de tamano.
- Compresion antes de subir.
- Miniaturas.
- Lazy loading.

### Fraude

Riesgo: publicaciones falsas.

Mitigacion:

- Revision manual en Fase 1.
- Estado pendiente.
- Datos de contacto controlados.
- Preparar KYC para Fase 2.

### Alcance excesivo

Riesgo: querer construir todo desde el inicio.

Mitigacion:

- Fase 1 enfocada en inventario, busqueda, publicacion y contacto.
- Todo lo demas pasa a fases posteriores.

## 15. Resumen Ejecutivo

La Fase 1 de Cubitat debe entregar una plataforma inmobiliaria funcional, ligera y modular, construida con React + Vite y Supabase.

El mapa debe tratarse como un modulo reemplazable: se puede iniciar con la experiencia visual de la primera demo, pero sin acoplar el sistema a un proveedor especifico. La arquitectura debe permitir cambiar a SVG autocontenido, PMTiles autohospedado, MapLibre u otra solucion sin reescribir el portal.

El proyecto debe mantenerse ordenado con Git, ramas claras, pull requests, documentacion viva en Obsidian y decisiones tecnicas registradas como ADRs.

El exito de la Fase 1 no se mide por cantidad de funcionalidades, sino por lograr que Cubitat pueda publicar propiedades, atraer usuarios, generar contactos y validar traccion real en 4 a 6 semanas.

---

## 9. Bitacora y Traspaso de Contexto (Agent Handover)

> **[Nota para el proximo Agente de IA]**
> Si estas retomando este proyecto, por favor ten en cuenta lo siguiente:
> 
> 1. **Progreso Actual**: La Fase 1 esta avanzada. Supabase esta conectado (auth, CRUD de propiedades, Storage de imagenes, RLS activo). El flujo completo de buscar, publicar, editar, eliminar y ver detalle funciona end-to-end.
> 2. **Configuracion de Tailwind CSS**: Estamos usando **Tailwind CSS v4**. El archivo postcss.config.js usa @tailwindcss/postcss, **NO** modifiques esto regresando a la v3.
> 3. **Skills**: Tienes 7 archivos en la carpeta .agents/skills/ que dictan el estilo arquitectonico del codigo (API Design, React Best Practices, etc.). Asegurate de aplicar estas reglas.
> 4. **Documentacion de Componentes**: Cada componente principal tiene un .md asociado (ej. CubitatApp.md, HomePage.md, SearchBar.md). **LEELOS antes de modificar** y **ACTUALIZALOS despues de cada cambio significativo**.
> 5. **Entorno Local**: Para iniciar la app, ejecuta npm run dev en la carpeta web.
> 6. **Shadcn/UI Skills**: He instalado el skill oficial de shadcn/ui en .agents/skills/shadcn. Usalo para generar componentes con los estandares mas altos.

### Paginas Implementadas

| Ruta | Componente | Descripcion |
|------|-----------|-------------|
| / | HomePage | Hero + buscador + 16 provincias cubanas con fotos |
| /resultados | ResultsPage | Grid paginado (16 items/pag) + FilterBar + ordenamiento |
| /propiedad/:slug | DetailPage | Slug SEO + breadcrumbs clicables + propiedades similares por provincia |
| /publicar | PublishPage | Wizard de 8 pasos con autoguardado en localStorage + Supabase |
| /editar/:id | PublishPage (modo edicion) | Precarga datos existentes de Supabase |
| /mis-propiedades | MyPropertiesPage | Grid CRUD de propiedades del usuario autenticado |

### Decisiones Arquitectonicas Clave

- **Navegacion SPA sin React Router**: Se usa pageMode + window.history.pushState. Evaluar migracion a React Router si crece la complejidad.
- **Filtros de Operacion Exclusivos**: Venta/Renta/Permuta son mutuamente excluyentes (no multi-select). Implementado en SearchBar.tsx (tabs) y FilterBar.tsx (radio buttons).
- **Slugs SEO**: La URL de detalle es /propiedad/tipo-operacion-ubicacion-uuid. El UUID se extrae con regex desde los ultimos 5 segmentos del slug.
- **Secciones Servicios y Productos**: Exportadas como export function en HomePage.tsx pero NO renderizadas. Reactivar agregando ServicesSection y ProductsSection al JSX cuando haya contenido real. Los enlaces del Header fueron eliminados y las funciones navigateToSection/scrollTo estan comentadas en CubitatApp.tsx.
- **Propiedades Similares**: DetailPage busca propiedades de la misma provincia con ilike y completa con fallback nacional si hay menos de 3.

### Proximos Pasos Recomendados

1. Configurar SMTP con Resend para confirmacion de email en registro.
2. Implementar sistema de notificaciones (campanita en header).
3. Implementar contenido real para Servicios y Productos.
4. Extraer Header y SiteFooter a components/layout/.
5. Reemplazar fotos de Unsplash de provincias por imagenes propias.
6. Evaluar React Router formal.

**Ultima verificacion exitosa: 2026-07-01. npm run build paso sin errores.**

### Memoria de Codigo con Codebase Memory MCP

Se integro `DeusData/codebase-memory-mcp` en la maquina local para que los agentes puedan consultar el grafo del codigo de Cubitat entre sesiones.

Estado actual:

- Version instalada: `codebase-memory-mcp 0.8.1`.
- Binario local: `%LOCALAPPDATA%\Programs\codebase-memory-mcp\codebase-memory-mcp.exe`.
- Proyecto indexado: `D-Proyectos-Cubitat`.
- Ruta indexada: `D:/Proyectos/Cubitat`.
- Estado verificado: `ready`.
- Ultimo indice verificado: `1109` nodos y `1406` relaciones.

Archivos de control:

- `.cbmignore` en la raiz del proyecto evita indexar dependencias, builds, resultados de pruebas, temporales y artefactos pesados.
- El instalador configuro integraciones para Codex CLI, Claude Code, Gemini CLI, VS Code, Cursor y Kiro. Si una sesion no ve el MCP de inmediato, reiniciar Codex o la terminal.

Comandos utiles:

```powershell
& "$env:LOCALAPPDATA\Programs\codebase-memory-mcp\codebase-memory-mcp.exe" --version
& "$env:LOCALAPPDATA\Programs\codebase-memory-mcp\codebase-memory-mcp.exe" cli list_projects
```

Para reindexar Cubitat desde Windows/PowerShell, usar Python como lanzador para preservar correctamente el JSON:

```powershell
$py = @'
import os, subprocess, sys
exe = os.path.join(os.environ["LOCALAPPDATA"], "Programs", "codebase-memory-mcp", "codebase-memory-mcp.exe")
cmd = [exe, "cli", "--json", "index_repository", "{\"repo_path\":\"D:/Proyectos/Cubitat\",\"name\":\"Cubitat\"}"]
p = subprocess.run(cmd, cwd="D:/Proyectos/Cubitat", text=True, capture_output=True, timeout=30)
print(p.stdout, end="")
print(p.stderr, end="", file=sys.stderr)
sys.exit(p.returncode)
'@
$tmp = Join-Path $env:TEMP "cbm_index_cubitat.py"
Set-Content -LiteralPath $tmp -Value $py -Encoding UTF8
python $tmp
```

Uso recomendado para agentes:

- Antes de cambios grandes, consultar arquitectura, simbolos o relaciones con `search_graph`, `get_architecture`, `trace_path` o `search_code`.
- No usar el indice como sustituto de leer los archivos relevantes; usarlo para ubicar rapido dependencias y puntos de entrada.
- Reindexar despues de cambios grandes de arquitectura, nuevas paginas o nuevos modulos compartidos.

### Auditoria de Calidad y Preproduccion

Se revisaron recursos externos para mejorar el proceso de calidad antes de presentar Cubitat al cliente:

- **Unlighthouse**: queda como herramienta principal de auditoria preproduccion. Evalua performance, SEO, accesibilidad y buenas practicas en rutas completas. Se agrego `web/unlighthouse.config.js` con rutas MVP: `/`, `/resultados`, `/auth/callback` y `/recuperar-contrasena`.
- **React Doctor (`millionco/react-doctor`)**: se usara como auditor puntual de salud React, sin telemetria (`--no-telemetry --no-score`). No se instalo como dependencia fija todavia porque genera muchos avisos que deben revisarse caso por caso. El primer uso sirvio para detectar y corregir un cleanup real en `MapLibreAdapter`.
- **Fontpair**: queda como referencia de criterio tipografico. No se agrega dependencia. Usarlo cuando se cierre la identidad visual.
- **Sileo**: posible sistema de toasts animados para feedback de login, favoritos y publicaciones. No integrarlo todavia para no duplicar patrones de UI mientras se estabiliza auth y shadcn.
- **HTMLrev React Templates**: usar solo como inspiracion para paneles futuros, no como base visual del portal.

Scripts agregados en `web/package.json`:

```bash
npm run audit:react
npm run audit:react:json
npm run audit:lighthouse
npm run audit:lighthouse:ci
```

Notas operativas:

- `audit:lighthouse:ci` requiere que el dev server este activo en `http://127.0.0.1:5173`.
- Los reportes se generan en `web/reports/` y no se versionan.
- Si `react-doctor` reporta errores, tratarlos como hipotesis: leer el archivo, clasificar verdadero positivo/falso positivo y corregir solo cambios de alta confianza.
- Ultima prueba: Unlighthouse escaneo 4 rutas correctamente y genero reportes locales; React Doctor en cambios quedo sin errores, solo warnings.

#### Protocolo para Otro Agente: Como Repetir la Auditoria

Este procedimiento debe ejecutarse antes de preproduccion, despues de cambios grandes de interfaz, o antes de mostrar avances importantes al cliente.

1. Entrar al proyecto web:

```powershell
cd D:\Proyectos\Cubitat\web
```

2. Verificar que el proyecto compila antes de auditar:

```powershell
npm run test:run
npm run build
npm run lint
```

El lint puede mostrar warnings existentes. No mezclar arreglos grandes de lint con una tarea funcional salvo que el warning pertenezca al archivo que acabas de tocar.

3. Levantar el servidor local para Unlighthouse:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

Si ya hay un servidor activo en ese puerto, reutilizarlo. Si el puerto esta ocupado por un proceso roto, cerrar solo ese proceso y volver a levantarlo.

4. Ejecutar auditoria Lighthouse de rutas MVP:

```powershell
npm run audit:lighthouse:ci
```

Rutas auditadas por `web/unlighthouse.config.js`:

- `/`
- `/resultados`
- `/auth/callback`
- `/recuperar-contrasena`

El reporte queda en:

```txt
D:\Proyectos\Cubitat\web\reports\unlighthouse
```

No subir `reports/` al repositorio. Ya esta en `.gitignore`.

5. Leer resultados de Unlighthouse:

- Revisar primero `Performance`, `Accessibility`, `Best Practices` y `SEO`.
- Abrir los `lighthouse.html` de cada ruta si se necesita inspeccion visual.
- Priorizar problemas repetidos entre rutas.
- No corregir automaticamente recomendaciones cosmeticas si chocan con decisiones de producto.

6. Ejecutar React Doctor sin telemetria:

```powershell
npm run audit:react
```

Para cambios no commiteados:

```powershell
npx --yes react-doctor@latest --no-telemetry --no-score --scope changed .
```

Para salida JSON:

```powershell
npm run audit:react:json
```

7. Como interpretar React Doctor:

- React Doctor no es una autoridad absoluta; es un detector de hipotesis.
- Antes de corregir, leer el archivo completo o al menos el bloque funcional relacionado.
- Clasificar cada hallazgo:
  - `Verdadero positivo`: bug, fuga, riesgo de seguridad o problema real.
  - `Falso positivo`: el patron es intencional o no aplica por la arquitectura actual.
  - `Necesita decision`: requiere criterio de producto, arquitectura o seguridad.
- Corregir solo hallazgos de alta confianza.
- Documentar los hallazgos importantes que no se corrijan.

8. Ejemplo de hallazgo real ya corregido:

React Doctor detecto que `MapLibreAdapter` registraba eventos del mapa sin cleanup. Se corrigio separando:

- montaje inicial de source/capas/listeners;
- actualizacion de datos GeoJSON;
- cleanup de listeners con `map.off(...)`.

Ese es el tipo de correccion adecuada: pequena, verificable y sin cambio de producto.

9. Despues de corregir:

```powershell
npm run test:run
npm run build
npm run lint
npx --yes react-doctor@latest --no-telemetry --no-score --scope changed .
```

Resultado esperado:

- Tests pasan.
- Build pasa.
- Lint sin errores. Warnings antiguos pueden quedar anotados.
- React Doctor en `--scope changed` sin errores; warnings revisables quedan como backlog.

10. Que NO hacer:

- No ejecutar `npx react-doctor install --yes` sin autorizacion. Eso instala dependencia, skill y posiblemente hooks.
- No convertir todos los warnings de React Doctor en cambios masivos.
- No versionar `reports/`.
- No cambiar Tailwind/PostCSS ni estructura de build por recomendaciones genericas.
- No agregar Sileo, plantillas HTMLrev o nuevas fuentes sin decision visual previa.

11. Recursos externos y uso permitido:

- `https://unlighthouse.dev/`: auditoria real de preproduccion.
- `https://github.com/millionco/react-doctor`: diagnostico puntual de salud React.
- `https://fontpair.co/`: inspiracion tipografica, sin dependencia.
- `https://sileo.aaryan.design/`: posible sistema de toasts futuro.
- `https://htmlrev.com/free-react-templates.html`: inspiracion para paneles, no base del portal.

12. Criterio de cierre para una auditoria:

Una auditoria queda cerrada cuando:

- los comandos de verificacion pasan;
- los errores reales detectados se corrigen o quedan documentados;
- los warnings no corregidos tienen razon clara;
- la guia o los `.md` de componentes afectados quedan actualizados;
- no quedan procesos de Unlighthouse corriendo en segundo plano.

### Decision Tipografica con Fontpair

Se uso `https://fontpair.co/` como referencia para mejorar la identidad visual de Cubitat mediante una pareja tipografica clara:

- **Manrope** para marca, titulos, precios y encabezados importantes.
- **Source Sans 3** para cuerpo de texto, formularios, filtros, botones y lectura funcional.

Motivo:

- Cubitat necesita verse como un portal inmobiliario serio, confiable y moderno.
- `Manrope` da presencia sin sentirse decorativa.
- `Source Sans 3` mantiene alta legibilidad en tarjetas, formularios y pantallas moviles.
- La combinacion evita un estilo demasiado generico de sistema sin irse a una estetica editorial o lujosa que no corresponde al MVP.

Implementacion actual:

- Archivo: `web/src/styles/app.css`.
- Variables:
  - `--font-sans`
  - `--font-display`
- Import temporal desde Google Fonts con `display=swap`.

Nota de produccion:

Si el cliente exige independencia total de servicios externos por el contexto de Cuba, antes de publicar se deben self-hostear las fuentes dentro de `web/public/fonts/` y reemplazar el `@import` remoto por `@font-face` local. Mientras tanto hay fallbacks del sistema para que la app siga funcionando si la fuente externa no carga.

### Correo Transaccional con Resend y Supabase Auth

Se retomo el flujo de correo para confirmacion de email y recuperacion de contrasena. El proveedor elegido es **Resend** via SMTP de Supabase.

Documento rector:

```txt
D:\Proyectos\Cubitat\docs\ADR-001-Email-Provider.md
```

Archivos preparados:

- `web/supabase/config.toml`: SMTP local configurado para Resend mediante variables.
- `web/.env.example`: variables esperadas sin secretos reales.
- `web/supabase/templates/confirmation.html`: correo de confirmacion.
- `web/supabase/templates/recovery.html`: correo de recuperacion.
- `web/supabase/templates/password_changed_notification.html`: aviso de contrasena actualizada.

Variables necesarias:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SMTP_ADMIN_EMAIL=notificaciones@cubitat.com
```

Comandos de Resend CLI:

```powershell
npx --yes resend-cli@latest --help
npx --yes resend-cli@latest login
npx --yes resend-cli@latest doctor
npx --yes resend-cli@latest domains create --name cubitat.com
npx --yes resend-cli@latest domains verify <domain-id>
npx --yes resend-cli@latest api-keys create --name "Cubitat Supabase SMTP"
```

Script seguro preparado para login local:

```powershell
cd D:\Proyectos\Cubitat\web
.\scripts\setup-resend.ps1
```

Usar este script cuando ya se tenga la API key `re_...`. No pegar la API key en el chat.

Notas importantes:

- El paquete ejecutable correcto es `resend-cli`; `npx resend@latest` no ejecuta el CLI.
- La API key de Resend solo se muestra al crearla. Guardarla en un gestor seguro.
- En produccion, la configuracion SMTP se hace en Supabase Dashboard, no commiteando secretos al repo.
- El frontend ya usa `/auth/callback` y `/recuperar-contrasena` como rutas de retorno.
- Antes de produccion se deben agregar esos redirects en Supabase para dominio real y staging.

Modo de pruebas limitadas:

- Ya se valido que la CLI puede autenticarse con la API key local.
- Actualmente `cubitat.com` esta creado en Resend, pero no esta verificado.
- Para pruebas por API sin dominio, usar `onboarding@resend.dev` como remitente temporal.
- No usar `notificaciones@cubitat.com` hasta verificar `cubitat.com` en Resend.
- No usar SMTP de Resend en Supabase Auth hasta verificar dominio; Resend documenta dominio verificado como prerequisito SMTP.
- Si Supabase devuelve `Error sending confirmation email`, no se debe tocar la UI primero: revisar dominio verificado, remitente autorizado y SMTP en Supabase.
- Se ejecuto una prueba real hacia `pochiprats18@gmail.com` usando `web/scripts/test-resend-email.ps1`; Resend reporto `last_event: delivered`.
- Estado temporal aplicado: Supabase Auth quedo con confirmacion de correo activa, Custom SMTP desactivado y limite de emails de desarrollo en `30` por hora. Una prueba remota de registro devolvio `HTTP 200 OK` con `confirmation_sent_at`, por lo que el correo de confirmacion ya se dispara desde Supabase mientras se verifica el dominio de Resend.
- Pendiente OAuth Google: mejorar la pantalla de consentimiento para que muestre marca Cubitat y, cuando exista dominio, evaluar `auth.cubitat.com` como dominio propio de Auth para no mostrar el dominio tecnico `tohjzoncoosvjbjcakdl.supabase.co`. Ver `D:\Proyectos\Cubitat\docs\OAuth-Google-Supabase.md`.

Comandos de diagnostico:

```powershell
npx --yes resend-cli@latest whoami --json
npx --yes resend-cli@latest domains list --json
npx --yes resend-cli@latest doctor
```
