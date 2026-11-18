export function getLocalDraftCoverImage(images: readonly { dataUrl: string }[] | null | undefined): string | null {
  return images?.find(image => image.dataUrl.startsWith('data:image/'))?.dataUrl ?? null
}
