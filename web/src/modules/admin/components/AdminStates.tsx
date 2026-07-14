import { Check, Loader2 } from 'lucide-react'
import { Button } from '../../../shared/ui/button'

export function AdminLoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="w-10 h-10 text-[#035f53] animate-spin" />
      <p className="text-sm text-neutral-500 font-medium">{message}</p>
    </div>
  )
}

export function AdminErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <p className="text-sm font-bold text-red-700">Error al cargar</p>
      <p className="text-xs text-red-500 mt-1">{message}</p>
      <Button className="mt-4 rounded-full bg-red-700 hover:bg-red-800 text-white px-5 text-xs" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

export function AdminEmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-4">
        <Check className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className="text-lg font-bold text-neutral-800">{title}</h2>
      <p className="text-sm text-neutral-500 mt-1">{message}</p>
    </div>
  )
}
