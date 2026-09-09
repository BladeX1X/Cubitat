import * as React from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '../lib/utils'

type SelectContextValue = {
  value: string
  open: boolean
  mounted: boolean
  setOpen: (open: boolean) => void
  onValueChange: (value: string) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const context = React.useContext(SelectContext)

  if (!context) {
    throw new Error('Select components must be used inside <Select>')
  }

  return context
}

type SelectProps = {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (open) {
      setMounted(true)
      return undefined
    }

    const closeTimer = window.setTimeout(() => setMounted(false), 170)

    return () => window.clearTimeout(closeTimer)
  }, [open])

  React.useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Element
      if (!rootRef.current?.contains(target) && !target.closest('[data-slot="select-content"]')) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <SelectContext.Provider
      value={{ value, open, mounted, setOpen, onValueChange, triggerRef }}
    >
      <div ref={rootRef} data-slot="select" className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<'button'>) {
  const { open, setOpen, triggerRef } = useSelectContext()

  return (
    <button
      ref={triggerRef}
      data-slot="select-trigger"
      data-state={open ? 'open' : 'closed'}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      className={cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-950 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <span data-slot="select-trigger-icon">
        <ChevronDown
          className={cn('size-4 opacity-60 transition-transform', open && 'rotate-180')}
        />
      </span>
    </button>
  )
}

export function SelectValue({
  placeholder,
  children,
}: {
  placeholder?: string
  children?: React.ReactNode
}) {
  const hasContent = children !== undefined && children !== null && children !== ''
  return (
    <span data-slot="select-value" className="truncate">
      {hasContent ? children : placeholder}
    </span>
  )
}

export function SelectContent({
  className,
  children,
  portal = false,
  ...props
}: React.ComponentProps<'div'> & { portal?: boolean }) {
  const { open, mounted, triggerRef } = useSelectContext()
  const [portalStyle, setPortalStyle] = React.useState<React.CSSProperties>()

  React.useLayoutEffect(() => {
    if (!portal || !open) return

    function updatePosition() {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const menuWidth = Math.max(rect.width, 240)
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8))
      const bottomInset = window.innerWidth <= 768 ? 80 : 16
      const spaceBelow = window.innerHeight - rect.bottom - bottomInset
      const spaceAbove = rect.top - 16
      const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow
      const availableHeight = openAbove ? spaceAbove : spaceBelow

      setPortalStyle({
        position: 'fixed',
        left,
        width: rect.width,
        maxHeight: Math.max(160, Math.min(360, availableHeight)),
        top: openAbove ? 'auto' : rect.bottom,
        bottom: openAbove ? window.innerHeight - rect.top : 'auto',
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, portal, triggerRef])

  if (!mounted) return null

  const content = (
    <div
      data-slot="select-content"
      data-state={open ? 'open' : 'closed'}
      role="listbox"
      style={portal ? portalStyle : undefined}
      className={cn(
        'absolute top-full left-0 z-[100] mt-2 w-full overflow-hidden rounded-md border border-neutral-200 bg-white p-1 text-neutral-950 shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )

  return portal ? createPortal(content, document.body) : content
}

export function SelectItem({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<'button'> & { value: string }) {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext()
  const isSelected = selectedValue === value
  const isDisabled = props.disabled

  return (
    <button
      data-slot="select-item"
      role="option"
      aria-selected={isSelected}
      type="button"
      className={cn(
        'flex min-h-9 w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm font-semibold outline-none transition-colors hover:bg-emerald-50 focus:bg-emerald-50 aria-selected:bg-emerald-50 aria-selected:text-emerald-900',
        isDisabled && 'cursor-default opacity-70 hover:bg-white focus:bg-white',
        className,
      )}
      onClick={() => {
        if (isDisabled) return
        onValueChange(value)
        setOpen(false)
      }}
      {...props}
    >
      <span>{children}</span>
    </button>
  )
}
