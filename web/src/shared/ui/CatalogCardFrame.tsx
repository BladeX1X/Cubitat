import type { ReactNode } from 'react'
import './CatalogCardFrame.css'

type CatalogCardFrameProps = {
  children: ReactNode
  className?: string
}

/** Shared visual frame for property, service, and material catalog cards. */
export function CatalogCardFrame({ children, className = '' }: CatalogCardFrameProps) {
  return <article className={`catalog-card ${className}`.trim()}>{children}</article>
}
