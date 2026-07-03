import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface AuthModalContextType {
  isLoginOpen: boolean
  openLogin: () => void
  closeLogin: () => void
  isSavePromptOpen: boolean
  openSavePrompt: () => void
  closeSavePrompt: () => void
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false)

  const openLogin = () => setIsLoginOpen(true)
  const closeLogin = () => setIsLoginOpen(false)
  
  const openSavePrompt = () => setIsSavePromptOpen(true)
  const closeSavePrompt = () => setIsSavePromptOpen(false)

  return (
    <AuthModalContext.Provider value={{ 
      isLoginOpen, openLogin, closeLogin,
      isSavePromptOpen, openSavePrompt, closeSavePrompt
    }}>
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider')
  }
  return context
}
