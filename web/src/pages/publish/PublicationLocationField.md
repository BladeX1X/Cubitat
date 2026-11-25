# PublicationLocationField

Campo de ubicación compartido por la publicación de servicios y materiales.

- Provincia y municipio son selecciones dependientes tomadas de
  `shared/data/cubaLocations.ts`; cambiar de provincia reinicia el municipio.
- El botón «Usar mi ubicación» llama a la geolocalización del navegador solo
  después de una acción explícita del usuario. La página debe estar en un origen
  seguro (HTTPS) y el usuario debe conceder permiso.
- Los errores de permiso, disponibilidad y tiempo se muestran con mensajes
  claros; no se exponen detalles internos del navegador.
- El mapa aparece con la selección administrativa o con coordenadas disponibles.
  Un punto del mapa o del dispositivo se mantiene como coordenada privada según
  el contrato de cada repositorio; cambiar provincia/municipio descarta el punto
  anterior para evitar asociar coordenadas a otra zona.
- En perfiles de servicio, el municipio elegido se añade a los municipios de
  cobertura junto con las zonas adicionales escritas por el anunciante.
