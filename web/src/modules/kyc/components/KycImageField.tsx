import { Upload, X } from 'lucide-react'

interface KycImageFieldProps {
  id: string
  label: string
  instruction: string
  previewAlt: string
  file: File | null
  previewUrl: string | null
  loading: boolean
  onFileChange: (file: File | undefined) => void
  onClear: () => void
}

export function KycImageField(props: KycImageFieldProps) {
  return (
    <div>
      <label htmlFor={props.id} className="block text-xs font-bold text-neutral-700 mb-1">{props.label}</label>
      {props.previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-neutral-200 h-40 bg-neutral-100 flex items-center justify-center">
          <img src={props.previewUrl} alt={props.previewAlt} className="max-h-full object-contain" />
          <button
            type="button"
            onClick={props.onClear}
            disabled={props.loading}
            className="absolute top-2 right-2 bg-neutral-900/80 text-white p-1 rounded-full text-xs hover:bg-neutral-900"
            aria-label={`Quitar ${props.label.toLowerCase()}`}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label
          htmlFor={props.id}
          className="border-2 border-dashed border-neutral-200 hover:border-[#035f53] rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-neutral-50/50"
        >
          <Upload size={24} className="text-neutral-400 mb-2" />
          <span className="text-xs font-bold text-neutral-700">{props.instruction}</span>
          <span className="text-[10px] text-neutral-400 mt-0.5">JPG, PNG o WebP (Máx. 10 MB)</span>
          <input
            id={props.id}
            aria-label={props.label}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => props.onFileChange(event.target.files?.[0])}
            disabled={props.loading}
            className="hidden"
          />
        </label>
      )}
      {props.file && <p className="sr-only">Archivo seleccionado</p>}
    </div>
  )
}
