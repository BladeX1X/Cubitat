# Lector acotado de JSON del Worker

`readBoundedJsonObject` valida el tipo de contenido y el `Content-Length` declarado cuando existe, y también cuenta los bytes reales mientras lee el stream. Si supera el máximo, inicia la cancelación y devuelve `413` sin acumular el resto del cuerpo. Un stream sin progreso por más de 30 segundos se cancela y devuelve `408`; el reloj es un plazo absoluto para la lectura completa, no se reinicia con cada fragmento. JSON malformado, UTF-8 inválido, arreglos y valores primitivos devuelven `400`.

`readBoundedText` comparte el límite por bytes para formularios `application/x-www-form-urlencoded` usados al extraer emails de autenticación. Se usa en rutas del Worker que consumen JSON o necesitan parsearlo para cuotas/validación. No se debe confiar solo en `Content-Length`, porque los cuerpos pueden llegar por streaming sin ese header.

Los límites son por operación: contacto/reportes 16 KiB, consultas push 8 KiB, resend 4 KiB, cuerpo de autenticación 16 KiB, métricas de contacto 1 KiB, duplicados de imagen 4 KiB y moderación IA 8 MiB. La moderación envía como máximo las tres imágenes que analiza el Worker. El proxy binario de Supabase también cuenta bytes reales antes del upstream: 64 KiB por defecto; 5 MiB para `property_images`, 1 MiB para `avatars` y 10 MiB para `kyc_documents`/`property_documents`, alineado con `storage.buckets.file_size_limit` versionado. Las cargas binarias no pasan por el parser JSON.

Las pruebas verifican un cuerpo JSON sin longitud declarada que excede el máximo, que el stream se cancela al cruzar el límite y que un cuerpo que no llega a EOF se cancela al vencer el plazo. Los handlers propagan `408`; el proxy valida el cuerpo antes de reenviarlo al upstream.
