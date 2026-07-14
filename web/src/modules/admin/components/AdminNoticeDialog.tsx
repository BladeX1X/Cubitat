import { Button } from '../../../shared/ui/button'

export function AdminNoticeDialog({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar aviso"
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div role="alertdialog" aria-modal="true" className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
        <h3 className="text-lg font-bold text-neutral-900 mb-2">Aviso del Sistema</h3>
        <p className="text-sm text-neutral-600 mb-6">{message}</p>
        <Button className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={onClose}>
          Aceptar
        </Button>
      </div>
    </div>
  )
}
