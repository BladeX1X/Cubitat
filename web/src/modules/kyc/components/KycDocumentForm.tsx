import type { FormEvent } from 'react'
import { AlertTriangle, FileText, Loader2, Upload, X } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { isKycDocumentType, type KycDocumentType } from '../hooks/useKycSubmission'

interface KycDocumentFormProps {
  documentType: KycDocumentType
  onDocumentTypeChange: (value: KycDocumentType) => void
  file: File | null
  previewUrl: string | null
  loading: boolean
  error: string | null
  onFileChange: (file: File | undefined) => void
  onClearFile: () => void
  onCancel: () => void
  onSubmit: () => void
}

export function KycDocumentForm(props: KycDocumentFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void props.onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {props.error && (
        <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-100 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-red-500" /><span>{props.error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-neutral-700 mb-1">Tipo de Documento</label>
        <select value={props.documentType} onChange={(event) => {
          if (isKycDocumentType(event.target.value)) props.onDocumentTypeChange(event.target.value)
        }} disabled={props.loading}
          className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#035f53]">
          <option value="identity_card">Carnet de Identidad</option>
          <option value="license">Carnet / Licencia de Agente Inmobiliario</option>
          <option value="passport">Pasaporte</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-neutral-700 mb-1">Foto del Documento (Frente)</label>
        {props.previewUrl ? (
          <div className="relative rounded-xl overflow-hidden border border-neutral-200 h-40 bg-neutral-100 flex items-center justify-center">
            <img src={props.previewUrl} alt="Vista previa del documento" className="max-h-full object-contain" />
            <button type="button" onClick={props.onClearFile} disabled={props.loading}
              className="absolute top-2 right-2 bg-neutral-900/80 text-white p-1 rounded-full text-xs hover:bg-neutral-900" aria-label="Quitar documento">
              <X size={14} />
            </button>
          </div>
        ) : (
          <label htmlFor="kyc-doc-file" className="border-2 border-dashed border-neutral-200 hover:border-[#035f53] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-neutral-50/50">
            <Upload size={24} className="text-neutral-400 mb-2" />
            <span className="text-xs font-bold text-neutral-700">Seleccionar o tomar foto</span>
            <span className="text-[10px] text-neutral-400 mt-0.5">JPG, PNG o WebP (Máx 10 MB)</span>
            <input id="kyc-doc-file" aria-label="Foto del Documento" type="file" accept="image/*"
              onChange={(event) => props.onFileChange(event.target.files?.[0])} disabled={props.loading} className="hidden" />
          </label>
        )}
      </div>

      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 flex items-start gap-2 text-[11px] text-neutral-500 leading-relaxed">
        <FileText size={14} className="shrink-0 text-neutral-400 mt-0.5" />
        <span>Tu documento se almacena de forma privada y encriptada, de uso estrictamente confidencial para validación administrativa.</span>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={props.onCancel} disabled={props.loading} className="rounded-full text-xs font-bold">Cancelar</Button>
        <Button type="submit" disabled={props.loading || !props.file} className="bg-[#035f53] hover:bg-[#024a41] text-white rounded-full text-xs font-bold px-5 h-10">
          {props.loading ? <><Loader2 size={14} className="animate-spin mr-1.5" />Enviando...</> : 'Enviar Solicitud'}
        </Button>
      </div>
    </form>
  )
}
