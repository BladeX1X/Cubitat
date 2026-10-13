# Fingerprints perceptuales de imágenes

El Worker calcula pHash de 64 bits sobre WebP guardados en `property_images`.
El cálculo del anuncio nuevo y el backfill gradual usan la misma rutina y la
migración productiva `20261010130000_property_image_phash_duplicates.sql`.

El indexador acepta la URL directa del proyecto Supabase o el proxy del sitio,
y exige que la ruta empiece con el ID del propietario. No descarga Unsplash ni
otros orígenes externos. Así evita solicitudes arbitrarias y coincidencias
engañosas entre anuncios que reutilizan fotos de stock.

La RPC de cobertura para moderadores AAL2 debe contar como elegibles solo las
publicaciones activas con al menos una imagen del bucket propio y de la carpeta
del propietario. Las filas que solo tengan enlaces externos o no tengan fotos
no forman parte del universo que pHash puede comparar. Un estado con cero hashes
no significa que no haya coincidencias.

Las señales con distancia de Hamming `<= 8/64` son orientativas. No publican,
rechazan ni ocultan anuncios; la decisión pertenece al moderador.
