import { ArrowLeft, Boxes, BriefcaseBusiness, Building2 } from 'lucide-react'
import { useSEO } from '../../shared/hooks/useSEO'
import { Button } from '../../shared/ui/button'

type PublicationTypeChooserPageProps = {
  onBack: () => void
  onChooseProperty: () => void
  onChooseService: () => void
  onChooseMaterial: () => void
  servicesEnabled: boolean
  materialsEnabled: boolean
}

const options = [
  { key: 'property', title: 'Inmueble', description: 'Publica una casa, apartamento, terreno o permuta.', icon: Building2 },
  { key: 'service', title: 'Servicio', description: 'Presenta tus servicios profesionales para el hogar.', icon: BriefcaseBusiness },
  { key: 'material', title: 'Material', description: 'Anuncia materiales para construcción y reparación.', icon: Boxes },
] as const

export function PublicationTypeChooserPage({ onBack, onChooseProperty, onChooseService, onChooseMaterial, servicesEnabled, materialsEnabled }: PublicationTypeChooserPageProps) {
  useSEO({ title: 'Publicar gratis | Cubitat', description: 'Elige qué deseas publicar en Cubitat.' })
  const actions = { property: onChooseProperty, service: onChooseService, material: onChooseMaterial }

  return (
    <main className="min-h-[75vh] bg-neutral-50 px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <button type="button" onClick={onBack} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-neutral-600 hover:bg-white">
          <ArrowLeft size={18} />Volver
        </button>
        <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">Publica gratis</p>
          <h1 className="mt-2 text-3xl font-black text-neutral-900">¿Qué quieres publicar?</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Elige una opción para continuar con el formulario correspondiente.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {options.map(({ key, title, description, icon: Icon }) => {
              const enabled = key === 'property' || (key === 'service' ? servicesEnabled : materialsEnabled)
              return (
                <article key={key} className="flex min-h-56 flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Icon size={24} /></span>
                  <h2 className="mt-4 text-xl font-bold text-neutral-900">{title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-neutral-600">{description}</p>
                  <Button type="button" disabled={!enabled} onClick={actions[key]} className="mt-5 min-h-11 w-full rounded-full bg-[#006b5b] text-white hover:bg-[#00594d]">
                    Publicar {title.toLowerCase()}
                  </Button>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
