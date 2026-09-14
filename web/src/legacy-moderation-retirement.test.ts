import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Follow the entire production chain: a historical grant must be revoked by
// a later migration, not merely absent from the newest file.
describe('legacy moderation RPC retirement', () => {
  it('revokes all API callers after the historical authenticated grant', () => {
    const directory = resolve('supabase/migrations')
    const sql = readdirSync(directory).filter((file) => file.endsWith('.sql')).sort()
      .map((file) => readFileSync(resolve(directory, file), 'utf8')).join('\n')
    const legacyGrant = sql.lastIndexOf('GRANT EXECUTE ON FUNCTION public.set_property_ai_moderation(uuid, public.property_status, text) TO authenticated')
    const legacyRevoke = sql.lastIndexOf('REVOKE ALL ON FUNCTION public.set_property_ai_moderation(uuid, public.property_status, text) FROM PUBLIC, anon, authenticated, service_role')
    expect(legacyGrant).toBeGreaterThan(-1)
    expect(legacyRevoke).toBeGreaterThan(legacyGrant)
  })
})
