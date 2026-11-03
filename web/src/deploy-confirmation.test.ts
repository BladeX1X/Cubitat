import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const confirmationScript = resolve(process.cwd(), 'scripts/confirm-deploy.mjs')

describe('manual deployment guard', () => {
  it('requires lint, tests, the matching production build, confirmation, then Wrangler', () => {
    const { scripts } = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }
    const expectedProduction =
      'npm run lint && npm run test:run -- --maxWorkers=2 && npm run build:phase2-production && node scripts/confirm-deploy.mjs production && wrangler deploy --config wrangler.jsonc'

    expect(scripts.deploy).toBe(expectedProduction)
    expect(scripts['cf:deploy']).toBe('npm run deploy')
    expect(scripts['deploy:phase2-dev']).toBe(
      'npm run lint && npm run test:run -- --maxWorkers=2 && npm run build:phase2-dev && node scripts/confirm-deploy.mjs phase2-dev && wrangler deploy --config wrangler.phase2-dev.jsonc',
    )
  })

  it('requires a dynamic sitemap for the production build', () => {
    const { scripts } = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }

    expect(scripts['build:phase2-production']).toContain('node scripts/generate-sitemap.mjs --require-dynamic')
    expect(scripts['build:phase2-production:ci']).toContain('node scripts/generate-sitemap.mjs --static')

    const qualityWorkflow = readFileSync(resolve(process.cwd(), '..', '.github/workflows/phase2-quality.yml'), 'utf8')
    expect(qualityWorkflow).toContain('run: npm run build:phase2-production:ci')
  })

  it('blocks deployment from a non-interactive process', () => {
    const result = spawnSync(process.execPath, [confirmationScript, 'production'], {
      encoding: 'utf8',
      input: 'DEPLOY PRODUCTION\n',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('consola interactiva')
  })

  it('rejects unknown deployment targets', () => {
    const result = spawnSync(process.execPath, [confirmationScript, 'toString'], {
      encoding: 'utf8',
      input: 'DEPLOY PRODUCTION\n',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Destino inválido')
  })
})
