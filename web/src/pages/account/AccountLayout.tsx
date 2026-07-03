import type { ReactNode } from 'react'
import { Check, Heart, Home, User as UserIcon } from 'lucide-react'
import { Button } from '../../shared/ui/button'

export type AccountSectionKey = 'account' | 'favorites' | 'contents'

type AccountLayoutProps = {
  active: AccountSectionKey
  children: ReactNode
  onNavigateAccount: () => void
  onNavigateFavorites: () => void
  onNavigateMyProperties: () => void
}

export function AccountLayout({
  active,
  children,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
}: AccountLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 rounded-md border border-[#00a88f]/35 bg-[#eafaf6] px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#00a88f] text-white">
              <Check size={17} strokeWidth={3} />
            </span>
            <p className="text-sm sm:text-base font-extrabold text-neutral-900">
              Mas confianza, mas contactos. Verifica tu cuenta gratis.
            </p>
          </div>
          <Button
            className="self-start md:self-auto rounded-full bg-[#008f79] hover:bg-[#007565] text-white h-9 px-5 text-sm font-black"
            type="button"
          >
            Verificar gratis
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8">
          <aside className="border-r border-neutral-100 pr-0 lg:pr-6">
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
                label="Ver mis contenidos"
                onClick={onNavigateMyProperties}
              />
            </nav>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
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
