import { useEffect, useId, useState } from 'react'
import { ImagePlus, Image as ImageIcon, LoaderCircle, X } from 'lucide-react'

export type ExistingUploadPhoto = { id: string; src?: string }

type MultiPhotoUploadFieldProps = {
  label: string
  files: readonly File[]
  existingPhotos: readonly ExistingUploadPhoto[]
  maxCount: number
  maxSizeLabel: string
  isCompressing: boolean
  onSelectFiles: (files: File[]) => void
  onRemoveFile: (index: number) => void
  onRemoveExisting: (photo: ExistingUploadPhoto) => void
}

export function MultiPhotoUploadField({ label, files, existingPhotos, maxCount, maxSizeLabel, isCompressing, onSelectFiles, onRemoveFile, onRemoveExisting }: MultiPhotoUploadFieldProps) {
  const inputId = useId()
  const [previews, setPreviews] = useState<string[]>([])

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  const photoCount = existingPhotos.length + files.length

  return (
    <div className="sm:col-span-2">
      <label htmlFor={inputId} className="text-sm font-semibold">{label}</label>
      <div className="relative mt-1 flex min-h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-center transition hover:border-emerald-700">
        <input id={inputId} type="file" accept="image/webp,image/jpeg,image/png" multiple disabled={isCompressing || photoCount >= maxCount} onChange={(event) => {
          onSelectFiles(Array.from(event.currentTarget.files ?? []))
          event.currentTarget.value = ''
        }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
        {isCompressing ? <LoaderCircle size={25} className="animate-spin text-emerald-800" aria-hidden="true" /> : <ImagePlus size={25} className="text-emerald-800" aria-hidden="true" />}
        <span className="mt-2 text-sm font-semibold text-neutral-800" aria-live="polite" role={isCompressing ? 'status' : undefined}>{isCompressing ? 'Preparando tus fotos…' : photoCount >= maxCount ? `Límite de ${maxCount} fotos alcanzado` : 'Selecciona varias fotos'}</span>
        <span className="mt-1 text-xs font-normal text-neutral-500">Máximo {maxCount} fotos y {maxSizeLabel} por archivo.</span>
      </div>
      <p className="mt-2 text-xs text-neutral-500" aria-live="polite">{photoCount} de {maxCount} fotos. La primera será la portada del anuncio.</p>
      {files.length > 0 || existingPhotos.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label={`Vista previa de ${label.toLowerCase()}`}>
          {existingPhotos.map((photo, index) => <figure key={`saved-${photo.id}`} className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
            {photo.src ? <img src={photo.src} alt={`${label}, foto ${index + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-neutral-400"><ImageIcon aria-hidden="true" /></div>}
            {index === 0 && <figcaption className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1 text-center text-[11px] font-semibold text-white">Portada</figcaption>}
            <button type="button" aria-label={`Quitar foto ${index + 1}`} disabled={isCompressing} onClick={() => onRemoveExisting(photo)} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white hover:bg-red-700 disabled:opacity-50"><X size={16} /></button>
          </figure>)}
          {files.map((file, index) => <figure key={`new-${file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
            {previews[index] ? <img src={previews[index]} alt={`${label}, foto ${existingPhotos.length + index + 1}`} decoding="async" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-neutral-400"><ImageIcon aria-hidden="true" /></div>}
            {existingPhotos.length + index === 0 && <figcaption className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1 text-center text-[11px] font-semibold text-white">Portada</figcaption>}
            <button type="button" aria-label={`Quitar foto ${existingPhotos.length + index + 1}`} disabled={isCompressing} onClick={() => onRemoveFile(index)} className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white hover:bg-red-700 disabled:opacity-50"><X size={16} /></button>
            <figcaption className="absolute bottom-0 inset-x-0 truncate bg-black/55 px-2 py-1 text-center text-[10px] text-white">{(file.size / 1024).toFixed(0)} KB</figcaption>
          </figure>)}
        </div>
      ) : null}
    </div>
  )
}
