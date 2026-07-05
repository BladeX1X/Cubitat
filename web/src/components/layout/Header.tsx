import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Menu, Search, X } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { UserMenu, NotificationsMenu } from '../UserMenu'

interface HeaderProps {
  user: User | null
  userRole?: string
  navigateHome: () => void
  navigateAccount: () => void
  navigateFavorites: () => void
  navigateMyProperties: () => void
  navigateModerar: () => void
  navigatePublish: () => void
  navigateResults: () => void
  openLogin: () => void
  handleOperationNavigation: (op: 'venta' | 'alquiler') => void
  onSignOut: () => void
}

export function Header({
  user,
  userRole,
  navigateHome,
  navigateAccount,
  navigateFavorites,
  navigateMyProperties,
  navigateModerar,
  navigatePublish,
  navigateResults,
  openLogin,
  handleOperationNavigation,
  onSignOut,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  function handleNavigation(callback: () => void) {
    setIsMobileMenuOpen(false)
    callback()
  }

  return (
    <>
      <header className="site-header relative z-[100]">
        <a
          className="brand"
          href="/"
          aria-label="c Cubitat"
          onClick={(event) => {
            event.preventDefault()
            handleNavigation(navigateHome)
          }}
        >
          <span className="brand-mark">c</span>
          <span>Cubitat</span>
        </a>
        <nav className="primary-nav" aria-label="Navegacion principal">
          <a
            href="/resultados"
            onClick={(event) => {
              event.preventDefault()
              handleNavigation(() => handleOperationNavigation('venta'))
            }}
          >
            Comprar
          </a>
          <a
            href="/resultados"
            onClick={(event) => {
              event.preventDefault()
              handleNavigation(() => handleOperationNavigation('alquiler'))
            }}
          >
            Rentar
          </a>
          <a
            href="/publicar"
            onClick={(event) => {
              event.preventDefault()
              handleNavigation(navigatePublish)
            }}
          >
            Vender
          </a>
        </nav>
        <button
          type="button"
          className="mobile-header-search"
          onClick={() => handleNavigation(navigateResults)}
          aria-label="Buscar propiedades"
        >
          <span>Busca por zona o dirección</span>
          <Search size={15} />
        </button>
        <div className="header-actions">
          <Button
            className="publish-button"
            type="button"
            size="lg"
            onClick={() => handleNavigation(navigatePublish)}
          >
            Publicar gratis
          </Button>
          {user ? (
            <UserMenu
              user={user}
              userRole={userRole}
              onNavigateAccount={navigateAccount}
              onNavigateFavorites={navigateFavorites}
              onNavigateMyProperties={navigateMyProperties}
              onNavigateModerar={navigateModerar}
              onSignOut={onSignOut}
            />
          ) : (
            <Button
              className="login-button"
              type="button"
              variant="outline"
              size="lg"
              onClick={() => handleNavigation(openLogin)}
            >
              Ingresar
            </Button>
          )}
        </div>
        <div className="mobile-header-actions">
          {user && (
            <NotificationsMenu className="mobile-notifications" />
          )}
          <button
            className="mobile-menu-button"
            type="button"
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={25} />}
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <aside className="mobile-menu-panel" aria-label="Menú móvil">
          {user ? (
            <div className="mobile-menu-profile">
              <span>{(user.user_metadata?.full_name || user.email || 'U').slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{user.user_metadata?.full_name || 'Usuario Cubitat'}</strong>
                <p>{user.email}</p>
              </div>
            </div>
          ) : (
            <button
              className="mobile-menu-login"
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false)
                openLogin()
              }}
            >
              Ingresar o crear cuenta
            </button>
          )}
          {user && (
            <nav className="mobile-menu-list" aria-label="Opciones de cuenta">
              <button type="button" onClick={() => handleNavigation(navigateAccount)}>Mi cuenta</button>
              <button type="button" onClick={() => handleNavigation(navigateFavorites)}>Favoritos</button>
              <button type="button" onClick={() => handleNavigation(navigateMyProperties)}>Mis publicaciones</button>
              {userRole === 'admin' && (
                <button type="button" onClick={() => handleNavigation(navigateModerar)}>Moderar</button>
              )}
              <button type="button" onClick={() => handleNavigation(navigatePublish)}>Vender</button>
              <button className="mobile-menu-signout" type="button" onClick={() => handleNavigation(onSignOut)}>
                Cerrar sesión
              </button>
            </nav>
          )}
          <Button className="mobile-menu-publish" type="button" onClick={() => handleNavigation(navigatePublish)}>
            Publicar gratis
          </Button>
          <nav className="mobile-menu-accordion" aria-label="Operaciones">
            <button type="button" onClick={() => handleNavigation(() => handleOperationNavigation('venta'))}>Comprar</button>
            <button type="button" onClick={() => handleNavigation(() => handleOperationNavigation('alquiler'))}>Rentar</button>
          </nav>
        </aside>
      )}
    </>
  )
}
