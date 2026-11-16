import type { ComponentProps } from 'react'
import { Heart } from 'lucide-react'
import { useSavedProperties } from '../hooks/useSavedProperties'

type SavePropertyButtonProps = Omit<ComponentProps<'button'>, 'type' | 'aria-label' | 'className'> & {
  propertyId: string
  propertyTitle?: string
  className?: string | ((isSaved: boolean) => string)
  iconClassName?: string | ((isSaved: boolean) => string)
  iconSize?: number
  labelClassName?: string
  showLabel?: boolean
  savedLabel?: string
  unsavedLabel?: string
  stopPropagation?: boolean
  preventDefault?: boolean
}

export function SavePropertyButton({
  propertyId,
  propertyTitle,
  className,
  iconClassName,
  iconSize = 18,
  labelClassName,
  showLabel = false,
  savedLabel = 'Guardado',
  unsavedLabel = 'Guardar',
  stopPropagation = false,
  preventDefault = false,
  onClick,
  onPointerDown,
  children,
  ...buttonProps
}: SavePropertyButtonProps) {
  const { isSaved, toggleSave, sessionReady } = useSavedProperties()
  const saved = isSaved(propertyId)
  const ariaLabel = propertyTitle
    ? saved
      ? `Quitar ${propertyTitle} de guardados`
      : `Guardar ${propertyTitle}`
    : saved
      ? 'Quitar de guardados'
      : 'Guardar propiedad'

  const resolvedClassName = typeof className === 'function' ? className(saved) : className
  const resolvedIconClassName = typeof iconClassName === 'function'
    ? iconClassName(saved)
    : iconClassName

  return (
    <button
      {...buttonProps}
      type="button"
      aria-label={ariaLabel}
      aria-busy={!sessionReady || buttonProps['aria-busy']}
      disabled={!sessionReady || buttonProps.disabled}
      title={!sessionReady ? 'Comprobando tu sesión…' : buttonProps.title}
      className={resolvedClassName}
      onPointerDown={(event) => {
        if (stopPropagation) event.stopPropagation()
        onPointerDown?.(event)
      }}
      onClick={(event) => {
        if (preventDefault) event.preventDefault()
        if (stopPropagation) event.stopPropagation()
        toggleSave(propertyId)
        onClick?.(event)
      }}
    >
      {children ?? (
        <>
          <Heart size={iconSize} className={resolvedIconClassName} />
          {showLabel ? (
            <span className={labelClassName}>{saved ? savedLabel : unsavedLabel}</span>
          ) : null}
        </>
      )}
    </button>
  )
}
