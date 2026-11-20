import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveSitemapMode, shouldWriteSourceSitemap } from './sitemap-mode.mjs'

describe('sitemap build mode', () => {
  it('uses the site proxy when public Supabase configuration is absent', () => {
    expect(resolveSitemapMode({})).toBe('proxy')
  })

  it('uses the dynamic inventory only when both public Supabase values exist', () => {
    expect(resolveSitemapMode({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
    })).toBe('dynamic')
  })

  it('uses the proxy when only the Supabase URL is available', () => {
    expect(() => resolveSitemapMode({ supabaseUrl: 'https://example.supabase.co' }))
      .not.toThrow()
    expect(resolveSitemapMode({ supabaseUrl: 'https://example.supabase.co' })).toBe('proxy')
  })

  it('rejects a key without a project URL', () => {
    expect(() => resolveSitemapMode({ supabaseAnonKey: 'public-anon-key' }))
      .toThrow('Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for a dynamic sitemap.')
  })

  it('keeps the inventory dynamic through the site proxy when local credentials are absent', () => {
    expect(resolveSitemapMode({ requestedMode: 'dynamic' })).toBe('proxy')
  })

  it('keeps static and proxy build output away from tracked public sitemap sources', () => {
    expect(shouldWriteSourceSitemap({ mode: 'static', phase2Dev: false })).toBe(false)
    expect(shouldWriteSourceSitemap({ mode: 'proxy', phase2Dev: false })).toBe(false)
    expect(shouldWriteSourceSitemap({ mode: 'dynamic', phase2Dev: false })).toBe(true)
    expect(shouldWriteSourceSitemap({ mode: 'dynamic', phase2Dev: true })).toBe(false)
  })

  it('runs the explicit static generator offline and preserves source SEO files', () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), 'cubitat-sitemap-offline-'))
    const publicDirectory = join(tempDirectory, 'public')
    const distDirectory = join(tempDirectory, 'dist')
    mkdirSync(publicDirectory)
    mkdirSync(distDirectory)
    const sourceSitemap = '<source-sitemap-preserved />'
    const sourceRobots = 'source-robots-preserved'
    writeFileSync(join(publicDirectory, 'sitemap.xml'), sourceSitemap)
    writeFileSync(join(publicDirectory, 'robots.txt'), sourceRobots)

    const env = { ...process.env }
    delete env.VITE_SUPABASE_URL
    delete env.VITE_SUPABASE_ANON_KEY
    delete env.SITEMAP_MODE
    try {
      const result = spawnSync(process.execPath, [resolve('scripts/generate-sitemap.mjs'), '--static'], {
        cwd: tempDirectory,
        env,
        encoding: 'utf8',
      })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('static)')
      expect(readFileSync(join(publicDirectory, 'sitemap.xml'), 'utf8')).toBe(sourceSitemap)
      expect(readFileSync(join(publicDirectory, 'robots.txt'), 'utf8')).toBe(sourceRobots)
      expect(readFileSync(join(distDirectory, 'sitemap.xml'), 'utf8')).toContain('https://cubitathome.com/')

    } finally {
      rmSync(tempDirectory, { recursive: true, force: true })
    }
  })
})
