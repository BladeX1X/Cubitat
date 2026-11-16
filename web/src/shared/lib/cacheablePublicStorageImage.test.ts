import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  isCacheablePublicStorageImage,
  isPropertyImageCacheEntry,
  purgeLegacyPropertyImageCacheEntries,
} from './cacheablePublicStorageImage'

const appOrigin = 'https://cubitathome.com'
const supabaseUrl = 'https://cubitat.supabase.co'

describe('service worker property image cache security', () => {
  it('never adds property images back to the shared public image cache', () => {
    expect(isCacheablePublicStorageImage(
      new URL('https://cubitat.supabase.co/storage/v1/object/public/property_images/owner/photo.webp'),
      appOrigin,
      supabaseUrl,
    )).toBe(false)
    expect(isCacheablePublicStorageImage(
      new URL('https://cubitathome.com/api/supabase/storage/v1/object/public/property_images/owner/photo.webp'),
      appOrigin,
      supabaseUrl,
    )).toBe(false)
    expect(isCacheablePublicStorageImage(
      new URL('https://cubitat.supabase.co/storage/v1/object/public/property_images%2Fowner/photo.webp'),
      appOrigin,
      supabaseUrl,
    )).toBe(false)
  })

  it('keeps public avatar caching while excluding private object paths', () => {
    expect(isCacheablePublicStorageImage(
      new URL('https://cubitat.supabase.co/storage/v1/object/public/avatars/user/avatar.webp'),
      appOrigin,
      supabaseUrl,
    )).toBe(true)
    expect(isCacheablePublicStorageImage(
      new URL('https://cubitat.supabase.co/storage/v1/object/property_images/owner/photo.webp'),
      appOrigin,
      supabaseUrl,
    )).toBe(false)
  })

  it('recognizes only legacy public property image entries for deletion', () => {
    expect(isPropertyImageCacheEntry(
      new URL('https://cubitat.supabase.co/storage/v1/object/public/property_images/owner/photo.webp'),
      appOrigin,
      supabaseUrl,
    )).toBe(true)
    expect(isPropertyImageCacheEntry(
      new URL('https://cubitathome.com/api/supabase/storage/v1/object/public/property_images/owner/photo.webp'),
      appOrigin,
      supabaseUrl,
    )).toBe(true)
    expect(isPropertyImageCacheEntry(
      new URL('https://cubitat.supabase.co/storage/v1/object/public/property_images%2Fowner/photo.webp'),
      appOrigin,
      supabaseUrl,
    )).toBe(true)
    expect(isPropertyImageCacheEntry(
      new URL('https://cubitat.supabase.co/storage/v1/object/public/avatars/user/avatar.webp'),
      appOrigin,
      supabaseUrl,
    )).toBe(false)
    expect(isPropertyImageCacheEntry(
      new URL('https://attacker.example/api/supabase/storage/v1/object/public/property_images/owner/photo.webp'),
      appOrigin,
      supabaseUrl,
    )).toBe(false)
  })

  it('purges only property images from the existing runtime cache', async () => {
    const requests = [
      new Request('https://cubitat.supabase.co/storage/v1/object/public/property_images/owner/photo.webp'),
      new Request('https://cubitathome.com/api/supabase/storage/v1/object/public/property_images/owner/photo.webp'),
      new Request('https://cubitat.supabase.co/storage/v1/object/public/avatars/user/avatar.webp'),
    ]
    const remove = vi.fn(async () => true)
    const cache = { keys: vi.fn(async () => requests), delete: remove }
    const storage = {
      keys: vi.fn(async () => ['supabase-image-cache']),
      open: vi.fn(async () => cache),
    } as unknown as CacheStorage

    const count = await purgeLegacyPropertyImageCacheEntries(storage, appOrigin, supabaseUrl)

    expect(count).toBe(2)
    expect(remove).toHaveBeenCalledTimes(2)
    expect(remove).toHaveBeenCalledWith(requests[0])
    expect(remove).toHaveBeenCalledWith(requests[1])
    expect(remove).not.toHaveBeenCalledWith(requests[2])
  })

  it('does not create the runtime cache when no previous cache exists', async () => {
    const storage = {
      keys: vi.fn(async () => []),
      open: vi.fn(),
    } as unknown as CacheStorage

    await expect(purgeLegacyPropertyImageCacheEntries(storage, appOrigin, supabaseUrl)).resolves.toBe(0)
    expect(storage.open).not.toHaveBeenCalled()
  })

  it('removes the whole image cache if selective inspection fails', async () => {
    const removeCache = vi.fn(async () => true)
    const storage = {
      keys: vi.fn(async () => ['supabase-image-cache']),
      open: vi.fn(async () => { throw new Error('cache unavailable') }),
      delete: removeCache,
    } as unknown as CacheStorage

    await expect(purgeLegacyPropertyImageCacheEntries(storage, appOrigin, supabaseUrl)).resolves.toBe(0)
    expect(removeCache).toHaveBeenCalledWith('supabase-image-cache')
  })

  it('runs the purge during service worker activation', () => {
    const serviceWorker = readFileSync(resolve(process.cwd(), 'src/sw.ts'), 'utf8')

    expect(serviceWorker).toContain("self.addEventListener('activate'")
    expect(serviceWorker).toContain('purgeLegacyPropertyImageCacheEntries')
    expect(serviceWorker).toContain("cacheName: 'supabase-image-cache'")
    expect(serviceWorker).toContain('isCacheablePublicStorageImage(url, self.location.origin, import.meta.env.VITE_SUPABASE_URL)')
    expect(serviceWorker).toContain('new CacheableResponsePlugin({ statuses: [200] })')
    expect(serviceWorker).not.toContain('statuses: [0, 200]')
  })
})
