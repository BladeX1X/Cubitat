export function shouldFitInitialBounds(hasFittedInitialBounds: boolean, boundsAreEmpty: boolean): boolean {
  return !hasFittedInitialBounds && !boundsAreEmpty
}
