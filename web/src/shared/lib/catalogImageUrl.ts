/** Request compact card-sized images from Unsplash without changing other hosts. */
export function optimizeCatalogImageUrl(image: string): string {
  try {
    const url = new URL(image)
    if (url.hostname !== 'images.unsplash.com') return image
    url.searchParams.set('auto', 'format')
    url.searchParams.set('fit', 'crop')
    url.searchParams.set('w', '420')
    url.searchParams.set('q', '45')
    return url.toString()
  } catch {
    return image
  }
}
