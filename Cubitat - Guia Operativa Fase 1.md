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

## 4. Tecnologias a Usar

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

## 5. Arquitectura Modular

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

## 6. Modelo de Datos Inicial

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

## 8. Control de Versiones

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

## 9. Orden del Proyecto

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

## 9. Bit�cora y Traspaso de Contexto (Agent Handover)

> **[Nota para el pr�ximo Agente de IA]**
> Si est�s retomando este proyecto, por favor ten en cuenta lo siguiente:
> 
> 1. **Progreso Actual**: La Fase 1 (Setup) est� completa. La Fase 2 y 4 iniciaron con la creaci�n del Navbar.tsx (en src/shared/ui) y el Hero.tsx / SearchBar.tsx (en src/modules/search). Ya est�n renderizados en App.tsx.
> 2. **Configuraci�n de Tailwind CSS**: Estamos usando **Tailwind CSS v4**. El archivo postcss.config.js usa @tailwindcss/postcss, **NO** modifiques esto regresando a la v3.
> 3. **Skills**: Tienes 7 archivos en la carpeta .agents/skills/ que dictan el estilo arquitect�nico del c�digo (API Design, React Best Practices, etc.). Aseg�rate de aplicar estas reglas.
> 4. **Pr�ximo Paso**: Debes leer el archivo 	ask.md ubicado en el directorio ra�z de los artefactos para ver qu� falta. Tu siguiente objetivo es el **M�dulo de Propiedades** (Fase 3: PropertyCard, PropertyDetail, etc.).
> 5. **Entorno Local**: Para iniciar la app, basta con ejecutar 
pm run dev en la carpeta web.

**Fin de Fase Inicial.**
