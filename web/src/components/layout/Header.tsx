import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ArrowLeftRight, Boxes, BriefcaseBusiness, Building2, Calculator, Download, Heart, Home, LogOut, Menu, Search, ShieldCheck, UserCircle, X } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { UserMenu, NotificationsMenu } from '../UserMenu'
import { PWA_INSTALL_REQUEST_EVENT } from './PWAInstallPrompt'
import { isIOSDevice, isStandalonePWA } from '../../shared/pwa/installEnvironment'

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
  navigateServices?: () => void
  navigateMaterials?: () => void
  navigateValuation?: () => void
  openLogin: () => void
  handleOperationNavigation: (op: 'venta' | 'alquiler' | 'permuta') => void
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
  navigateServices,
  navigateMaterials,
  navigateValuation,
  openLogin,
  handleOperationNavigation,
  onSignOut,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const showInstallOption = !isStandalonePWA()
  const installOptionLabel = isIOSDevice() ? 'Cómo instalar Cubitat' : 'Instalar Cubitat'

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.classList.add('has-mobile-menu-open')
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.classList.remove('has-mobile-menu-open')
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileMenuOpen])

  function handleNavigation(callback: () => void) {
    setIsMobileMenuOpen(false)
    callback()
  }

  function requestPwaInstall() {
    setIsMobileMenuOpen(false)
    window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT))
  }

  return (
    <>
      <header className="site-header relative z-[100]">
        <a
          className="brand"
          href="/"
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
            href="/resultados"
            onClick={(event) => {
              event.preventDefault()
              handleNavigation(() => handleOperationNavigation('permuta'))
            }}
          >
            Permutar
          </a>
          {navigateServices && <a href="/servicios" onClick={(event) => { event.preventDefault(); handleNavigation(navigateServices) }}>Servicios</a>}
          {navigateMaterials && <a href="/materiales" onClick={(event) => { event.preventDefault(); handleNavigation(navigateMaterials) }}>Materiales</a>}
          {navigateValuation && <a href="/valorar" onClick={(event) => { event.preventDefault(); handleNavigation(navigateValuation) }}>Valorar</a>}
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
        {(navigateServices || navigateMaterials) && (
          <nav className="mobile-catalog-shortcuts" aria-label="Catálogos">
            {navigateServices && <button type="button" onClick={() => handleNavigation(navigateServices)}>Servicios</button>}
            {navigateMaterials && <button type="button" onClick={() => handleNavigation(navigateMaterials)}>Materiales</button>}
          </nav>
        )}
      </header>

      {isMobileMenuOpen && (
        <aside className="mobile-menu-panel" aria-label="Menú móvil">
          <div className="mobile-menu-topline">
            <span>Menú</span>
            {user && <small>Cuenta Cubitat</small>}
          </div>
          {(navigateServices || navigateMaterials) && (
            <nav className="mobile-menu-catalogs" aria-label="Servicios y materiales">
              <p className="mobile-menu-section-title">Servicios y materiales</p>
              <div className="mobile-menu-catalog-grid">
                {navigateServices && <button type="button" onClick={() => handleNavigation(navigateServices)}><BriefcaseBusiness size={18} /><span>Servicios<small>Profesionales del hogar</small></span></button>}
                {navigateMaterials && <button type="button" onClick={() => handleNavigation(navigateMaterials)}><Boxes size={18} /><span>Materiales<small>Construcción</small></span></button>}
              </div>
            </nav>
          )}
          {user ? (
            <div className="mobile-menu-profile">
              <span>{(user.user_metadata?.full_name || user.email || 'U').slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{user.user_metadata?.full_name || 'Usuario Cubitat'}</strong>
                <p>{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="mobile-menu-guest-card">
              <strong>Entra a tu cuenta</strong>
              <p>Guarda favoritos, publica inmuebles y gestiona tus alertas.</p>
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
            </div>
          )}
          {user && (
            <nav className="mobile-menu-list" aria-label="Opciones de cuenta">
              <button type="button" onClick={() => handleNavigation(navigateAccount)}><UserCircle size={19} />Mi cuenta</button>
              <button type="button" onClick={() => handleNavigation(navigateFavorites)}><Heart size={19} />Favoritos</button>
              <button type="button" onClick={() => handleNavigation(navigateMyProperties)}><Building2 size={19} />Mis publicaciones</button>
              {userRole === 'admin' && (
                <button type="button" onClick={() => handleNavigation(navigateModerar)}><ShieldCheck size={19} />Moderar</button>
              )}
              <button type="button" onClick={() => handleNavigation(navigatePublish)}><Home size={19} />Publicar</button>
              <button className="mobile-menu-signout" type="button" onClick={() => handleNavigation(onSignOut)}>
                <LogOut size={19} />Cerrar sesión
              </button>
            </nav>
          )}
          <Button className="mobile-menu-publish" type="button" onClick={() => handleNavigation(navigatePublish)}>
            Publicar gratis
          </Button>
          {showInstallOption && (
            <button className="mobile-menu-install" type="button" onClick={requestPwaInstall}>
              <Download size={18} />{installOptionLabel}
            </button>
          )}
          <p className="mobile-menu-section-title">Explorar inmuebles</p>
          <nav className="mobile-menu-accordion" aria-label="Operaciones">
            <button type="button" onClick={() => handleNavigation(() => handleOperationNavigation('venta'))}><Search size={18} />Comprar</button>
            <button type="button" onClick={() => handleNavigation(() => handleOperationNavigation('alquiler'))}><Building2 size={18} />Rentar</button>
            <button type="button" onClick={() => handleNavigation(() => handleOperationNavigation('permuta'))}><ArrowLeftRight size={18} />Permutar</button>
            {navigateValuation && <button type="button" onClick={() => handleNavigation(navigateValuation)}><Calculator size={18} />Valoración orientativa</button>}
          </nav>
        </aside>
      )}
    </>
  )
}
