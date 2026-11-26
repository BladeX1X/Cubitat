import { useCallback, useEffect, useState } from 'react'
import { Copy, Link2, RefreshCw } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { ensureAgentReferralCode, getAgentReferralLink, loadAgentReferralCode } from '../referrals/agentReferralRepository'

export function AgentGrowthPanel() {
  const [loading, setLoading] = useState(true)
  const [referralLink, setReferralLink] = useState<string | null>(null)
  const [referralBusy, setReferralBusy] = useState(false)
  const [referralMessage, setReferralMessage] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const code = await loadAgentReferralCode()
      const savedLink = code ? getAgentReferralLink(code) : null
      setReferralLink(savedLink)
      setReferralMessage(savedLink ? 'Tu enlace guardado está listo para compartir.' : null)
    } catch {
      setReferralLink(null)
      setReferralMessage('No se pudo recuperar el enlace guardado. Vuelve a cargar el panel.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  async function handleCreateReferralLink() {
    if (referralBusy) return
    setReferralBusy(true)
    setReferralMessage(null)
    try {
      const code = await ensureAgentReferralCode()
      const link = getAgentReferralLink(code)
      if (!link) throw new Error('invalid_referral_link')
      setReferralLink(link)
      setReferralMessage('Tu enlace está listo para compartir.')
    } catch {
      setReferralMessage('No se pudo crear el enlace. Verifica que tu cuenta siga verificada e inténtalo de nuevo.')
    } finally {
      setReferralBusy(false)
    }
  }

  async function handleCopyReferralLink() {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setReferralMessage('Enlace copiado. Las cuentas nuevas que se registren desde él quedarán atribuidas a ti.')
    } catch {
      setReferralMessage('No se pudo copiar automáticamente. Selecciona y copia el enlace mostrado.')
    }
  }

  return (
    <section aria-labelledby="agent-growth-title" className="mt-8 space-y-5">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#035f53]">Captación</p>
        <h2 id="agent-growth-title" className="mt-1 text-xl font-black text-neutral-900">Captación de usuarios</h2>
        <p className="mt-1 text-sm text-neutral-600">Comparte tu enlace para invitar a nuevas personas a crear su cuenta en Cubitat.</p>
      </header>

      {loading ? <div role="status" className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">Cargando tu enlace de captación…</div> : (
        <section aria-labelledby="agent-signup-link-title" className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Link2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#035f53]" />
            <div className="min-w-0 flex-1">
              <h3 id="agent-signup-link-title" className="font-bold text-neutral-900">Invita personas a crear su cuenta</h3>
              <p className="mt-1 text-sm text-neutral-700">Quienes se registren desde tu enlace quedarán atribuidos a ti.</p>
              {referralLink ? <label className="mt-3 block text-xs font-semibold text-neutral-700">Tu enlace de registro<input readOnly value={referralLink} onFocus={(event) => event.currentTarget.select()} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm font-normal" /></label> : null}
              {referralMessage ? <p role="status" className="mt-2 text-sm text-neutral-700">{referralMessage}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleCreateReferralLink()} disabled={referralBusy} className="min-h-11 bg-[#035f53] text-white">
                  <Link2 className="mr-2 h-4 w-4" />{referralBusy ? 'Preparando…' : referralLink ? 'Actualizar enlace' : 'Crear mi enlace'}
                </Button>
                {referralLink ? <Button type="button" variant="outline" onClick={() => void handleCopyReferralLink()} className="min-h-11"><Copy className="mr-2 h-4 w-4" />Copiar enlace</Button> : null}
                {referralMessage?.startsWith('No se pudo recuperar') ? <Button type="button" variant="outline" onClick={() => void reload()} className="min-h-11"><RefreshCw className="mr-2 h-4 w-4" />Reintentar</Button> : null}
              </div>
            </div>
          </div>
        </section>
      )}
    </section>
  )
}
