import { writeFileSync } from 'fs'

const PROVINCES = [
  { id: 'pinar-del-rio', name: 'Pinar del Río', city: 'Pinar del Río', lat: 22.4175, lng: -83.6975 },
  { id: 'artemisa', name: 'Artemisa', city: 'Artemisa', lat: 22.8167, lng: -82.7667 },
  { id: 'la-habana', name: 'La Habana', city: 'Plaza de la Revolución', lat: 23.141, lng: -82.383 },
  { id: 'mayabeque', name: 'Mayabeque', city: 'San José de las Lajas', lat: 22.9614, lng: -82.1511 },
  { id: 'matanzas', name: 'Matanzas', city: 'Matanzas', lat: 23.0411, lng: -81.5775 },
  { id: 'cienfuegos', name: 'Cienfuegos', city: 'Cienfuegos', lat: 22.1497, lng: -80.4467 },
  { id: 'villa-clara', name: 'Villa Clara', city: 'Santa Clara', lat: 22.4067, lng: -79.9647 },
  { id: 'sancti-spiritus', name: 'Sancti Spíritus', city: 'Sancti Spíritus', lat: 21.9333, lng: -79.4439 },
  { id: 'ciego-de-avila', name: 'Ciego de Ávila', city: 'Ciego de Ávila', lat: 21.8481, lng: -78.7631 },
  { id: 'camaguey', name: 'Camagüey', city: 'Camagüey', lat: 21.3833, lng: -77.9167 },
  { id: 'las-tunas', name: 'Las Tunas', city: 'Las Tunas', lat: 20.9611, lng: -76.9511 },
  { id: 'holguin', name: 'Holguín', city: 'Holguín', lat: 20.8889, lng: -76.2628 },
  { id: 'granma', name: 'Granma', city: 'Bayamo', lat: 20.3742, lng: -76.6436 },
  { id: 'santiago-de-cuba', name: 'Santiago de Cuba', city: 'Santiago de Cuba', lat: 20.0208, lng: -75.8267 },
  { id: 'guantanamo', name: 'Guantánamo', city: 'Guantánamo', lat: 20.1444, lng: -75.2092 },
  { id: 'isla-de-la-juventud', name: 'Isla de la Juventud', city: 'Nueva Gerona', lat: 21.8833, lng: -82.8000 }
]

const PROPERTY_TEMPLATES = [
  { title: 'Apartamento de 2 cuartos muy céntrico', priceUsd: 12000, type: 'apartamento', op: 'venta', area: 65, beds: 2, baths: 1 },
  { title: 'Casa independiente espaciosa con portal y patio', priceUsd: 35000, type: 'casa', op: 'venta', area: 150, beds: 3, baths: 2 },
  { title: 'Se renta casa con piscina ideal para vacaciones', priceUsd: 150, type: 'casa', op: 'alquiler', area: 180, beds: 4, baths: 3 },
  { title: 'Apartamento moderno en alquiler mensual', priceUsd: 400, type: 'apartamento', op: 'alquiler', area: 55, beds: 1, baths: 1 },
  { title: 'Gran casona colonial con techos altos de placa libre', priceUsd: 75000, type: 'casa', op: 'venta', area: 250, beds: 5, baths: 3 },
  { title: 'Apartamento pequeño ideal para parejas o solteros', priceUsd: 8500, type: 'apartamento', op: 'venta', area: 45, beds: 1, baths: 1 }
]

const COVER_TONES = ['#f3f4f6', '#e8f0fe', '#fef3e2', '#e6f7ed', '#fce4e4', '#f0e6f7', '#e0f2f1', '#fff3e0']

const REAL_PHOTO_IDS = [
  'photo-1570129477492-45c003edd2be',
  'photo-1564013799919-ab600027ffc6',
  'photo-1512917774080-9991f1c4c750',
  'photo-1513694203232-719a280e022f',
  'photo-1484154218962-a197022b5858',
  'photo-1502672260266-1c1ef2d93688',
  'photo-1600585154340-be6161a56a0c',
  'photo-1600596542815-ffad4c1539a9',
  'photo-1600607687939-ce8a6c25118c',
  'photo-1600566753190-17f0baa2a6c3',
  'photo-1580587771525-78b9dba3b914',
  'photo-1598928506311-c55ded91a20c',
  'photo-1568605114967-8130f3a36994',
  'photo-1554995207-c18c203602cb',
  'photo-1512915922686-57c11dde9b6b',
  'photo-1515263487990-61b07816b324'
]

const DESCRIPTIONS = [
  'Excelente propiedad en perfecto estado constructivo, lista para habitar inmediatamente. Cuenta con excelente iluminación, ventilación natural cruzada y sistema de agua independiente.',
  'Ubicada en una zona muy tranquila y segura de la localidad. Cerca de paradas de transporte público, escuelas y tiendas de conveniencia. Gas de la calle o balita garantizada.',
  'Casa con amplios espacios, cocina moderna totalmente azulejada y portal espacioso para disfrutar las tardes. Documentos listos para la venta.',
  'Apartamento muy luminoso, ideal tanto para vivir como para negocio de renta. Marquetería de aluminio y pisos de terrazo pulido en excelente estado.',
  'Inmueble con excelente distribución, habitaciones amplias con clósets empotrados y baños remodelados recientemente. Tanque instalado de gran capacidad.'
]

const PHONES = ['+53 5 4012345', '+53 5 2987654', '+53 5 3654891', '+53 5 2745638', '+53 5 8421093', '+53 5 9182736']
const NAMES = ['Carlos Pérez', 'María García', 'Juan Rodríguez', 'Ana Martínez', 'Pedro Sánchez', 'Laura López', 'Rodolfo Jorba']

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function toSqlArray(arr) {
  if (!arr || arr.length === 0) return "ARRAY[]::text[]"
  const escapedItems = arr.map(item => `'${item.replace(/'/g, "''")}'`)
  return `ARRAY[${escapedItems.join(', ')}]::text[]`
}

function main() {
  const properties = []
  let seedIndex = 1

  // Generate 6 properties for each of the 16 provinces/municipalities (total 96 properties)
  for (const province of PROVINCES) {
    for (let j = 0; j < 6; j++) {
      const template = PROPERTY_TEMPLATES[j % PROPERTY_TEMPLATES.length]
      const latOffset = (Math.random() - 0.5) * 0.03
      const lngOffset = (Math.random() - 0.5) * 0.03

      const title = `${template.title} en ${province.city}`
      const location = `${province.name}, ${province.city}`

      const coverId = REAL_PHOTO_IDS[seedIndex % REAL_PHOTO_IDS.length]
      const img1Id = REAL_PHOTO_IDS[(seedIndex + 1) % REAL_PHOTO_IDS.length]
      const img2Id = REAL_PHOTO_IDS[(seedIndex + 2) % REAL_PHOTO_IDS.length]

      properties.push({
        id: `00000000-0000-0000-0000-${String(seedIndex).padStart(12, '0')}`,
        title: title,
        location: location,
        description: randomItem(DESCRIPTIONS),
        zoneId: province.id,
        operation: template.op,
        propertyType: template.type,
        priceUsd: template.priceUsd,
        bedrooms: template.beds,
        bathrooms: template.baths,
        parking: Math.random() > 0.5 ? 1 : 0,
        areaM2: template.area,
        amenities: [],
        status: 'published',
        coverTone: randomItem(COVER_TONES),
        coverImage: `https://images.unsplash.com/${coverId}?auto=format&fit=crop&w=800&q=80`,
        images: [
          `https://images.unsplash.com/${img1Id}?auto=format&fit=crop&w=800&q=80`,
          `https://images.unsplash.com/${img2Id}?auto=format&fit=crop&w=800&q=80`
        ],
        coordinates: {
          latitude: +(province.lat + latOffset).toFixed(6),
          longitude: +(province.lng + lngOffset).toFixed(6),
        },
        contact_info: {
          name: randomItem(NAMES),
          phone: randomItem(PHONES),
        },
      })
      seedIndex++
    }
  }

  // Generate SQL
  const inserts = properties.map(p => {
    const vals = {
      id: p.id,
      title: p.title,
      location: p.location,
      description: p.description,
      zone_id: p.zoneId,
      operation: p.operation,
      property_type: p.propertyType,
      price_usd: p.priceUsd,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      parking: p.parking,
      area_m2: p.areaM2,
      amenities: toSqlArray(p.amenities),
      status: p.status,
      cover_tone: p.coverTone,
      cover_image: p.coverImage,
      images: toSqlArray(p.images),
      coordinates: JSON.stringify(p.coordinates),
      contact_info: p.contact_info ? JSON.stringify(p.contact_info) : null,
      created_at: new Date().toISOString(),
      user_id: '7fd957e4-0eab-4933-b488-9dfaa3ddbb3e' // Assigning a valid default seed user
    }

    const cols = Object.keys(vals).join(', ')
    const valsStr = Object.values(vals).map(v =>
      v === null ? 'NULL'
      : typeof v === 'string' && (v.startsWith('ARRAY[') || v === 'ARRAY[]::text[]') ? v
      : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'`
      : v
    ).join(', ')

    return `INSERT INTO properties (${cols}) VALUES (${valsStr}) ON CONFLICT (id) DO NOTHING;`
  })

  const sql = `-- Seed properties for Cubitat (synthetic test data for all provinces)
-- Generated ${new Date().toISOString()}

${inserts.join('\n')}
`

  const jsonPath = 'scripts/seed-synthetic-data.json'
  const sqlPath = 'scripts/seed-synthetic.sql'

  writeFileSync(jsonPath, JSON.stringify(properties, null, 2))
  writeFileSync(sqlPath, sql)

  console.log(`Generated ${properties.length} test properties`)
  console.log(`  ${jsonPath}`)
  console.log(`  ${sqlPath}`)
}

main()
