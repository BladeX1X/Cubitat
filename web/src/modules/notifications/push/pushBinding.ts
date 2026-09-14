// Shared by the window and service worker. Cache survives worker suspension.
const CACHE_NAME = 'cubitat-push-account-v1'
const BINDING_PATH = '/__push_account_binding__'
export interface PushBinding { userId: string | null; endpoint: string | null }

export async function readPushBinding(): Promise<PushBinding | null> {
  if (typeof caches === 'undefined') return null
  const cache = await caches.open(CACHE_NAME)
  const response = await cache.match(BINDING_PATH)
  return response ? await response.json() as PushBinding : null
}

export async function writePushBinding(binding: PushBinding) {
  if (typeof caches === 'undefined') return
  const cache = await caches.open(CACHE_NAME)
  await cache.put(BINDING_PATH, new Response(JSON.stringify(binding)))
}

export async function mayShowPush(endpoint: unknown, userId: unknown) {
  if (typeof endpoint !== 'string' || typeof userId !== 'string') return false
  const binding = await readPushBinding()
  return binding?.endpoint === endpoint && binding.userId === userId
}
