import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'src/pages/marketplace/MarketplaceDirectoryMap.css'), 'utf8')
const appStyles = readFileSync(resolve(process.cwd(), 'src/styles/app.css'), 'utf8')

describe('Marketplace directory responsive layout', () => {
  it('lets the phone header scroll away and keeps the search bar visible at the top', () => {
    expect(styles).toMatch(/@media\s*\(max-width:\s*620px\)[\s\S]*?\.marketplace-filter-toolbar\s*\{\s*top:\s*8px;/)
    expect(styles).toMatch(/\.marketplace-filter-toolbar\s*\{[\s\S]*?z-index:\s*130;/)
    expect(appStyles).toMatch(/@media\s*\(max-width:\s*620px\)[\s\S]*?\.is-directory-page\s+\.site-header\s*\{\s*position:\s*relative;/)
    expect(readFileSync(resolve(process.cwd(), 'src/app/CubitatApp.tsx'), 'utf8'))
      .toMatch(/pageMode === 'services' \|\| pageMode === 'materials' \? 'is-directory-page'/)
  })

  it('keeps the map action in document flow so it cannot cover catalog cards', () => {
    expect(styles).toMatch(/\.marketplace-map-floating-actions\s*\{\s*position:\s*static;/)
    expect(styles).not.toMatch(/\.marketplace-map-floating-actions\s*\{[^}]*position:\s*fixed/)
  })

  it('keeps catalog actions in the compact directory heading', () => {
    expect(styles).toMatch(/\.marketplace-directory-heading\s*\{[\s\S]*?display:\s*flex;/)
    expect(styles).toMatch(/\.marketplace-directory-heading__actions\s*\{[\s\S]*?display:\s*flex;/)
  })

  it('provides 48px touch targets for mobile directory filters and map controls', () => {
    expect(styles).toMatch(/@media\s*\(any-pointer:\s*coarse\)[\s\S]*?\.marketplace-map-floating-toggle/)
    expect(styles).toMatch(/\.marketplace-province-map \.maplibregl-ctrl-group button,[\s\S]*?\.map-fullscreen-overlay \.maplibregl-ctrl-group button\s*\{\s*width:\s*48px;\s*height:\s*48px;/)
    expect(styles).toMatch(/\.marketplace-province-map \.marketplace-map-close\s*\{[^}]*?width:\s*48px;[^}]*?height:\s*48px;/)
    expect(appStyles).toMatch(/\.mobile-catalog-shortcuts button\s*\{[^}]*?min-height:\s*48px;/)
    expect(styles).toMatch(/\.marketplace-filter-toolbar__trigger\s*\{[^}]*?(?:height:\s*48px|height:\s*48px\s*!important)/)
    expect(styles).toMatch(/\.catalog-filter-sheet__footer button[^}]*?min-height:\s*48px\s*!important/)
    expect(styles).toMatch(/\.marketplace-filter-toolbar__search > label input[^}]*?font-size:\s*16px/)
    expect(styles).toMatch(/\.marketplace-contact-actions > \.grid\.grid-cols-2 > button,[\s\S]*?\.border-t\.border-neutral-100\.p-4 > \.grid\.grid-cols-2 > button,[\s\S]*?\.marketplace-contact-actions__buttons > button\s*\{\s*height:\s*48px\s*!important;\s*min-height:\s*48px\s*!important/)
    expect(styles).toMatch(/@media\s*\(max-width:\s*768px\)[\s\S]*?\.catalog-pagination > button,[\s\S]*?\.catalog-pagination__page\s*\{\s*height:\s*48px\s*!important;\s*min-height:\s*48px\s*!important/)
    expect(styles).toMatch(/\.catalog-pagination__page\s*\{\s*width:\s*48px/)
  })
})
