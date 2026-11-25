import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'src/pages/results/ResultsPage.css'), 'utf8')
const appStyles = readFileSync(resolve(process.cwd(), 'src/styles/app.css'), 'utf8')

describe('Results mobile touch targets', () => {
  it('sticks the mobile search toolbar near the viewport top after the header scrolls away', () => {
    expect(styles).toMatch(/\.app-shell\.is-results-page \.results-toolbar-full\s*\{[^}]*?position:\s*sticky;[^}]*?top:\s*8px;/)
  })

  it('uses the full viewport for the filter sheet on the narrowest phones', () => {
    expect(styles).toMatch(/@media\s*\(max-width:\s*360px\)[\s\S]*?\.mobile-filter-sheet__panel\s*\{[^}]*?width:\s*100vw;[^}]*?max-width:\s*100vw;/)
  })

  it('uses 48px targets for the primary mobile actions', () => {
    expect(styles).toMatch(/\.map-fullscreen-overlay \.maplibregl-ctrl-group button\s*\{\s*width:\s*48px;\s*height:\s*48px;/)
    expect(styles).toMatch(/\.map-fullscreen-overlay \.maplibregl-ctrl-top-right\s*\{\s*top:\s*calc\(132px \+ env\(safe-area-inset-top\)\);/)
    expect(styles).toMatch(/\.app-shell\.is-results-page \.mobile-menu-button[\s\S]*?width:\s*48px;[\s\S]*?height:\s*48px;/)
    expect(styles).toMatch(/\.app-shell\.is-results-page \.sort-button[\s\S]*?min-height:\s*48px/)
    expect(styles).toMatch(/\.app-shell\.is-results-page \.property-save[\s\S]*?width:\s*48px;[\s\S]*?height:\s*48px;/)
    expect(styles).toMatch(/\.app-shell\.is-results-page \.property-contact-btn,[\s\S]*?height:\s*48px\s*!important/)
    expect(styles).toMatch(/\.marketplace-map-floating-toggle,[\s\S]*?height:\s*48px\s*!important/)
    expect(styles).toMatch(/\.app-shell\.is-results-page \.results-pagination > div button\s*\{[^}]*?min-width:\s*48px;[^}]*?min-height:\s*48px;/)
  })

  it('anchors property contact buttons to the bottom of equal-height cards', () => {
    expect(styles).toMatch(/\.app-shell\.is-results-page \.results-desktop-shell \.property-actions\s*\{[^}]*?margin-top:\s*auto;/)
  })

  it('keeps the results map toggle floating at the bottom with the shared marketplace control', () => {
    expect(styles).toMatch(/\.marketplace-map-floating-actions\s*\{[^}]*?position:\s*fixed;[^}]*?bottom:\s*calc\(18px \+ env\(safe-area-inset-bottom\)\)/)
    expect(styles).toMatch(/\.marketplace-map-floating-toggle\s*\{[^}]*?min-height:\s*48px/)
  })

  it('uses a 16px font for search inputs on touch screens', () => {
    expect(styles).toMatch(/\.app-shell\.is-results-page \.filter-search-field input[\s\S]*?font-size:\s*16px/)
    expect(styles).toMatch(/\.map-overlay-filterbar \.filter-search-field input[\s\S]*?font-size:\s*16px/)
    expect(styles).toMatch(/\.app-shell\.is-results-page \.filter-search-field input,[\s\S]*?\.map-overlay-filterbar \.filter-search-field input\s*\{[^}]*?min-height:\s*48px;/)
  })

  it('keeps all controls in the full-screen mobile map reachable by touch', () => {
    expect(styles).toMatch(/\.map-fullscreen-overlay \.map-bottom-bar button\s*\{[^}]*?min-height:\s*48px;[^}]*?height:\s*48px;/)
    expect(styles).toMatch(/\.map-fullscreen-overlay \.map-carousel-close\s*\{[^}]*?width:\s*48px;[^}]*?height:\s*48px;/)
    expect(styles).toMatch(/\.map-fullscreen-overlay \.maplibregl-ctrl-group button\s*\{\s*width:\s*48px;\s*height:\s*48px;/)
  })

  it('keeps shared mobile header and footer actions at 48px on touch screens', () => {
    expect(appStyles).toMatch(/@media\s*\(any-pointer:\s*coarse\)[\s\S]*?\.header-actions > button[\s\S]*?min-height:\s*48px/)
    expect(appStyles).toMatch(/\.site-footer button[\s\S]*?min-height:\s*48px/)
  })
})
