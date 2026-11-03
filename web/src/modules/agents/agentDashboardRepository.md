# Repositorio del panel privado de agente

`loadAgentDashboard` carga primero el perfil y solo consulta anuncios para un
usuario con rol `agent`/`admin` y KYC verificado. `view_count` es una columna
permitida para el dashboard autenticado. Los contadores privados de teléfono y
WhatsApp se obtienen por `get_own_property_contact_metrics()`, RPC que deriva la
identidad desde `auth.uid()` y devuelve únicamente anuncios del propio agente.
No se envían IDs de dueño ni se da acceso `SELECT` a las columnas privadas.

Si falla la consulta RPC, se conserva la lista de anuncios, se dejan los
contadores como `undefined` y la interfaz muestra “no disponibles” en vez de
confundir el fallo con un valor cero.
