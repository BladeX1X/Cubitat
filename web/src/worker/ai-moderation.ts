import { logWorkerEvent } from './logger'

export interface AiModerationEnv {
  VITE_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  GROQ_API_KEY?: string
  GROQ_MODEL?: string
}

export interface AiModerationRequest {
  property_id: string
  title?: string
  location?: string
  description?: string
  price_usd?: string | number
  price_currency?: 'USD' | 'CUP' | 'MLC'
  property_type?: string
  images?: unknown[]
}

type AiModerationStatus = 'ai_approved' | 'ai_rejected' | 'pending_review'

interface GroqContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface GroqModerationResponse {
  choices?: Array<{
    message?: { content?: unknown }
  }>
}

interface AiModerationResult {
  status?: unknown
  reason?: unknown
}

function isAiModerationStatus(value: unknown): value is AiModerationStatus {
  return value === 'ai_approved' || value === 'ai_rejected' || value === 'pending_review'
}

function parseAiModerationResult(value: unknown): AiModerationResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const result = value as Record<string, unknown>
  return { status: result.status, reason: result.reason }
}

async function applyTrustedModeration(
  body: AiModerationRequest,
  status: AiModerationStatus,
  message: string,
  provider: 'groq' | null,
  env: AiModerationEnv,
  fetchFn: typeof fetch,
) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.')
  }

  const response = await fetchFn(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/set_property_ai_moderation_trusted`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      p_property_id: body.property_id,
      p_status: status,
      p_message: message,
      p_provider: provider,
    }),
  })

  if (!response.ok) {
    throw new Error(`Trusted moderation RPC failed with status ${response.status}.`)
  }
}

async function buildImagePart(
  dataUrl: unknown,
  supabaseUrl: string,
  fetchFn: typeof fetch,
): Promise<GroqContentPart | null> {
  if (typeof dataUrl !== 'string') return null
  if (dataUrl.startsWith('data:image/')) {
    return { type: 'image_url', image_url: { url: dataUrl } }
  }
  if (!dataUrl.startsWith(`${supabaseUrl}/storage/v1/object/public/property_images/`)) return null

  try {
    const imageResponse = await fetchFn(dataUrl)
    if (!imageResponse.ok) return null
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await imageResponse.arrayBuffer()
    if (arrayBuffer.byteLength <= 2000) return null

    let binary = ''
    const bytes = new Uint8Array(arrayBuffer)
    const chunkSize = 8192
    for (let index = 0; index < bytes.byteLength; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize)
      binary += String.fromCharCode(...chunk)
    }

    return {
      type: 'image_url',
      image_url: { url: `data:${contentType};base64,${btoa(binary)}` },
    }
  } catch {
    logWorkerEvent('warn', 'moderation_image_fetch_failed')
    return null
  }
}

export async function moderatePropertyWithAi(
  body: AiModerationRequest,
  env: AiModerationEnv,
  fetchFn: typeof fetch = fetch,
) {
  try {
    if (!env.GROQ_API_KEY) {
      await applyTrustedModeration(
        body,
        'pending_review',
        'IA deshabilitada. Pendiente de revisión manual.',
        null,
        env,
        fetchFn,
      )
      return
    }

    const systemPrompt = `Eres un moderador experto de bienes raíces en Cuba para la plataforma Cubitat.
Tu tarea es analizar el siguiente anuncio y determinar si cumple con las reglas (sin lenguaje ofensivo, sin spam evidente, precio razonable, descripción coherente).
IMPORTANTE: Si se adjuntan imágenes, analízalas también. Rechaza el anuncio si las imágenes contienen desnudos, violencia, contenido irrelevante que no sea de propiedades, o exceso de texto promocional (spam).
Responde Únicamente con un objeto JSON válido, sin texto adicional, con exactamente estas dos propiedades:
"status": "ai_approved" o "ai_rejected".
"reason": Una breve explicación de por qué lo aprobaste o rechazaste. Incluye una descripción breve de las imágenes si se adjuntaron.`

    const userContent: GroqContentPart[] = [{
      type: 'text',
      text: `${systemPrompt}\n\nAnuncio a moderar:\nTítulo: ${body.title}\nUbicación: ${body.location}\nDescripción: ${body.description}\nPrecio: ${body.price_usd} ${body.price_currency ?? 'USD'}\nTipo: ${body.property_type}`,
    }]

    for (const image of Array.isArray(body.images) ? body.images.slice(0, 3) : []) {
      const imagePart = await buildImagePart(image, env.VITE_SUPABASE_URL, fetchFn)
      if (imagePart) userContent.push(imagePart)
    }

    let finalStatus: AiModerationStatus = 'pending_review'
    let finalReason = ''

    try {
      const groqApiKey = env.GROQ_API_KEY.trim().replace(/[\r\n]/g, '')
      const groqModel = env.GROQ_MODEL?.trim() || 'qwen/qwen3.8-27b'
      const groqResponse = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [{ role: 'user', content: userContent }],
          temperature: 0.7,
          max_completion_tokens: 512,
          reasoning_effort: 'none',
          response_format: { type: 'json_object' },
        }),
      })

      const groqJson = await groqResponse.json() as GroqModerationResponse
      if (!groqResponse.ok) {
        if (groqResponse.status === 429) {
          finalReason = 'Servicio de IA temporalmente saturado. Pendiente de revisión manual.'
        } else {
          logWorkerEvent('warn', 'moderation_provider_request_failed', {
            source: 'groq',
            status: groqResponse.status,
          })
          finalReason = 'Servicio de IA no disponible. Pendiente de revisión manual.'
        }
      } else {
        const rawText = groqJson.choices?.[0]?.message?.content
        if (typeof rawText === 'string' && rawText.length > 0) {
          try {
            const cleanText = rawText.replace(/```(?:json)?/gi, '').trim()
            const aiResult = parseAiModerationResult(JSON.parse(cleanText))
            if (aiResult && isAiModerationStatus(aiResult.status)) {
              finalStatus = aiResult.status
              finalReason = typeof aiResult.reason === 'string' ? aiResult.reason : ''
            } else {
              finalReason = 'Respuesta de IA no válida. Pendiente de revisión manual.'
            }
          } catch {
            finalReason = 'Fallo al interpretar respuesta de IA. Pendiente de revisión manual.'
          }
        } else {
          finalReason = 'No hay texto en IA. Pendiente de revisión manual.'
        }
      }
    } catch {
      finalReason = 'Fallo de conexión con IA. Pendiente de revisión manual.'
    }

    await applyTrustedModeration(body, finalStatus, finalReason, 'groq', env, fetchFn)
  } catch {
    logWorkerEvent('error', 'moderation_background_failed')
  }
}
