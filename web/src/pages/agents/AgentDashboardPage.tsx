import type { User } from '@supabase/supabase-js'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { AccountLayout } from '../account/AccountLayout'
import { AgentDashboardSummary } from '../../modules/agents/components/AgentDashboardSummary'
import { AgentPropertyManager } from '../../modules/agents/components/AgentPropertyManager'
import type { AgentDashboardProperty } from '../../modules/agents/agentDashboardRepository'
import { useAgentDashboard } from '../../modules/agents/hooks/useAgentDashboard'
import { useSEO } from '../../shared/hooks/useSEO'

const AgentGrowthPanel = import.meta.env.VITE_PHASE3_UI_ENABLED === 'true'
  ? lazy(() => import('../../modules/agents/components/AgentGrowthPanel').then((module) => ({ default: module.AgentGrowthPanel })))
  : null

export type AgentProperty = AgentDashboardProperty

export type AgentDashboardPageProps = {
  user: User
  onNavigateAccount?: () => void
  onNavigateFavorites?: () => void
  onNavigateMyProperties?: () => void
  onNavigateAgentDashboard?: () => void
  onEditProperty?: (propertyId: string) => void
  onSelectProperty?: (propertyId: string) => void
}

export function AgentDashboardPage({
  user,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onNavigateAgentDashboard,
  onEditProperty,
  onSelectProperty,
}: AgentDashboardPageProps) {
  useSEO({
    title: 'Panel de Agente | Cubitat',
    description: 'Métricas de rendimiento, visualizaciones acumuladas y gestión de publicaciones de agente.',
  })

  const dashboard = useAgentDashboard(user.id)

  if (!dashboard.loading && dashboard.loadError) {
    return (
      <div role="alert" className="mx-auto max-w-xl p-8 text-center">
        <p>No se pudo cargar el panel de agente.</p>
        <Button className="mt-4" onClick={dashboard.retry}>Reintentar</Button>
      </div>
    )
  }

  if (!dashboard.loading && !dashboard.isVerifiedAgent) {
    return (
      <div role="alert" className="mx-auto max-w-xl p-8 text-center">
        <p>Para acceder al Panel de Agente necesitas el rol de agente o administrador y tener la verificación KYC aprobada.</p>
        <Button className="mt-4" onClick={onNavigateAccount}>Revisar mi cuenta</Button>
      </div>
    )
  }

  return (
    <AccountLayout
      active="agent-dashboard"
      userRole={dashboard.userRole || 'agent'}
      onNavigateAccount={onNavigateAccount || (() => {})}
      onNavigateFavorites={onNavigateFavorites || (() => {})}
      onNavigateMyProperties={onNavigateMyProperties || (() => {})}
      onNavigateAgentDashboard={onNavigateAgentDashboard || (() => {})}
      canAccessAgentDashboard={dashboard.isVerifiedAgent}
    >
      <AgentDashboardSummary
        loading={dashboard.loading}
        activePropertiesCount={dashboard.activePropertiesCount}
        totalAccumulatedViews={dashboard.totalAccumulatedViews}
        totalContactClicks={dashboard.totalContactClicks}
        contactMetricsAvailable={dashboard.contactMetricsAvailable}
      />
      {!dashboard.loading && dashboard.isVerifiedAgent && AgentGrowthPanel ? <Suspense fallback={<div role="status" className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Cargando captación…</div>}><AgentGrowthPanel /></Suspense> : null}
      <AgentPropertyManager
        properties={dashboard.properties}
        filteredProperties={dashboard.filteredProperties}
        loading={dashboard.loading}
        searchQuery={dashboard.searchQuery}
        onSearchQueryChange={dashboard.setSearchQuery}
        statusFilter={dashboard.statusFilter}
        onStatusFilterChange={dashboard.setStatusFilter}
        updatingId={dashboard.updatingId}
        actionMessage={dashboard.actionMessage}
        onToggleVisibility={(property) => void dashboard.toggleVisibility(property)}
        onEditProperty={onEditProperty}
        onSelectProperty={onSelectProperty}
      />
    </AccountLayout>
  )
}
