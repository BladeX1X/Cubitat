import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../shared/ui/button'

export type AccountListingFilter = {
  id: string
  label: string
  tone: 'neutral' | 'amber' | 'green' | 'red' | 'blue'
  count: number
}

const FILTER_TONES: Record<AccountListingFilter['tone'], string> = {
  neutral: 'border-neutral-200 text-neutral-700',
  amber: 'border-amber-200 text-amber-800',
  green: 'border-emerald-200 text-emerald-800',
  red: 'border-red-200 text-red-800',
  blue: 'border-blue-200 text-blue-800',
}

type AccountListingsFrameProps = {
  eyebrow: string
  title: string
  description: string
  itemCount: number
  itemLabel: string
  itemLabelPlural: string
  createLabel: string
  onCreate: () => void
  secondaryAction?: ReactNode
  filters: AccountListingFilter[]
  activeFilter: string
  onFilterChange: (filter: string) => void
  filterLabel: string
  children: ReactNode
}

export function AccountListingsFrame({
  eyebrow,
  title,
  description,
  itemCount,
  itemLabel,
  itemLabelPlural,
  createLabel,
  onCreate,
  secondaryAction,
  filters,
  activeFilter,
  onFilterChange,
  filterLabel,
  children,
}: AccountListingsFrameProps) {
  return (
    <>
      <section className="relative overflow-hidden rounded-md bg-gradient-to-r from-[#155b55] to-[#007565] px-7 py-8 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-[28px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85 sm:text-base">{description}</p>
      </section>

      <section
        aria-label={title}
        className="mt-8 rounded-xl border border-neutral-100 bg-white p-5 shadow-[0_4px_14px_rgba(10,31,28,0.04)] sm:p-6"
      >
        <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-neutral-500" aria-live="polite">
            <span className="font-bold text-neutral-800">{itemCount}</span>{' '}
            {itemCount === 1 ? itemLabel : itemLabelPlural}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {secondaryAction}
            <Button
              className="min-h-10 rounded-full bg-[#035f53] px-5 text-sm font-bold text-white hover:bg-[#024a41]"
              onClick={onCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              {createLabel}
            </Button>
          </div>
        </div>

        {itemCount > 0 && filters.length > 1 && (
          <div
            role="group"
            aria-label={filterLabel}
            className="mb-6 flex gap-2 overflow-x-auto pb-2"
          >
            {filters.map((filter) => {
              const active = activeFilter === filter.id
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  disabled={filter.count === 0 && filter.id !== 'all'}
                  onClick={() => onFilterChange(filter.id)}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${FILTER_TONES[filter.tone]} ${active ? 'border-[#035f53] bg-[#035f53] !text-white' : 'bg-white hover:bg-neutral-50'}`}
                >
                  {filter.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                    {filter.count}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {children}
      </section>
    </>
  )
}
