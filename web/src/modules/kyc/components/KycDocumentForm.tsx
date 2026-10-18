import type { FormEvent } from 'react'
import { AlertTriangle, FileText, Loader2 } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { isKycDocumentType, type KycDocumentType } from '../hooks/useKycSubmission'
import { KycImageField } from './KycImageField'

interface KycDocumentFormProps {
  documentType: KycDocumentType
  onDocumentTypeChange: (value: KycDocumentType) => void
  documentFile: File | null
  documentPreviewUrl: string | null
  selfieFile: File | null
  selfiePreviewUrl: string | null
  loading: boolean
  error: string | null
  onDocumentFileChange: (file: File | undefined) => void
  onSelfieFileChange: (file: File | undefined) => void
  onClearDocumentFile: () => void
  onClearSelfieFile: () => void
  onCancel: () => void
  onSubmit: () => void
}

export function KycDocumentForm(props: KycDocumentFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void props.onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
      {props.error && (
        <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-100 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-red-500" /><span>{props.error}</span>
        </div>
      )}

      <div>
        <label htmlFor="kyc-document-type" className="block text-xs font-bold text-neutral-700 mb-1">Tipo de documento de identidad</label>
        <select
          id="kyc-document-type"
          value={props.documentType}
          onChange={(event) => {
            if (isKycDocumentType(event.target.value)) props.onDocumentTypeChange(event.target.value)
          }}
          disabled={props.loading}
          className="w-full h-10 px-3 rounded-xl border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#035f53]"
        >
          <option value="identity_card">Carnet de Identidad</option>
          <option value="passport">Pasaporte</option>
        </select>
      </div>

      <KycImageField
        id="kyc-doc-file"
        label="Documento de identidad"
        instruction="Seleccionar foto del documento"
        previewAlt="Vista previa del documento de identidad"
        file={props.documentFile}
        previewUrl={props.documentPreviewUrl}
        loading={props.loading}
        onFileChange={props.onDocumentFileChange}
        onClear={props.onClearDocumentFile}
      />

      <KycImageField
        id="kyc-selfie-file"
        label="Foto sosteniendo el documento"
        instruction="Seleccionar foto de la persona con el documento"
        previewAlt="Vista previa de la persona sosteniendo el documento"
        file={props.selfieFile}
        previewUrl={props.selfiePreviewUrl}
        loading={props.loading}
        onFileChange={props.onSelfieFileChange}
        onClear={props.onClearSelfieFile}
      />

      <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 flex items-start gap-2 text-[11px] text-neutral-500 leading-relaxed">
        <FileText size={14} className="shrink-0 text-neutral-400 mt-0.5" />
        <span>Ambas imágenes se almacenan de forma privada y se usan exclusivamente para la validación administrativa de identidad.</span>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={props.onCancel} disabled={props.loading} className="rounded-full text-xs font-bold">Cancelar</Button>
        <Button
          type="submit"
          disabled={props.loading || !props.documentFile || !props.selfieFile}
          className="bg-[#035f53] hover:bg-[#024a41] text-white rounded-full text-xs font-bold px-5 h-10"
        >
          {props.loading ? <><Loader2 size={14} className="animate-spin mr-1.5" />Enviando...</> : 'Enviar Solicitud'}
        </Button>
      </div>
    </form>
  )
}
