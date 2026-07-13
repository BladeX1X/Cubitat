export function extractReferralCode(
  search: string,
  user: { id: string } | null,
  storage: { setItem: (key: string, val: string) => void }
): string | null {
  const params = new URLSearchParams(search)
  const refCode = params.get('ref')

  if (refCode) {
    const myReferralCode = user ? `REF-${user.id.slice(0, 8).toUpperCase()}` : null
    if (refCode === myReferralCode) {
      return null
    }
    storage.setItem('cubitat_referral_code', refCode)
    return refCode
  }
  return null
}
