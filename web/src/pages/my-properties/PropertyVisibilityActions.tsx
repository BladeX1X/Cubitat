import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import type { PropertyStatus } from './propertyStatus'

type Props = {
  status: PropertyStatus
  loading: boolean
  onHide: () => void
  onRestore: () => void
}

export function PropertyVisibilityActions({ status, loading, onHide, onRestore }: Props) {
  if (status === 'published') {
    return (
      <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs border-amber-200 text-amber-800 hover:bg-amber-50" onClick={onHide} disabled={loading}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />} Ocultar
      </Button>
    )
  }

  if (status === 'owner_hidden') {
    return (
      <Button size="sm" className="flex-1 rounded-xl text-xs bg-emerald-700 text-white hover:bg-emerald-800" onClick={onRestore} disabled={loading}>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} Volver a publicar
      </Button>
    )
  }

  return null
}
