export function SiteFooter() {
  function handleNavigate(path: string) {
    window.history.pushState(null, '', path)
    window.dispatchEvent(new Event('popstate'))
  }

  return (
    <footer className="site-footer border-t border-neutral-100 bg-white mt-12 py-8 text-sm text-neutral-500">
      <div className="footer-content max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col items-center md:items-start">
          <strong className="text-[#035f53] font-black text-base">Cubitat</strong>
          <span className="text-xs font-medium text-neutral-400 mt-0.5">Portal inmobiliario para Cuba</span>
        </div>
        <div className="flex gap-6 text-xs font-bold">
          <button 
            type="button"
            onClick={() => handleNavigate('/privacidad')}
            className="hover:text-emerald-800 transition-colors border-none bg-transparent cursor-pointer text-neutral-500"
          >
            Política de Privacidad
          </button>
          <button 
            type="button"
            onClick={() => handleNavigate('/terminos')}
            className="hover:text-emerald-800 transition-colors border-none bg-transparent cursor-pointer text-neutral-500"
          >
            Términos de Servicio
          </button>
        </div>
        <div className="text-[11px] font-semibold text-neutral-400">
          &copy; {new Date().getFullYear()} Cubitat. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
