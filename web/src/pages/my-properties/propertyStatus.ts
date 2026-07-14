export type PropertyStatus =
  | 'published'
  | 'pending_review'
  | 'paused'
  | 'owner_hidden'
  | 'draft'
  | 'local_draft'
  | 'ai_approved'
  | 'ai_rejected'

const STATUS_CONFIG: Record<
  PropertyStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  published: {
    label: 'Publicada',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  pending_review: {
    label: 'Pendiente de revisión',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  paused: {
    label: 'Oculta por moderación',
    bg: 'bg-neutral-100',
    text: 'text-neutral-500',
    dot: 'bg-neutral-400',
  },
  owner_hidden: {
    label: 'Oculta por ti',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
  },
  draft: {
    label: 'Borrador',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  local_draft: {
    label: 'Borrador (Sin publicar)',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  ai_approved: {
    label: 'Aprobada por IA',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  ai_rejected: {
    label: 'Rechazada por IA',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
}

export function getPropertyStatusConfig(status: PropertyStatus) {
  return STATUS_CONFIG[status]
}
