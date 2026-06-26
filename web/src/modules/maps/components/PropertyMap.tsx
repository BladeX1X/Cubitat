import { SvgMapAdapter } from '../adapters/SvgMapAdapter'
import type { MapAdapterProps } from '../types'

export function PropertyMap(props: MapAdapterProps) {
  return <SvgMapAdapter {...props} />
}
