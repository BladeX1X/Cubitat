import type { AdminMetrics } from '../core/types'
import type { AdminStats } from './useAdminMetrics'

export function CloudflareMetricCard({ metrics }: { metrics: AdminMetrics | null }) {
  return (
    <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -z-0" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-xs font-black text-neutral-800 uppercase tracking-wider">Cloudflare Workers</span></div>
        <p className="text-[10px] text-neutral-500 mb-4">Límite gratuito: 100,000 peticiones / día</p>
        {metrics?.cloudflare.error ? (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-center"><p className="text-xs text-neutral-600 font-medium">{metrics.cloudflare.error}</p></div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-3xl font-black text-neutral-900">{metrics?.cloudflare.requests?.toLocaleString() || 0}</span>
            <span className="text-xs text-neutral-500 font-medium">peticiones consumidas hoy</span>
            <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2"><div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(((metrics?.cloudflare.requests || 0) / 100000) * 100, 100)}%` }} /></div>
          </div>
        )}
      </div>
    </div>
  )
}

export function SupabaseMetricCard({ metrics, stats }: { metrics: AdminMetrics | null; stats: AdminStats | null }) {
  return (
    <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-xs font-black text-neutral-800 uppercase tracking-wider">Supabase</span></div>
        <div className="flex flex-col gap-0.5 mb-4">
          <p className="text-[10px] text-neutral-500">Límite Base de Datos: <b>500 MB</b>{metrics?.supabase.db_bytes != null && <span className="text-emerald-600 font-bold ml-1">({(metrics.supabase.db_bytes / 1024 / 1024).toFixed(1)} MB usados)</span>}</p>
          <p className="text-[10px] text-neutral-500">Límite Storage (Imágenes): <b>1 GB</b>{metrics?.supabase.storage_bytes != null && <span className="text-emerald-600 font-bold ml-1">({(metrics.supabase.storage_bytes / 1024 / 1024).toFixed(1)} MB usados)</span>}</p>
          <p className="text-[10px] text-neutral-500">Límite Ancho de banda: <b>5 GB / mes</b>{metrics?.supabase.egress_bytes != null && <span className="text-emerald-600 font-bold ml-1">({(metrics.supabase.egress_bytes / 1024 / 1024 / 1024).toFixed(2)} GB usados)</span>}</p>
        </div>
        {metrics?.supabase.error && <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 mb-4 text-center"><p className="text-[10px] text-neutral-600 font-medium">{metrics.supabase.error}</p></div>}
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xl font-black text-neutral-900">{stats?.properties_count}</p><p className="text-[10px] text-neutral-500">Anuncios</p></div>
          <div><p className="text-xl font-black text-neutral-900">{stats?.users_count}</p><p className="text-[10px] text-neutral-500">Usuarios</p></div>
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-100"><div className="flex justify-between items-end"><span className="text-xs font-bold text-neutral-600">Espacio en BD consumido</span><span className="text-[10px] font-medium text-neutral-400">{stats?.db_size} / 500 MB</span></div></div>
      </div>
    </div>
  )
}

export function AnalyticsMetricCard({ metrics }: { metrics: AdminMetrics | null }) {
  return (
    <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-0" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-xs font-black text-neutral-800 uppercase tracking-wider">Google Analytics</span></div>
        <p className="text-[10px] text-neutral-500 mb-4">Tráfico y visitantes en tiempo real</p>
        {metrics?.analytics.error ? (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-center"><p className="text-xs text-neutral-600 font-medium">{metrics.analytics.error}</p></div>
        ) : (
          <div className="flex flex-col gap-1"><span className="text-3xl font-black text-neutral-900">{metrics?.analytics.activeUsers || 0}</span><span className="text-xs text-neutral-500 font-medium">usuarios activos ahora</span></div>
        )}
      </div>
    </div>
  )
}
