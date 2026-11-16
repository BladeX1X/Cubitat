import { CubitatApp } from './app/CubitatApp'
import { AuthModalProvider } from './modules/auth/contexts/AuthModalContext'
import { SavedPropertiesProvider } from './modules/properties/hooks/useSavedProperties'
import { SavedMarketplaceListingsProvider } from './modules/marketplace/hooks/useSavedMarketplaceListings'
import { PHASE_FOUR_MAT_ENABLED, PHASE_FOUR_SVC_ENABLED } from './shared/config/features'
import { ErrorBoundary } from './shared/components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthModalProvider>
        <SavedPropertiesProvider>
          <SavedMarketplaceListingsProvider enabled={PHASE_FOUR_SVC_ENABLED || PHASE_FOUR_MAT_ENABLED}>
            <CubitatApp />
          </SavedMarketplaceListingsProvider>
        </SavedPropertiesProvider>
      </AuthModalProvider>
    </ErrorBoundary>
  )
}
