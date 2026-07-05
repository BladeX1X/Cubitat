import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    // Detect page-load chunk failures and force reload to fetch latest versions
    if (error.name === 'ChunkLoadError' || error.message.includes('Failed to fetch dynamically imported module')) {
      window.location.reload()
    }
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  public handleReload = () => {
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 px-4 py-20 text-center">
          <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-100 shadow-xl p-8 space-y-4">
            <h1 className="text-xl font-bold text-neutral-800">Algo salió mal</h1>
            <p className="text-xs text-neutral-500 leading-normal">
              Ocurrió un error inesperado al cargar la aplicación. Si el problema persiste, intenta recargar la página.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full bg-[#035f53] hover:bg-[#024a41] text-white rounded-full h-11 text-xs font-bold transition-all duration-200"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
