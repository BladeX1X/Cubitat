# Reputación de profesionales del hogar

## Propósito

Ofrecer reseñas públicas moderadas como extensión optativa del directorio. El
directorio debe poder operar y compilar aunque esta extensión esté desactivada.

## Requisitos

### Reseñas

- **GIVEN** el módulo de directorio está activo
- **WHEN** una persona autenticada envía una reseña para un profesional distinto
- **THEN** la reseña queda pendiente y solo se publica tras moderación
- **AND** existe como máximo una reseña vigente por autor/profesional
- **AND** la reseña no equivale a una contratación verificada ni a una garantía
- **AND** la lectura pública nunca incluye la identidad interna del autor

### Denuncia y retiro

- **WHEN** el autor solicita retirar una reseña o una persona la denuncia
- **THEN** el módulo guarda una solicitud privada y la expone a la cola de
  moderación sin revelar al público la identidad del denunciante
- **AND** la retirada del autor deja de mostrar la reseña inmediatamente y
  conserva la solicitud en la cola privada de seguimiento

### Aislamiento

- El módulo consume solo el identificador público opaco del profesional y el
  contrato de moderación; no lee ni modifica perfiles del directorio.
- Si se desactiva, desaparecen rutas, controles y consultas de reseñas sin
  afectar listado, detalle o contacto de profesionales.
- Una decisión de moderación requiere rol administrativo y AAL2 y deja auditoría.
- El panel de reseñas solo aparece junto al detalle de un profesional cuando
  F4-REV está habilitado; F4-SVC compila y opera sin cargar sus consultas/chunk.
