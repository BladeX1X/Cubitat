import { BarChart3, Building2, Eye, TrendingUp } from 'lucide-react'

interface AgentDashboardSummaryProps {
  loading: boolean
  activePropertiesCount: number
  totalAccumulatedViews: number
  totalContactClicks: number
  contactMetricsAvailable: boolean
}

export function AgentDashboardSummary({
  loading,
  activePropertiesCount,
  totalAccumulatedViews,
  totalContactClicks,
  contactMetricsAvailable,
}: AgentDashboardSummaryProps) {
  const metrics = [
    {
      label: 'Inmuebles Activos',
      value: loading ? '-' : activePropertiesCount,
      detail: activePropertiesCount === 1 ? '1 propiedad publicada' : `${activePropertiesCount} propiedades publicadas`,
      icon: <Building2 size={20} />,
      iconClass: 'bg-emerald-50 text-[#035f53]',
      testId: 'metric-active-properties',
    },
    {
      label: 'Visualizaciones Acumuladas',
      value: loading ? '-' : totalAccumulatedViews.toLocaleString('es-CU'),
      detail: 'Sumatoria total de vistas en tus publicaciones',
      icon: <Eye size={20} />,
      iconClass: 'bg-blue-50 text-blue-700',
      testId: 'metric-total-views',
    },
    {
      label: 'Contactos registrados',
      value: loading || !contactMetricsAvailable ? '—' : totalContactClicks.toLocaleString('es-CU'),
      detail: contactMetricsAvailable ? 'Clics reales en teléfono y WhatsApp' : 'Métricas de contacto no disponibles',
      icon: <TrendingUp size={20} />,
      iconClass: 'bg-amber-50 text-amber-700',
      testId: 'metric-contact-clicks',
    },
  ]

  return (
    <>
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#035f53] to-[#008f79] px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8">
        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
          <BarChart3 size={18} />
          <span>Dashboard de Agente</span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Métricas y Rendimiento</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-emerald-50/90 sm:text-base">
          Monitorea el impacto de tus inmuebles en tiempo real, analiza visualizaciones acumuladas y gestiona tus publicaciones rápidamente.
        </p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">{metric.label}</span>
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${metric.iconClass}`}>{metric.icon}</div>
            </div>
            <p className="mt-3 text-3xl font-black text-neutral-900" data-testid={metric.testId}>{metric.value}</p>
            <p className="mt-1 text-xs font-semibold text-neutral-500">{metric.detail}</p>
          </div>
        ))}
      </section>
    </>
  )
}
