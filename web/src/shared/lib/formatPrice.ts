const usdFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatPrice(price?: number) {
  if (!price) return 'Precio a consultar'
  return usdFormatter.format(price)
}
