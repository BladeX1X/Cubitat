import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = resolve(process.cwd(), 'src')
const allowedConsoleFiles = new Set([
  'shared/lib/logger.ts',
  'worker/logger.ts',
  'worker.ts',
])

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(entryPath)
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) return []
    return [entryPath]
  })
}

describe('frontend logging architecture', () => {
  it('keeps direct console output behind the approved loggers', () => {
    const offenders = collectSourceFiles(sourceRoot).flatMap((filePath) => {
      const repoPath = relative(sourceRoot, filePath).replaceAll('\\', '/')
      if (allowedConsoleFiles.has(repoPath) || repoPath.startsWith('worker/')) return []

      return readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .flatMap((line, index) => /console\.(log|warn|error|info|debug)\s*\(/.test(line)
          ? [`${repoPath}:${index + 1}`]
          : [])
    })

    expect(offenders).toEqual([])
  })
})
