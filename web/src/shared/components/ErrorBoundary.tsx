import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  isChunkError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isChunkError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    const isChunk =
      error.name === 'ChunkLoadError' ||
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('loading chunk')

    if (isChunk) {
      window.location.reload()
      return { hasError: true, isChunkError: true }
    }
    return { hasError: true, isChunkError: false }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  public handleReload = () => {
    window.location.href = '/'
  }

  public handleTryAgain = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-neutral-50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#035f53] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-neutral-500 font-medium">Actualizando aplicación...</p>
            </div>
          </div>
        )
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 px-4 py-20 text-center select-none">
          <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] p-8 md:p-10 space-y-6">
            <svg className="w-24 h-24 text-rose-500 mx-auto" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 15L80 25V55C80 73.18 67.22 89.77 50 95C32.78 89.77 20 73.18 20 55V25L50 15Z" 
                    fill="#fff1f2" stroke="#f43f5e" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M50 35V60" stroke="#be123c" strokeWidth="4" strokeLinecap="round" />
              <circle cx="50" cy="73" r="3.5" fill="#be123c" />
              <path d="M35 38C30 45 30 55 35 62" stroke="#fda4af" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" className="animate-pulse" />
              <path d="M65 38C70 45 70 55 65 62" stroke="#fda4af" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" className="animate-pulse" />
            </svg>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-neutral-900 tracking-tight">Conexión interrumpida o error de carga</h1>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                No pudimos conectar con los servidores o la aplicación experimentó un fallo inesperado. Por favor, verifica tu conexión a internet o reintenta cargar la página.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleTryAgain}
                className="w-full bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 text-xs font-black transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg"
              >
                Reintentar ahora
              </button>
              <button
                onClick={this.handleReload}
                className="w-full bg-transparent hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700 rounded-full h-10 text-xs font-black transition-all duration-200 cursor-pointer"
              >
                Volver a la página de inicio
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
