export function formatPrice(value: number | null, currency: 'USD' | 'CUP' | 'MLC' = 'USD'): string {
  if (!value) return 'Precio no informado'
  if (currency !== 'USD') {
    return `${currency} ${value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
  }
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
