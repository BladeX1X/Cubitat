import { CubitatApp } from './app/CubitatApp'
import { AuthModalProvider } from './modules/auth/contexts/AuthModalContext'
import { ErrorBoundary } from './shared/components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthModalProvider>
        <CubitatApp />
      </AuthModalProvider>
    </ErrorBoundary>
  )
}
