# Auditoria juridica de Fase 1 - 2026-09-21

Estado: auditoria interna completada con bloqueos de cierre
Alcance: produccion, terminos, privacidad, consentimiento, publicaciones,
moderacion, analitica, notificaciones y contacto
Conclusion: no aprobado para cierre juridico externo
Responsable del siguiente paso: propietarios de Cubitat

> Este documento es una revision tecnica y de cumplimiento aparente. No
> sustituye el dictamen de un abogado habilitado en Cuba ni la confirmacion de
> la autoridad competente sobre transferencias internacionales de datos.

## 1. Evidencia revisada

- Produccion: `https://cubitathome.com/privacidad` y
  `https://cubitathome.com/terminos`, comprobadas el 2026-09-21. Ambas conservan
  la fecha de actualizacion 2026-07-11 y coinciden con el repositorio.
- Textos fuente: `docs/POLITICA_PRIVACIDAD.md`,
  `docs/TERMINOS_SERVICIO.md`, `web/src/pages/legal/PrivacyPage.tsx` y
  `web/src/pages/legal/TermsPage.tsx`.
- Tratamientos reales: registro y OAuth, perfiles, publicaciones, direccion y
  coordenadas privadas, imagenes, contactos, denuncias, favoritos, alertas,
  Web Push, logs, GA4, Turnstile y moderacion automatizada.
- Encargados o servicios observados: Cloudflare, Supabase, Google, Groq,
  OpenFreeMap y Resend. La lista debe confirmarse contra contratos y cuentas
  productivas antes de publicar el aviso definitivo.
- Normativa de referencia:
  - Ley 149/2022 de Proteccion de Datos Personales, Gaceta Oficial Ordinaria
    No. 90 de 2022:
    `https://www.directoriocubano.com/servicios/gaceta-oficial/norma/goc-2022-832-o90/`.
  - Resolucion 54/2018 de proteccion al consumidor, Gaceta Oficial
    Extraordinaria No. 26 de 2018:
    `https://www.directoriocubano.com/servicios/gaceta-oficial/2018/extraordinaria/26/`.
  - Decreto 102/2024 sobre publicidad y patrocinio. Verificar su texto y
    aplicabilidad en la fuente oficial antes del cierre externo.

## 2. Resultado ejecutivo

La plataforma contiene enlaces legales visibles, informa de varias categorias
de datos, explica la ubicacion aproximada, identifica Supabase/Google y menciona
la moderacion automatizada. Esa base es util, pero no satisface todavia el
inventario real de tratamientos ni permite cerrar la revision juridica.

La Ley 149 exige informar de forma comprensible la finalidad, destinatarios,
obligatoriedad, almacenamiento, consecuencias y conservacion de cada
tratamiento. Tambien obliga a presentar el aviso durante la obtencion de datos.
Los textos actuales son generales, omiten tratamientos y terceros relevantes y
no identifican al responsable del tratamiento ni su domicilio legal.

## 3. Hallazgos bloqueantes

### J-01 - Responsable sin identificar (critico)

La politica y los terminos solo nombran la marca Cubitat y el correo de soporte.
Faltan el nombre legal de la persona natural o juridica responsable, domicilio,
medio formal de contacto y, cuando corresponda, datos de registro o licencia.
Sin esos datos no debe publicarse una version presentada como legalmente
cerrada.

### J-02 - Transferencias y proveedores incompletos (critico)

El aviso solo nombra Supabase y Google OAuth. El producto tambien usa
Cloudflare, Groq, GA4, Turnstile, Web Push, mapas y correo transaccional. La
moderacion envia a Groq titulo, zona publica, descripcion, precio, tipo y hasta
tres imagenes. Deben documentarse destinatario, finalidad, ubicacion de
procesamiento, periodo y salvaguardas.

Los articulos 65 y 66 de la Ley 149 establecen un regimen restrictivo para la
transferencia internacional y autoridades competentes para autorizarla. Un
abogado cubano debe determinar si el uso productivo de estos proveedores exige
autorizacion, ajuste contractual o una arquitectura distinta.

### J-03 - Aviso incompleto en los puntos de captura (alto)

El registro enlaza a terminos y privacidad, pero el formulario publico de
contacto recoge nombre, telefono y mensaje sin aviso breve, finalidades,
destinatario o enlace legal junto al envio. El formulario de publicacion tampoco
explica en el punto de carga que texto e imagenes se enviaran a un proveedor de
IA. La Ley 149 exige informar durante la obtencion, no solo desde el pie del
sitio.

### J-04 - Analitica sin gestion de preferencia (alto)

`CubitatApp` llama `initAnalytics()` al montar y GA4 se configura sin consultar
una preferencia de consentimiento. No existe panel de cookies o analitica. Debe
definirse si GA4 opera con consentimiento previo, modo sin cookies o se retira;
la decision debe coincidir con la configuracion tecnica y el aviso.

### J-05 - Conservacion indeterminada (alto)

La frase "mientras la cuenta este activa o sea necesaria" no define plazos ni
criterios por categoria. Falta una tabla de retencion para cuentas, perfiles,
publicaciones e imagenes, direcciones privadas, contactos, denuncias, favoritos,
alertas, suscripciones Push, moderacion, logs, respaldos y solicitudes de
derechos. La politica debe explicar tambien borrado, anonimizado y excepciones
por seguridad o deber legal.

### J-06 - Derechos y procedimiento incompletos (alto)

El aviso menciona acceso, rectificacion y eliminacion, pero no presenta de forma
completa verificacion, actualizacion, cancelacion, oposicion y no divulgacion.
Faltan requisitos de identidad, canal, acuse, plazo de respuesta, causas de
negativa y via de reclamacion. No existe una funcion visible de eliminacion de
cuenta; el correo de soporte es hoy el unico mecanismo declarado.

### J-07 - Moderacion automatizada y recurso insuficientes (alto)

Los terminos muestran codigos internos (`rejected`, `pending_review`) y permiten
rechazo automatico sin explicar criterios, efectos, revision humana o canal de
apelacion. Deben usarse estados comprensibles, informar del proveedor y dar un
procedimiento de revision manual. Una decision adversa no debe quedar sin
notificacion motivada y posibilidad de impugnacion.

### J-08 - Menores sin regla definida (alto)

No hay edad minima ni procedimiento de consentimiento del representante. La Ley
149 regula especificamente datos de menores. Para Fase 1 se recomienda limitar
cuentas y publicaciones a personas de 18 anos o mas, sujeto a validacion legal.

## 4. Hallazgos importantes

### J-09 - Reclamaciones y consumidor

La Resolucion 54/2018 extiende la proteccion al comercio electronico, reconoce
el derecho a informacion veraz, privacidad y mecanismos de reclamacion. Los
terminos solo ofrecen un correo, sin titular responsable, procedimiento, plazo
o escalamiento. La limitacion de responsabilidad debe aclarar que no elimina
derechos irrenunciables ni obligaciones propias de la plataforma.

### J-10 - Afirmacion comercial no sustentada

La portada afirma "El portal inmobiliario mas grande de Cuba". No existe en el
repositorio evidencia objetiva, metodologia o fecha que sustente la
superioridad. Debe sustituirse por una descripcion verificable o respaldarse con
medicion documentada y actualizable para evitar riesgo de publicidad enganosa.

### J-11 - Contenido de usuarios y facultades de la plataforma

Los terminos prohiben infringir derechos de autor, pero no exigen que el
anunciante tenga facultad para publicar la propiedad y las imagenes ni conceden
una licencia limitada para alojar, transformar, moderar y mostrar el contenido.
Tambien faltan reglas sobre anuncios duplicados, fraude, disponibilidad,
retirada, conservacion probatoria y denuncias de derechos.

### J-12 - Cambios, suspension y baja

La facultad de modificar o discontinuar "sin previo aviso" es demasiado amplia.
Debe distinguir mantenimiento, emergencia y cambios materiales; prever aviso,
fecha de entrada en vigor y tratamiento de cuentas/datos tras la baja. Suspender
por "danar la reputacion" es ambiguo y debe reemplazarse por causas objetivas.

### J-13 - Consentimientos mezclados

Aceptar terminos, recibir alertas, habilitar Push, usar analitica y recibir
mensajes comerciales son decisiones distintas. Deben registrarse por separado,
ser revocables y no condicionar servicios no relacionados. Las notificaciones
operativas deben distinguirse de publicidad o promociones.

## 5. Controles que ya existen

- Enlaces permanentes a terminos y privacidad desde el pie y el registro.
- Aviso general sobre IA y revision manual.
- Proteccion tecnica de direccion y coordenadas exactas; la vista publica usa
  ubicacion aproximada.
- Preferencia por dispositivo para Web Push y opcion de desactivarla.
- Controles Turnstile y limites de uso para formularios publicos.
- Canales de denuncia de publicaciones y moderacion humana administrativa.
- Correo de soporte publicado para solicitudes y reclamaciones.

Estos controles reducen riesgo, pero no corrigen por si solos los hallazgos
documentales y regulatorios anteriores.

## 6. Datos que debe confirmar el propietario

Esta etapa queda asignada a los propietarios de Cubitat. El equipo tecnico no
debe completar estos datos por inferencia, aprobar los textos en su nombre ni
marcar el punto legal como cerrado.

1. Nombre legal completo del responsable y forma juridica.
2. Domicilio legal y datos de registro/licencia aplicables.
3. Persona o area responsable de privacidad y reclamaciones.
4. Edad minima de uso y politica para menores.
5. Inventario contractual, regiones y subencargados de cada proveedor.
6. Tabla de retencion aprobada por categoria y respaldo.
7. Plazo y procedimiento para derechos, quejas y apelaciones.
8. Base y autorizacion aplicable a transferencias internacionales.
9. Si GA4 seguira activo y bajo que modalidad de consentimiento.
10. Evidencia que sostenga cualquier afirmacion de liderazgo comercial.

## 7. Plan de remediacion

### Etapa A - Decisiones juridicas previas

- Responsable: propietarios de Cubitat, con asesoria juridica habilitada en
  Cuba.
- Obtener los diez datos anteriores y dictamen sobre transferencias.
- Confirmar contratos y regiones de Cloudflare, Supabase, Google, Groq, Resend
  y cualquier otro encargado productivo.
- Aprobar la tabla de retencion y el procedimiento de derechos.

### Etapa B - Cambios tecnicos y documentales

- Responsable: equipo tecnico, unicamente despues de recibir por escrito las
  decisiones y textos aprobados por los propietarios.
- Reescribir terminos y privacidad desde el inventario real.
- Anadir avisos breves en registro, contacto, publicacion, alertas y Push.
- Implementar preferencia de analitica antes de cargar GA4.
- Crear solicitud trazable de derechos y eliminacion de cuenta.
- Crear apelacion de moderacion y retirar codigos internos del texto legal.
- Sustituir la afirmacion "mas grande de Cuba" mientras no haya respaldo.
- Versionar consentimiento y avisos aceptados con fecha y proposito.

### Etapa C - Validacion y despliegue

- Responsables: propietarios para la aprobacion legal y equipo tecnico para la
  implementacion, pruebas y despliegue autorizado.
- Revision por abogado cubano y aprobacion expresa del titular.
- Pruebas funcionales de cada consentimiento, revocacion y solicitud.
- Verificacion de produccion movil y escritorio.
- Registrar version, fecha de vigencia, evidencia y mecanismo de aviso.

## 8. Criterio de cierre

El punto juridico solo puede marcarse como terminado cuando:

- J-01 a J-08 esten corregidos o aceptados mediante dictamen documentado.
- El inventario de proveedores y transferencias coincida con produccion.
- Los textos tengan aprobacion del titular y revision profesional externa.
- Los flujos de consentimiento, derechos, apelacion y baja esten probados.
- Produccion muestre la misma version aprobada y su fecha de vigencia.
