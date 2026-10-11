import { describe, expect, it } from 'vitest'

import { getPropertyImageUrls } from './image-phash-urls'

const property = {
  user_id: 'owner-1',
  cover_image: null,
  images: null as string[] | null,
}

describe('getPropertyImageUrls', () => {
  it('accepts DEV storage URLs served through the Worker proxy', () => {
    const proxyImage = 'https://cubitat1-phase2-dev.pochiprats18.workers.dev/api/supabase/storage/v1/object/public/property_images/owner-1/house.webp'
    const directImage = 'https://bknwerqbbysveehcdmzr.supabase.co/storage/v1/object/public/property_images/owner-1/house.webp'

    expect(getPropertyImageUrls({ ...property, cover_image: proxyImage }, 'https://bknwerqbbysveehcdmzr.supabase.co', 'https://cubitat1-phase2-dev.pochiprats18.workers.dev'))
      .toEqual([directImage])
  })

  it('continues accepting direct project storage URLs', () => {
    const directImage = 'https://bknwerqbbysveehcdmzr.supabase.co/storage/v1/object/public/property_images/owner-1/house.webp'

    expect(getPropertyImageUrls({ ...property, cover_image: directImage }, 'https://bknwerqbbysveehcdmzr.supabase.co', 'https://cubitat1-phase2-dev.pochiprats18.workers.dev'))
      .toEqual([directImage])
  })

  it('rejects other hosts, user folders, and duplicate gallery URLs', () => {
    const valid = 'https://cubitat1-phase2-dev.pochiprats18.workers.dev/api/supabase/storage/v1/object/public/property_images/owner-1/house.webp'
    const otherOwner = 'https://cubitat1-phase2-dev.pochiprats18.workers.dev/api/supabase/storage/v1/object/public/property_images/owner-2/house.webp'
    const otherHost = 'https://example.com/api/supabase/storage/v1/object/public/property_images/owner-1/house.webp'

    expect(getPropertyImageUrls({ ...property, cover_image: valid, images: [valid, otherOwner, otherHost] }, 'https://bknwerqbbysveehcdmzr.supabase.co', 'https://cubitat1-phase2-dev.pochiprats18.workers.dev'))
      .toEqual(['https://bknwerqbbysveehcdmzr.supabase.co/storage/v1/object/public/property_images/owner-1/house.webp'])
  })
})
