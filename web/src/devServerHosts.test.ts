import { describe, expect, it } from 'vitest'
import { getDevServerAllowedHosts } from './devServerHosts.js'

describe('getDevServerAllowedHosts', () => {
  it('allows local development hosts by default', () => {
    expect(getDevServerAllowedHosts(undefined)).toEqual(['localhost', '127.0.0.1'])
  })

  it('allows only explicitly configured exact DNS hostnames', () => {
    expect(getDevServerAllowedHosts(
      ' Demo.TryCloudflare.com,127.0.0.1,*.example.com,https://evil.test,bad..host, bad host ',
    )).toEqual(['localhost', '127.0.0.1', 'demo.trycloudflare.com'])
  })

  it('deduplicates hostnames and rejects oversized DNS labels', () => {
    const oversizedLabel = `${'a'.repeat(64)}.example.com`
    expect(getDevServerAllowedHosts(`localhost,${oversizedLabel}`)).toEqual([
      'localhost',
      '127.0.0.1',
    ])
  })
})
