import type { User } from '@supabase/supabase-js'
import { AccountLayout } from '../account/AccountLayout'
import { AgentDashboardSummary } from '../../modules/agents/components/AgentDashboardSummary'
import { AgentPropertyManager } from '../../modules/agents/components/AgentPropertyManager'
import type { AgentDashboardProperty } from '../../modules/agents/agentDashboardRepository'
import { useAgentDashboard } from '../../modules/agents/hooks/useAgentDashboard'
import { useSEO } from '../../shared/hooks/useSEO'

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
    return <div role="alert" className="mx-auto max-w-xl p-8 text-center">No se pudo cargar el panel de agente. Inténtalo de nuevo.</div>
  }

  if (!dashboard.loading && !dashboard.isVerifiedAgent) {
    return <div role="alert" className="mx-auto max-w-xl p-8 text-center">Este panel está disponible únicamente para agentes verificados.</div>
  }

  return (
    <AccountLayout
      active="agent-dashboard"
      userRole={dashboard.userRole || 'agent'}
      onNavigateAccount={onNavigateAccount || (() => {})}
      onNavigateFavorites={onNavigateFavorites || (() => {})}
      onNavigateMyProperties={onNavigateMyProperties || (() => {})}
      onNavigateAgentDashboard={onNavigateAgentDashboard || (() => {})}
    >
      <AgentDashboardSummary
        loading={dashboard.loading}
        activePropertiesCount={dashboard.activePropertiesCount}
        totalAccumulatedViews={dashboard.totalAccumulatedViews}
        totalContactClicks={dashboard.totalContactClicks}
      />
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
