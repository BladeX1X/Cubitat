import { CubitatApp } from './app/CubitatApp'
import { AuthModalProvider } from './modules/auth/contexts/AuthModalContext'
import { SavedPropertiesProvider } from './modules/properties/hooks/useSavedProperties'
import { ErrorBoundary } from './shared/components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthModalProvider>
        <SavedPropertiesProvider>
          <CubitatApp />
        </SavedPropertiesProvider>
      </AuthModalProvider>
    </ErrorBoundary>
  )
}
