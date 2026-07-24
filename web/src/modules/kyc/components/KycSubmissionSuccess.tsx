import { CheckCircle2 } from 'lucide-react'

export function KycSubmissionSuccess() {
  return (
    <div className="py-8 text-center space-y-3">
      <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 size={24} />
      </div>
      <h3 className="text-base font-bold text-neutral-800">¡Solicitud enviada con éxito!</h3>
      <p className="text-xs text-neutral-500 max-w-xs mx-auto">Un moderador revisará tu documento en breve. Te notificaremos cuando tu perfil esté verificado.</p>
    </div>
  )
}
