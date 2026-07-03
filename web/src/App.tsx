import { CubitatApp } from './app/CubitatApp'
import { AuthModalProvider } from './modules/auth/contexts/AuthModalContext'

export default function App() {
  return (
    <AuthModalProvider>
      <CubitatApp />
    </AuthModalProvider>
  )
}
