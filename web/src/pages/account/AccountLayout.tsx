import type { ReactNode } from 'react'
import { BarChart3, Boxes, BriefcaseBusiness, Heart, Home, User as UserIcon } from 'lucide-react'
import { PHASE_TWO_ENABLED } from '../../shared/config/features'

export type AccountSectionKey = 'account' | 'favorites' | 'contents' | 'services' | 'materials' | 'agent-dashboard'

type AccountLayoutProps = {
  active: AccountSectionKey
  children: ReactNode
  userRole?: string
  onNavigateAccount: () => void
  onNavigateFavorites: () => void
  onNavigateMyProperties: () => void
  onNavigateMyServices?: () => void
  onNavigateMyMaterials?: () => void
  onNavigateAgentDashboard?: () => void
}

export function AccountLayout({
  active,
  children,
  userRole,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onNavigateMyServices,
  onNavigateMyMaterials,
  onNavigateAgentDashboard,
}: AccountLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 sm:py-6">
        <nav
          className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:hidden"
          aria-label="Navegación de cuenta móvil"
        >
          <MobileNavItem active={active === 'account'} icon={<UserIcon size={17} />} label="Mi cuenta" onClick={onNavigateAccount} />
          <MobileNavItem active={active === 'favorites'} icon={<Heart size={17} />} label="Favoritos" onClick={onNavigateFavorites} />
          <MobileNavItem active={active === 'contents'} icon={<Home size={17} />} label="Mis publicaciones" onClick={onNavigateMyProperties} />
          {onNavigateMyServices && <MobileNavItem active={active === 'services'} icon={<BriefcaseBusiness size={17} />} label="Mis servicios" onClick={onNavigateMyServices} />}
          {onNavigateMyMaterials && <MobileNavItem active={active === 'materials'} icon={<Boxes size={17} />} label="Mis materiales" onClick={onNavigateMyMaterials} />}
          {PHASE_TWO_ENABLED && (userRole === 'agent' || userRole === 'admin') && onNavigateAgentDashboard && (
            <MobileNavItem active={active === 'agent-dashboard'} icon={<BarChart3 size={17} />} label="Panel de Agente" onClick={onNavigateAgentDashboard} />
          )}
        </nav>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[210px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden border-r border-neutral-100 pr-0 md:block lg:pr-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 mb-4">
              Navegacion
            </p>
            <nav className="grid gap-2" aria-label="Navegacion de cuenta">
              <SideItem
                active={active === 'account'}
                icon={<UserIcon size={20} />}
                label="Mi cuenta"
                onClick={onNavigateAccount}
              />
              <SideItem
                active={active === 'favorites'}
                icon={<Heart size={20} />}
                label="Favoritos"
                onClick={onNavigateFavorites}
              />
              <SideItem
                active={active === 'contents'}
                icon={<Home size={20} />}
                label="Mis publicaciones"
                onClick={onNavigateMyProperties}
              />
              {onNavigateMyServices && (
                <SideItem
                  active={active === 'services'}
                  icon={<BriefcaseBusiness size={20} />}
                  label="Mis servicios"
                  onClick={onNavigateMyServices}
                />
              )}
              {onNavigateMyMaterials && (
                <SideItem
                  active={active === 'materials'}
                  icon={<Boxes size={20} />}
                  label="Mis materiales"
                  onClick={onNavigateMyMaterials}
                />
              )}
              {PHASE_TWO_ENABLED && (userRole === 'agent' || userRole === 'admin') && onNavigateAgentDashboard && (
                <SideItem
                  active={active === 'agent-dashboard'}
                  icon={<BarChart3 size={20} />}
                  label="Panel de Agente"
                  onClick={onNavigateAgentDashboard}
                />
              )}
            </nav>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}

function MobileNavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
        active
          ? 'border-[#035f53] bg-[#035f53] text-white'
          : 'border-neutral-200 bg-white text-neutral-700 hover:border-[#035f53] hover:text-[#035f53]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function SideItem({
  active = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={`flex items-center gap-4 rounded-xl px-4 py-4 text-left text-sm font-bold transition-colors ${
        active
          ? 'bg-[#eff8f4] text-[#035f53] shadow-[inset_5px_0_0_#008f79]'
          : 'text-neutral-500 hover:bg-[#f2faf7] hover:text-[#035f53]'
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl ${
          active ? 'bg-white text-[#035f53]' : 'text-neutral-400'
        }`}
      >
        {icon}
      </span>
      {label}
    </button>
  )
}
