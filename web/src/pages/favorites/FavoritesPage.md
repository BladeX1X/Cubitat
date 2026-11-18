# FavoritesPage

Private account view that combines saved properties, service providers, and
material listings. Property and marketplace favorites are loaded through their
respective shared hooks; service and material records are then fetched by saved
ID.

## Category filters

The `Todos`, `Propiedades`, `Servicios`, and `Materiales` controls filter the
already loaded records locally. They keep the user on `/favoritos`, update the
visible count, expose their selected state through `aria-pressed`, and show a
category-specific empty message when no records match. `Todos` restores the
combined list. The “Explorar” actions in the overall empty state remain catalog
navigation actions.

## Regression coverage

`FavoritesPage.test.tsx` verifies each category filter, the return to `Todos`,
and that selecting a filter does not invoke catalog navigation callbacks.
