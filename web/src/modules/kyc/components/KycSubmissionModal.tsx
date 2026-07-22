import React, { useState } from 'react'
import { X, Upload, ShieldCheck, AlertTriangle, Loader2, CheckCircle2, FileText } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { submitKycRequest, uploadKycDocument } from '../kycRepository'

type KycSubmissionModalProps = {
  userId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function KycSubmissionModal({
  userId,
  isOpen,
  onClose,
  onSuccess,
}: KycSubmissionModalProps) {
  const [documentType, setDocumentType] = useState<'identity_card' | 'license' | 'passport'>('identity_card')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setError('El archivo supera el límite de 10 MB.')
        return
      }
      setFile(selected)
      setPreviewUrl(URL.createObjectURL(selected))
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Por favor selecciona una foto de tu documento de identidad.')
      return
    }

    setLoading(true)
    setError(null)

    // 1. Upload to storage
    const uploadRes = await uploadKycDocument(userId, file)
    if (!uploadRes.success || !uploadRes.publicUrl) {
      setError(uploadRes.error || 'Error al subir la imagen del documento.')
      setLoading(false)
      return
    }

    // 2. Submit RPC request
    const submitRes = await submitKycRequest(documentType, uploadRes.publicUrl)
    setLoading(false)

    if (!submitRes.success) {
      setError(submitRes.error || 'No se pudo registrar la solicitud de verificación.')
      return
    }

    setSuccess(true)
    setTimeout(() => {
      onSuccess()
      onClose()
    }, 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 focus:outline-none disabled:opacity-50"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Solicitud de Verificación KYC
            </h2>
            <p className="text-xs text-neutral-500">
              Verifica tu identidad para obtener la insignia visual y aumentar la confianza de los compradores.
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-bold text-neutral-800">¡Solicitud enviada con éxito!</h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Un moderador revisará tu documento en breve. Te notificaremos cuando tu perfil esté verificado.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-100 text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Tipo de Documento
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as any)}
                disabled={loading}
                className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#035f53]"
              >
                <option value="identity_card">Carnet de Identidad</option>
                <option value="license">Carnet / Licencia de Agente Inmobiliario</option>
                <option value="passport">Pasaporte</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Foto del Documento (Frente)
              </label>

              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-neutral-200 h-40 bg-neutral-100 flex items-center justify-center">
                  <img src={previewUrl} alt="Vista previa del documento" className="max-h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null)
                      setPreviewUrl(null)
                    }}
                    disabled={loading}
                    className="absolute top-2 right-2 bg-neutral-900/80 text-white p-1 rounded-full text-xs hover:bg-neutral-900"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label htmlFor="kyc-doc-file" className="border-2 border-dashed border-neutral-200 hover:border-[#035f53] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-neutral-50/50">
                  <Upload size={24} className="text-neutral-400 mb-2" />
                  <span className="text-xs font-bold text-neutral-700">Seleccionar o tomar foto</span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">JPG, PNG o WebP (Máx 10 MB)</span>
                  <input
                    id="kyc-doc-file"
                    aria-label="Foto del Documento"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 flex items-start gap-2 text-[11px] text-neutral-500 leading-relaxed">
              <FileText size={14} className="shrink-0 text-neutral-400 mt-0.5" />
              <span>
                Tu documento se almacena de forma privada y encriptada, de uso estrictamente confidencial para validación administrativa.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="rounded-full text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !file}
                className="bg-[#035f53] hover:bg-[#024a41] text-white rounded-full text-xs font-bold px-5 h-10"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Solicitud'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
