import { MarketplaceContactActions } from './MarketplaceContactActions'
import type { MarketplaceListingType } from '../lib/marketplaceContact'

type MarketplaceCardActionsProps = {
  listingId: string
  listingType: MarketplaceListingType
  listingTitle: string
  listingLocation: string
  onMissing: () => void
}

/** Shared direct contact actions for service and material cards. */
export function MarketplaceCardActions(props: MarketplaceCardActionsProps) {
  return <MarketplaceContactActions {...props} layout="card" />
}
