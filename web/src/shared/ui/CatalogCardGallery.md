# CatalogCardGallery

Shared photo gallery used by the Services and Materials listing cards. It
reuses the property carousel controls, indicators, image aspect ratio, and
favorite overlay placement while letting each catalog provide its image loader,
fallback, unavailable-photo message, and favorite action.

Arrows and accessible photo dots appear only when there are multiple images.
Each catalog still owns its category, title, location, domain-specific price or
description, and contact actions. `MarketplaceCardImage` keeps thumbnail
optimization and deferred loading for later photos.
