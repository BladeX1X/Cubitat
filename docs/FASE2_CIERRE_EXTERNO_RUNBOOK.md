# Runbook de cierre externo de Fase 2

Fecha de corte: 2026-09-28

Este runbook cubre únicamente las verificaciones que no pueden cerrarse con
pruebas locales o lectura pública. Todo el trabajo se ejecuta en DEV y debe
ser reversible. No usar el Worker productivo ni el proyecto Supabase de
producción.

## 1. Moderación IA de imágenes

### Preparación

Desde `D:\Proyectos\Cubitat\web`:

```powershell
npx wrangler secret put GROQ_API_KEY --config wrangler.phase2-dev.jsonc
npx wrangler secret list --config wrangler.phase2-dev.jsonc
```

La lista debe mostrar `GROQ_API_KEY`. Nunca imprimir ni guardar el valor.

### Prueba

1. Crear o usar una publicación sintética en DEV con una imagen de prueba.
2. Entrar al panel de moderación con una cuenta administrativa AAL2.
3. Ejecutar `Reevaluar con IA`.
4. Confirmar que la tarjeta pasa por `Reevaluando con IA...` y termina en
   `ai_approved`, `ai_rejected` o `pending_review` con un motivo no vacío.
5. Confirmar que el panel se actualiza sin recargar la página.
6. Confirmar en logs que no se imprimen tokens, cuerpos de terceros ni datos
   personales.

### Cierre

- Guardar fecha, versión DEV, identificador de la publicación sintética y
  resultado final.
- Eliminar la publicación y cualquier imagen de prueba mediante el flujo
  autorizado de DEV.
- No promover el secreto ni la migración a producción.

## 2. KYC persistente con AAL2

### Preparación

1. Usar una cuenta de prueba DEV con MFA configurado.
2. Usar documentos sintéticos o de prueba autorizados; no subir documentos
   reales al entorno de desarrollo.
3. Confirmar que el bucket `kyc_documents` es privado y que la sesión admin
   tiene AAL2.

### Prueba

1. Desde `/mi-cuenta`, enviar una solicitud KYC con documento y selfie.
2. Confirmar que la UI muestra estado pendiente y no expone URLs públicas.
3. Desde `/moderar`, abrir la solicitud con la cuenta admin AAL2.
4. Confirmar que la aprobación exige ambas evidencias.
5. Aprobar o rechazar con motivo y comprobar el estado resultante.
6. Intentar acceso como otra cuenta y confirmar que no puede leer las
   evidencias privadas.

### Cierre

- Eliminar la solicitud sintética y los objetos de Storage usando el flujo de
  limpieza de DEV.
- Registrar evidencia del aislamiento RLS, resultado AAL2 y limpieza.
- No marcar KYC como cerrado si la limpieza no se puede demostrar.

## 3. Push físico Android/iOS

La matriz detallada está en `docs/FASE2_PUSH_QA_FISICA.md`.

### Criterios mínimos

1. Instalar la PWA DEV en Android y en Safari iOS/iPadOS.
2. Activar notificaciones desde `/mi-cuenta` y conceder permisos del sistema.
3. Cerrar completamente la aplicación.
4. Crear una notificación de prueba dirigida únicamente a la cuenta y
   dispositivo de QA.
5. Confirmar recepción en la bandeja del sistema.
6. Pulsar la notificación y comprobar navegación a `action_path`.
7. Confirmar que el aviso queda leído y desaparece de pendientes.
8. Repetir con dos cuentas para demostrar aislamiento de suscripciones.

### Cierre y rollback

- Registrar plataforma, navegador, versión de la PWA, estado `sent`, intento,
  `action_path` y `is_read`.
- Si hay fallos, retirar temporalmente el Cron DEV y conservar los registros
  para reintento; no borrar tablas ni migraciones.
- Safari iOS requiere una prueba física separada; Chrome de escritorio no la
  sustituye.

## Estado actual

- Código y gates locales: verificados.
- Aislamiento DEV/producción: verificado.
- Moderación IA real: verificada en DEV el 2026-09-28 con el anuncio QA
  `07a82ef2-3723-45f9-8950-4cb8ec765a46`; Groq devolvió `ai_rejected` con un
  motivo coherente y la tarjeta se actualizó sin recargar. El anuncio fue
  restaurado a `published` y no se tocó producción.
- KYC sintético DEV: verificado para enviar, revisar y rechazar; la validación
  de una identidad real sigue pendiente de una cuenta AAL2 autorizada.
- Push físico Android: verificado con PWA cerrada, recepción, toque, apertura
  de `/mi-cuenta` y retirada del aviso interno.
- Push físico iOS: pendiente hasta disponer de un iPhone real.

## Verificación local de la matriz - 2026-09-29

- Docker quedó disponible y la base local se reconstruyó sin seed persistente.
- Las migraciones de `web/supabase/dev-migrations/` se cargaron únicamente en
  el contenedor local para ejecutar la matriz completa sin incorporarlas a la
  cadena productiva.
- `supabase db lint --local --level warning`: sin errores.
- `supabase test db --local`: PASS, 7 archivos y 7 pruebas, incluida la prueba
  end-to-end local de verificación documental.
- Lint, Vitest (`137` archivos y `608` pruebas), build productivo y build DEV:
  PASS.
- Esta evidencia no sustituye las pruebas físicas de iOS ni la validación KYC
  con una cuenta AAL2 autorizada.
