import { useEffect, useState } from 'react'
import { BarChart3, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent } from '../../shared/lib/logger'
import { VerificationBadge } from '../../modules/kyc/components/VerificationBadge'
import { KycSubmissionModal } from '../../modules/kyc/components/KycSubmissionModal'
import type { VerificationStatus } from '../../modules/kyc/types'

type AccountPhaseTwoSectionsProps = {
  userId: string
  userRole?: string
  onRoleChange?: (newRole: string) => void
  onResolvedRole: (newRole: string) => void
  onNavigateAgentDashboard?: () => void
}

export function AccountPhaseTwoSections({
  userId,
  userRole,
  onRoleChange,
  onResolvedRole,
  onNavigateAgentDashboard,
}: AccountPhaseTwoSectionsProps) {
  const [kycStatus, setKycStatus] = useState<VerificationStatus>('unverified')
  const [kycReason, setKycReason] = useState<string | null>(null)
  const [isKycModalOpen, setIsKycModalOpen] = useState(false)
  const [isSavingRole, setIsSavingRole] = useState(false)
  const [roleMessage, setRoleMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadPhaseTwoProfile() {
      if (!userId) return
      const { data } = await supabase
        .from('profiles')
        .select('role, verification_status, verification_reason')
        .eq('id', userId)
        .maybeSingle()

      if (!active || !data) return
      if (data.role) onResolvedRole(data.role)
      setKycStatus((data.verification_status || 'unverified') as VerificationStatus)
      setKycReason(data.verification_reason || null)
    }

    void loadPhaseTwoProfile()
    return () => { active = false }
  }, [onResolvedRole, userId])

  async function handleSaveRole(targetMode: 'user' | 'agent') {
    const dbRole = targetMode === 'agent' ? 'agent' : 'buyer'
    if (isSavingRole) return
    if (!userId) {
      setRoleMessage('No se pudo identificar la sesión de usuario.')
      return
    }

    setIsSavingRole(true)
    setRoleMessage(null)

    try {
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role, verification_status')
        .eq('id', userId)
        .single()

      if (profileError || !currentProfile || !['buyer', 'agent'].includes(currentProfile.role)) {
        setRoleMessage('No se pudo validar el tipo de cuenta actual.')
        return
      }

      const currentKycStatus = (currentProfile.verification_status || 'unverified') as VerificationStatus
      onResolvedRole(currentProfile.role)
      setKycStatus(currentKycStatus)

      if (dbRole === 'agent' && currentKycStatus !== 'verified') {
        setRoleMessage('Necesitas completar y aprobar la verificación de identidad (KYC) antes de activar el perfil de agente.')
        return
      }

      if (currentProfile.role === dbRole) {
        setRoleMessage('Tipo de cuenta actualizado correctamente.')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ role: dbRole })
        .eq('id', userId)
        .select('role')
        .single()

      if (error || data?.role !== dbRole) {
        setRoleMessage('No se pudo actualizar el tipo de cuenta.')
        return
      }

      onResolvedRole(dbRole)
      onRoleChange?.(dbRole)
      setRoleMessage('Tipo de cuenta actualizado correctamente.')
      logSafeEvent({ module: 'account', action: 'update_role', level: 'info' })
    } catch {
      setRoleMessage('Ocurrió un error al guardar el tipo de perfil.')
    } finally {
      setIsSavingRole(false)
    }
  }

  return (
    <>
      {userRole === 'agent' && onNavigateAgentDashboard ? (
        <section className="rounded-xl border border-[#035f53]/20 bg-emerald-50/60 p-4 shadow-sm sm:p-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#035f53] text-white"><BarChart3 size={20} /></div>
              <div>
                <h2 className="text-base font-bold text-neutral-900">Panel de Agente</h2>
                <p className="text-xs text-neutral-600">Revisa visualizaciones, contactos registrados y gestiona la visibilidad de tus propiedades.</p>
              </div>
            </div>
            <Button onClick={onNavigateAgentDashboard} className="h-11 shrink-0 rounded-full bg-[#035f53] px-5 text-xs font-bold text-white hover:bg-[#024a41]">Ir al Panel de Agente</Button>
          </div>
        </section>
      ) : null}

      <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><ShieldCheck size={20} /></div><div><h2 className="text-base font-bold text-neutral-900">Verificación de Identidad (KYC)</h2><p className="text-xs text-neutral-500">Obtén la insignia oficial en tus publicaciones</p></div></div>
          <VerificationBadge status={kycStatus} />
        </div>
        {kycStatus === 'unverified' ? <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4 sm:flex-row sm:items-center"><p className="text-xs text-neutral-600">Sube tu documento de identidad y una foto tuya sosteniéndolo para verificar tu cuenta.</p><Button onClick={() => setIsKycModalOpen(true)} className="h-11 shrink-0 rounded-full bg-[#035f53] text-xs font-bold text-white hover:bg-[#024a41]">Solicitar Verificación</Button></div> : null}
        {kycStatus === 'pending' ? <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800"><strong>Tus evidencias están en revisión.</strong> Nuestro equipo de moderación validará tu identidad en breve.</div> : null}
        {kycStatus === 'verified' ? <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-xs text-emerald-800"><strong>¡Cuenta Verificada!</strong> Tu perfil cuenta con el distintivo oficial de confianza.</div> : null}
        {kycStatus === 'rejected' ? <div className="space-y-2 rounded-xl border border-red-100 bg-red-50 p-4 text-xs text-red-800"><p><strong>Solicitud Rechazada:</strong> {kycReason || 'Las evidencias presentadas no pudieron validarse.'}</p><Button onClick={() => setIsKycModalOpen(true)} variant="outline" className="h-11 rounded-full border-red-200 bg-white text-xs font-bold text-red-700">Reenviar evidencias</Button></div> : null}
      </section>

      <KycSubmissionModal userId={userId} isOpen={isKycModalOpen} onClose={() => setIsKycModalOpen(false)} onSuccess={() => { setKycStatus('pending'); setKycReason(null) }} />

      {(userRole === 'buyer' || userRole === 'agent') ? (
        <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[#035f53]"><UserRound size={20} /></div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Tipo de Cuenta / Modalidad de Anuncio</h2>
              <p className="text-xs text-neutral-500">Selecciona cómo deseas anunciarte en Cubitat para adaptar tu experiencia.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <button type="button" onClick={() => handleSaveRole('user')} disabled={isSavingRole} className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 text-left transition-all ${userRole !== 'agent' ? 'border-[#035f53] bg-teal-50/90 ring-2 ring-[#035f53]/20' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'}`}>
              <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs font-extrabold text-neutral-900">🏠 Anunciante Particular</span>{userRole !== 'agent' ? <span className="rounded-full bg-[#035f53] px-2.5 py-0.5 text-[10px] font-extrabold text-white">Perfil Activo</span> : null}</div>
              <p className="text-[11px] leading-normal text-neutral-600">Publico propiedades personales o familiares de forma directa.</p>
            </button>
            <button type="button" onClick={() => handleSaveRole('agent')} disabled={isSavingRole || kycStatus !== 'verified'} className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${userRole === 'agent' ? 'border-[#035f53] bg-teal-50/90 ring-2 ring-[#035f53]/20' : kycStatus === 'verified' ? 'cursor-pointer border-neutral-200 bg-neutral-50 hover:border-neutral-300' : 'cursor-not-allowed border-neutral-200 bg-neutral-100 opacity-70'}`}>
              <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs font-extrabold text-neutral-900">🏢 Agente / Inmobiliaria</span>{userRole === 'agent' ? <span className="rounded-full bg-[#035f53] px-2.5 py-0.5 text-[10px] font-extrabold text-white">Perfil Activo</span> : null}</div>
              <p className="text-[11px] leading-normal text-neutral-600">Gestiono un portafolio profesional de propiedades y contactos.</p>
              {kycStatus !== 'verified' && userRole !== 'agent' ? <p className="mt-2 text-[10px] font-bold text-amber-700">Requiere verificación de identidad (KYC) aprobada.</p> : null}
            </button>
          </div>
          {roleMessage ? <p className={`text-xs font-semibold ${roleMessage.includes('correctamente') ? 'text-emerald-700' : roleMessage.includes('KYC') ? 'text-amber-700' : 'text-red-600'}`}>{roleMessage}</p> : null}
        </section>
      ) : null}

    </>
  )
}
