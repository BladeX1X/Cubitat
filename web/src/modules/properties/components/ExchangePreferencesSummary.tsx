import { ArrowLeftRight, BedDouble, MapPin, Ruler, WalletCards } from 'lucide-react'
import {
  formatExchangeCashAdjustment,
  getExchangePreferences,
  getExchangePropertyTypeLabel,
} from '../exchangePreferences'

export function ExchangePreferencesSummary({ features, compact = false }: {
  features: Record<string, unknown> | null | undefined
  compact?: boolean
}) {
  const preferences = getExchangePreferences(features)
  if (!preferences) return null

  const location = [preferences.municipality, preferences.province].filter(Boolean).join(', ')
  const facts = [
    { icon: ArrowLeftRight, label: 'Tipo', value: getExchangePropertyTypeLabel(preferences.propertyType) },
    ...(location ? [{ icon: MapPin, label: 'Zona', value: location }] : []),
    ...(preferences.minBedrooms ? [{ icon: BedDouble, label: 'Dormitorios', value: `${preferences.minBedrooms} o más` }] : []),
    ...(preferences.minAreaM2 ? [{ icon: Ruler, label: 'Área mínima', value: `${preferences.minAreaM2} m²` }] : []),
    { icon: WalletCards, label: 'Diferencia', value: formatExchangeCashAdjustment(preferences) },
  ]

  return (
    <section className={compact ? 'border-t border-neutral-200 pt-4' : 'bg-emerald-50/50 border border-emerald-100 rounded-xl p-5'}>
      <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-4">Busca a cambio</h2>
      <dl className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'md:grid-cols-2'} gap-3`}>
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2 text-sm">
            <Icon size={17} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
            <div>
              <dt className="text-xs font-semibold text-neutral-500">{label}</dt>
              <dd className="font-semibold text-neutral-800">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
      {preferences.notes && (
        <p className="mt-4 border-t border-emerald-100 pt-3 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
          {preferences.notes}
        </p>
      )}
    </section>
  )
}
