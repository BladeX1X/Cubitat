import { Loader2 } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { AdminErrorState, AdminLoadingState } from '../components/AdminStates'
import { AnalyticsMetricCard, CloudflareMetricCard, SupabaseMetricCard } from './MetricCards'
import { useAdminMetrics } from './useAdminMetrics'

export function MetricsTab() {
  const state = useAdminMetrics()
  if (state.error) return <AdminErrorState message={state.error} onRetry={() => void state.load()} />

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#035f53] to-[#02443a] rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Consumo y Límites (APIs)</h2>
          <p className="text-xs text-[#a3e2d7] mt-1">Visualización automática de plataformas en tiempo real sin ejecutar scripts.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void state.load()} disabled={state.loading} className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20">
          {state.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Actualizar métricas
        </Button>
      </div>
      {state.externalError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p className="font-bold">No se pudieron sincronizar las métricas externas.</p><p className="mt-1 text-xs">{state.externalError}</p></div>}
      {state.loading ? (
        <AdminLoadingState message="Sincronizando con APIs…" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CloudflareMetricCard metrics={state.metrics} />
          <SupabaseMetricCard metrics={state.metrics} stats={state.stats} />
          <AnalyticsMetricCard metrics={state.metrics} />
        </div>
      )}
    </div>
  )
}
