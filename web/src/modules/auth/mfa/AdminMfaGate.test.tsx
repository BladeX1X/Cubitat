import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminMfaGate } from './AdminMfaGate'

const { getAal, listFactors, rpc } = vi.hoisted(() => ({
  getAal: vi.fn(),
  listFactors: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    rpc,
    auth: { mfa: { getAuthenticatorAssuranceLevel: getAal, listFactors } },
  },
}))

describe('AdminMfaGate mientras MFA administrativo está apagado', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deja pasar al administrador sin consultar ni pedir el segundo factor', () => {
    getAal.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null })
    listFactors.mockResolvedValue({
      data: { all: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }], totp: [{ id: 'factor-1' }] },
      error: null,
    })

    render(<AdminMfaGate onSessionExpired={vi.fn()}><div>Contenido administrativo</div></AdminMfaGate>)

    expect(screen.getByText('Contenido administrativo')).toBeInTheDocument()
    expect(screen.queryByText(/segundo factor|verificación administrativa/i)).toBeNull()
    expect(rpc).not.toHaveBeenCalled()
    expect(getAal).not.toHaveBeenCalled()
    expect(listFactors).not.toHaveBeenCalled()
  })
})
