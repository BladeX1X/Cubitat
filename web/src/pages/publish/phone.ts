export function getCubanLocalPhone(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, '')
  if (clean.startsWith('0053')) return clean.slice(4)
  if (clean.startsWith('53')) return clean.slice(2)
  return clean
}

export function validatePhone(phone: string): boolean {
  const local = getCubanLocalPhone(phone)
  if (!local) return false

  return (local.length === 8 && local.startsWith('5'))
    || (local.length >= 6
      && local.length <= 8
      && ['2', '3', '4', '7'].some((prefix) => local.startsWith(prefix)))
}

export function normalizeCubanPhoneForStorage(phone: string): string {
  const local = getCubanLocalPhone(phone)
  return local ? `+53${local}` : ''
}

export function formatCubanPhoneForDisplay(phone: string): string {
  const local = getCubanLocalPhone(phone)
  return local ? `+53 ${local}` : ''
}
