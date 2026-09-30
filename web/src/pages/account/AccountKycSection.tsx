import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { supabase } from '../../shared/lib/supabaseClient'
import { VerificationBadge } from '../../modules/kyc/components/VerificationBadge'
import { KycSubmissionModal } from '../../modules/kyc/components/KycSubmissionModal'
import type { VerificationStatus } from '../../modules/kyc/types'

type AccountKycSectionProps = { userId: string }

export function AccountKycSection({ userId }: AccountKycSectionProps) {
  const [kycStatus, setKycStatus] = useState<VerificationStatus>('unverified')
  const [kycReason, setKycReason] = useState<string | null>(null)
  const [isKycModalOpen, setIsKycModalOpen] = useState(false)

  useEffect(() => {
    let active = true

    async function loadKycProfile() {
      if (!userId) return
      const { data } = await supabase
        .from('profiles')
        .select('verification_status, verification_reason')
        .eq('id', userId)
        .maybeSingle()

      if (!active || !data) return
      setKycStatus((data.verification_status || 'unverified') as VerificationStatus)
      setKycReason(data.verification_reason || null)
    }

    void loadKycProfile()
    return () => { active = false }
  }, [userId])

  return (
    <>
      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><ShieldCheck size={20} /></div>
            <div><h2 className="text-base font-bold text-neutral-900">Verificación de Identidad (KYC)</h2><p className="text-xs text-neutral-500">Obtén la insignia oficial en tus publicaciones</p></div>
          </div>
          <VerificationBadge status={kycStatus} />
        </div>
        {kycStatus === 'unverified' ? <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4 sm:flex-row sm:items-center"><p className="text-xs text-neutral-600">Sube tu documento de identidad y una foto tuya sosteniéndolo para verificar tu cuenta.</p><Button onClick={() => setIsKycModalOpen(true)} className="h-11 shrink-0 rounded-full bg-[#035f53] text-xs font-bold text-white hover:bg-[#024a41]">Solicitar Verificación</Button></div> : null}
        {kycStatus === 'pending' ? <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800"><strong>Tus evidencias están en revisión.</strong> Nuestro equipo de moderación validará tu identidad en breve.</div> : null}
        {kycStatus === 'verified' ? <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-xs text-emerald-800"><strong>¡Cuenta Verificada!</strong> Tu perfil cuenta con el distintivo oficial de confianza.</div> : null}
        {kycStatus === 'rejected' ? <div className="space-y-2 rounded-xl border border-red-100 bg-red-50 p-4 text-xs text-red-800"><p><strong>Solicitud Rechazada:</strong> {kycReason || 'Las evidencias presentadas no pudieron validarse.'}</p><Button onClick={() => setIsKycModalOpen(true)} variant="outline" className="h-11 rounded-full border-red-200 bg-white text-xs font-bold text-red-700">Reenviar evidencias</Button></div> : null}
      </section>

      <KycSubmissionModal userId={userId} isOpen={isKycModalOpen} onClose={() => setIsKycModalOpen(false)} onSuccess={() => { setKycStatus('pending'); setKycReason(null) }} />
    </>
  )
}
