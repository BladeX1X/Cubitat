import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'src/pages/marketplace/MarketplaceDirectoryMap.css'), 'utf8')

describe('Marketplace directory responsive layout', () => {
  it('keeps the mobile filter bar below the sticky header', () => {
    expect(styles).toMatch(/@media\s*\(max-width:\s*620px\)[\s\S]*?\.marketplace-filter-toolbar\s*\{\s*top:\s*64px;/)
    expect(styles).toMatch(/\.marketplace-filter-toolbar\s*\{[\s\S]*?z-index:\s*130;/)
  })

  it('keeps the floating map action above the mobile navigation', () => {
    expect(styles).toMatch(/@media\s*\(max-width:\s*620px\)[\s\S]*?\.marketplace-map-floating-actions\s*\{\s*bottom:\s*calc\(82px\s*\+\s*env\(safe-area-inset-bottom\)\);/)
  })

  it('keeps catalog actions in the compact directory heading', () => {
    expect(styles).toMatch(/\.marketplace-directory-heading\s*\{[\s\S]*?display:\s*flex;/)
    expect(styles).toMatch(/\.marketplace-directory-heading__actions\s*\{[\s\S]*?display:\s*flex;/)
  })
})
