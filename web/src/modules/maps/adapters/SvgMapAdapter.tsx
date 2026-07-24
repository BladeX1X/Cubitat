import { cubaZones } from '../data/cubaZones'
import type { MapAdapterProps } from '../types'

export function SvgMapAdapter({
  properties,
  selectedZoneId,
  selectedPropertyId,
  onSelectZone,
  onSelectProperty,
}: MapAdapterProps) {
  const selectedZone = cubaZones.find((zone) => zone.id === selectedZoneId)

  return (
    <div className="map-card">
      <div className="map-card-header">
        <div>
          <p className="eyebrow">Modulo de mapas</p>
          <h2>{selectedZone ? selectedZone.name : 'Todas las zonas'}</h2>
        </div>
        <span className="map-mode">SVG adapter</span>
      </div>

      <p className="map-description">
        {selectedZone
          ? selectedZone.description
          : 'El resto de la app usa una interfaz comun. Este adaptador se puede cambiar por PMTiles, MapLibre o un mapa autohospedado.'}
      </p>

      <svg
        className="cuba-map"
        viewBox="0 0 1100 560"
        role="img"
        aria-label="Mapa autocontenido de zonas de Cuba"
      >
        <rect className="map-sea" x="0" y="0" width="1100" height="560" rx="22" />
        {cubaZones.map((zone) => {
          const zoneCount = properties.filter(
            (property) => property.zoneId === zone.id,
          ).length
          const isSelected = selectedZoneId === zone.id

          return (
            <g key={zone.id}>
              <path
                className={`map-zone ${getZoneClass(zoneCount)} ${
                  isSelected ? 'is-selected' : ''
                }`}
                d={zone.path}
                role="button"
                tabIndex={0}
                onClick={() => onSelectZone?.(zone.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    onSelectZone?.(zone.id)
                  }
                }}
              />
              <text
                className="map-zone-label"
                x={zone.labelPoint.x - 48}
                y={zone.labelPoint.y - 34}
              >
                {zone.name}
              </text>
              <circle
                className="map-count-badge"
                cx={zone.labelPoint.x}
                cy={zone.labelPoint.y}
                r="22"
              />
              <text
                className="map-count-text"
                x={zone.labelPoint.x}
                y={zone.labelPoint.y}
              >
                {zoneCount}
              </text>
            </g>
          )
        })}

        {properties
          .filter(
            (property) =>
              selectedZoneId !== 'all' && property.zoneId === selectedZoneId,
          )
          .map((property) => (
            <g
              key={property.id}
              className={`map-property-marker ${
                property.id === selectedPropertyId ? 'is-selected' : ''
              }`}
              transform={`translate(${property.mapPoint.x} ${property.mapPoint.y})`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectProperty(property.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  onSelectProperty(property.id)
                }
              }}
            >
              <circle r="17" />
              <text y="1">{property.propertyType[0].toUpperCase()}</text>
            </g>
          ))}
      </svg>
    </div>
  )
}

function getZoneClass(count: number) {
  if (count === 0) return 'is-empty'
  if (count <= 2) return 'is-low'
  if (count <= 4) return 'is-mid'
  return 'is-high'
}
