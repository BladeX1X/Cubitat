const usdFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatPrice(price?: number, currency: 'USD' | 'CUP' | 'MLC' = 'USD') {
  if (!price) return 'Precio a consultar'
  if (currency === 'USD') return usdFormatter.format(price)
  const amount = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(price)
  return `${currency} ${amount}`
}
