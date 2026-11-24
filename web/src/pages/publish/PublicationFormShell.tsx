import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

type PublicationFormShellProps = {
  onBack: () => void
  eyebrow: string
  title: string
  description: string
  icon: ReactNode
  children: ReactNode
}

export function PublicationFormShell({ onBack, eyebrow, title, description, icon, children }: PublicationFormShellProps) {
  return (
    <main className="min-h-[75vh] bg-neutral-50 px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-600 hover:bg-white">
          <ArrowLeft size={18} />Volver
        </button>
        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800">{icon}{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black text-neutral-900">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">{description}</p>
          {children}
        </section>
      </div>
    </main>
  )
}
