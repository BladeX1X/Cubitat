import decodeWebp, { init as initWebpDecoder } from '@jsquash/webp/decode'
import webpDecoderWasm from '@jsquash/webp/codec/dec/webp_dec.wasm'
import { logWorkerEvent } from './logger'
import { retryImageHashOperation } from './image-phash-retry'
import { getPropertyImageUrls } from './image-phash-urls'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_IMAGE_PIXELS = 16_000_000
const MAX_IMAGES_PER_PROPERTY = 2
const MAX_BACKFILL_PROPERTIES = 1
const MATCH_DISTANCE = 8
const PHASH_DIMENSION = 32
const PHASH_SIZE = 8
const COSINE = Array.from({ length: PHASH_SIZE }, (_, frequency) => (
  Float64Array.from({ length: PHASH_DIMENSION }, (_, position) => (
    Math.cos(((2 * position + 1) * frequency * Math.PI) / (2 * PHASH_DIMENSION))
  ))
))

type SupabaseProperty = {
  id: string
  user_id: string
  status: string
  cover_image: string | null
  images: string[] | null
}

export interface ImageDuplicateEnv {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  PUBLIC_SITE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

let decoderReady: Promise<void> | null = null

function initializeDecoder(): Promise<void> {
  decoderReady ??= initWebpDecoder({
    instantiateWasm(
      imports: WebAssembly.Imports,
      successCallback: (module: WebAssembly.Module) => void,
    ): WebAssembly.Exports {
      const instance = new WebAssembly.Instance(webpDecoderWasm, imports)
      ;(successCallback as unknown as (instance: WebAssembly.Instance) => void)(instance)
      return instance.exports
    },
  })
  return decoderReady
}

function calculatePerceptualHash(imageData: ImageData): string {
  const { data, width, height } = imageData
  if (width < 1 || height < 1) throw new Error('Invalid decoded image dimensions.')

  const grayscale = new Float64Array(PHASH_DIMENSION * PHASH_DIMENSION)
  for (let y = 0; y < PHASH_DIMENSION; y += 1) {
    const sourceY = Math.min(height - 1, Math.floor(((y + 0.5) * height) / PHASH_DIMENSION))
    for (let x = 0; x < PHASH_DIMENSION; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor(((x + 0.5) * width) / PHASH_DIMENSION))
      const offset = (sourceY * width + sourceX) * 4
      grayscale[y * PHASH_DIMENSION + x] = (
        0.299 * data[offset]! + 0.587 * data[offset + 1]! + 0.114 * data[offset + 2]!
      )
    }
  }

  const horizontal = new Float64Array(PHASH_DIMENSION * PHASH_SIZE)
  for (let y = 0; y < PHASH_DIMENSION; y += 1) {
    for (let u = 0; u < PHASH_SIZE; u += 1) {
      let sum = 0
      for (let x = 0; x < PHASH_DIMENSION; x += 1) {
        sum += grayscale[y * PHASH_DIMENSION + x]! * COSINE[u]![x]!
      }
      horizontal[y * PHASH_SIZE + u] = sum
    }
  }

  const coefficients: number[] = []
  for (let v = 0; v < PHASH_SIZE; v += 1) {
    for (let u = 0; u < PHASH_SIZE; u += 1) {
      let sum = 0
      for (let y = 0; y < PHASH_DIMENSION; y += 1) {
        sum += horizontal[y * PHASH_SIZE + u]! * COSINE[v]![y]!
      }
      coefficients.push(sum)
    }
  }

  const sorted = coefficients.slice(1).sort((left, right) => left - right)
  const median = sorted[Math.floor(sorted.length / 2)]!
  let hash = ''
  for (let bit = 0; bit < 64; bit += 1) {
    hash += coefficients[bit]! > median ? '1' : '0'
  }

  return hash
}

function readWebpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.subarray(8, 12)) !== 'WEBP') return null
  const chunkType = String.fromCharCode(...bytes.subarray(12, 16))
  const dataOffset = 20
  if (bytes.length < 30) return null

  if (chunkType === 'VP8X') {
    const width = 1 + bytes[dataOffset + 4]! + (bytes[dataOffset + 5]! << 8) + (bytes[dataOffset + 6]! << 16)
    const height = 1 + bytes[dataOffset + 7]! + (bytes[dataOffset + 8]! << 8) + (bytes[dataOffset + 9]! << 16)
    return { width, height }
  }

  if (chunkType === 'VP8 ' && bytes[dataOffset + 3] === 0x9d && bytes[dataOffset + 4] === 0x01 && bytes[dataOffset + 5] === 0x2a) {
    const width = ((bytes[dataOffset + 7]! << 8) | bytes[dataOffset + 6]!) & 0x3fff
    const height = ((bytes[dataOffset + 9]! << 8) | bytes[dataOffset + 8]!) & 0x3fff
    return { width, height }
  }

  if (chunkType === 'VP8L' && bytes[dataOffset] === 0x2f) {
    const width = 1 + bytes[dataOffset + 1]! + ((bytes[dataOffset + 2]! & 0x3f) << 8)
    const height = 1 + (bytes[dataOffset + 2]! >> 6) + (bytes[dataOffset + 3]! << 2) + ((bytes[dataOffset + 4]! & 0x0f) << 10)
    return { width, height }
  }

  return null
}

async function hashStoredImage(url: string, fetchFn: typeof fetch): Promise<string | null> {
  let reason: 'fetch_http' | 'fetch_network' | 'invalid_webp' | 'decoder_init' | 'decode' = 'fetch_network'
  let status: number | undefined
  try {
    const response = await fetchFn(url)
    status = response.status
    if (!response.ok) {
      reason = 'fetch_http'
      throw new Error('Stored image fetch failed.')
    }
    if (!/^image\/webp(?:;|$)/i.test(response.headers.get('content-type') ?? '')) return null

    const declaredLength = Number(response.headers.get('content-length') ?? '0')
    if (declaredLength > MAX_IMAGE_BYTES) return null
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength < 32 || bytes.byteLength > MAX_IMAGE_BYTES) return null
    const dimensions = readWebpDimensions(new Uint8Array(bytes))
    if (!dimensions || dimensions.width < 1 || dimensions.height < 1 || dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
      return null
    }

    reason = 'decoder_init'
    await initializeDecoder()
    reason = 'decode'
    const imageData = await decodeWebp(bytes)
    return calculatePerceptualHash(imageData)
  } catch {
    logWorkerEvent('warn', 'image_duplicate_decode_failed', { reason, status })
    throw new Error('Could not fetch or decode the stored WebP image.')
  }
}

async function requestSupabase(
  env: ImageDuplicateEnv,
  path: string,
  init: RequestInit,
  fetchFn: typeof fetch,
): Promise<Response> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Image duplicate service is not configured.')
  return fetchFn(`${env.VITE_SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

async function getUnindexedProperties(
  excludedPropertyId: string | null,
  env: ImageDuplicateEnv,
  fetchFn: typeof fetch,
): Promise<SupabaseProperty[]> {
  const response = await requestSupabase(
    env,
    '/rest/v1/rpc/get_unindexed_property_images',
    {
      method: 'POST',
      body: JSON.stringify({ p_exclude_property_id: excludedPropertyId, p_limit: MAX_BACKFILL_PROPERTIES }),
    },
    fetchFn,
  )
  if (!response.ok) throw new Error('Could not load existing properties for image comparison.')
  return await response.json() as SupabaseProperty[]
}

async function hashPropertyImages(
  property: SupabaseProperty,
  env: ImageDuplicateEnv,
  fetchFn: typeof fetch,
  maxImages = MAX_IMAGES_PER_PROPERTY,
): Promise<string[]> {
  const hashes: string[] = []
  for (const url of getPropertyImageUrls(property, env.VITE_SUPABASE_URL, env.PUBLIC_SITE_URL).slice(0, maxImages)) {
    const hash = await hashStoredImage(url, fetchFn)
    if (hash) hashes.push(hash)
  }
  return hashes
}

async function savePropertyHashes(
  propertyId: string,
  hashes: string[],
  env: ImageDuplicateEnv,
  fetchFn: typeof fetch,
): Promise<void> {
  const response = await requestSupabase(env, '/rest/v1/rpc/refresh_property_image_duplicate_signals', {
    method: 'POST',
    body: JSON.stringify({
      p_property_id: propertyId,
      p_hashes: hashes,
      p_max_distance: MATCH_DISTANCE,
    }),
  }, fetchFn)
  if (!response.ok) throw new Error('Could not save property image fingerprints.')
}

export async function refreshPropertyImageDuplicates(
  property: SupabaseProperty,
  env: ImageDuplicateEnv,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  try {
    await retryImageHashOperation(async () => {
      const hashes = await hashPropertyImages(property, env, fetchFn)
      await savePropertyHashes(property.id, hashes, env, fetchFn)
    })
  } catch {
    logWorkerEvent('error', 'image_duplicate_refresh_failed')
  }
}

export async function backfillPropertyImageDuplicates(
  env: ImageDuplicateEnv,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  try {
    const properties = await getUnindexedProperties(null, env, fetchFn)
    for (const property of properties) {
      await retryImageHashOperation(async () => {
        const hashes = await hashPropertyImages(property, env, fetchFn, 1)
        await savePropertyHashes(property.id, hashes, env, fetchFn)
      })
      await reconcilePendingImageMatches(property.id, env, fetchFn)
    }
  } catch {
    logWorkerEvent('error', 'image_duplicate_refresh_failed')
  }
}

async function reconcilePendingImageMatches(
  indexedPropertyId: string,
  env: ImageDuplicateEnv,
  fetchFn: typeof fetch,
): Promise<void> {
  const response = await requestSupabase(env, '/rest/v1/rpc/reconcile_unresolved_property_image_duplicates', {
    method: 'POST',
    body: JSON.stringify({ p_indexed_property_id: indexedPropertyId, p_max_distance: MATCH_DISTANCE }),
  }, fetchFn)
  if (!response.ok) throw new Error('Could not reconcile pending image matches.')
}

export async function loadOwnedPropertyForImageHashing(
  propertyId: string,
  userId: string,
  env: ImageDuplicateEnv,
  fetchFn: typeof fetch = fetch,
): Promise<SupabaseProperty | null> {
  const response = await requestSupabase(
    env,
    `/rest/v1/properties?select=id,user_id,status,cover_image,images&id=eq.${propertyId}&limit=1`,
    { method: 'GET' },
    fetchFn,
  )
  if (!response.ok) throw new Error(`Property lookup failed with HTTP ${response.status}.`)
  const properties = await response.json() as SupabaseProperty[]
  const property = properties[0]
  return property && property.user_id === userId ? property : null
}

export async function authenticateImageHashRequest(
  request: Request,
  env: ImageDuplicateEnv,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ') || !env.VITE_SUPABASE_ANON_KEY) return null
  try {
    const response = await fetchFn(`${env.VITE_SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: authorization },
    })
    if (!response.ok) return null
    const user = await response.json() as { id?: unknown }
    return typeof user.id === 'string' ? user.id : null
  } catch {
    return null
  }
}
