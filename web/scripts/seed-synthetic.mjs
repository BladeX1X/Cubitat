import { writeFileSync } from 'fs'

const ZONES = [
  { zoneId: 'vedado', name: 'Vedado', lat: 23.141, lng: -82.383 },
  { zoneId: 'habana-vieja', name: 'Habana Vieja', lat: 23.139, lng: -82.354 },
  { zoneId: 'centro-habana', name: 'Centro Habana', lat: 23.136, lng: -82.368 },
  { zoneId: 'playa', name: 'Playa', lat: 23.097, lng: -82.450 },
  { zoneId: 'miramar', name: 'Miramar', lat: 23.120, lng: -82.427 },
  { zoneId: 'nuevo-vedado', name: 'Nuevo Vedado', lat: 23.125, lng: -82.335 },
  { zoneId: 'marianao', name: 'Marianao', lat: 23.085, lng: -82.430 },
  { zoneId: 'guanabo', name: 'Guanabo', lat: 23.170, lng: -82.140 },
  { zoneId: 'cerro', name: 'Cerro', lat: 23.117, lng: -82.370 },
  { zoneId: 'santos-suarez', name: 'Santos Suárez', lat: 23.110, lng: -82.345 },
]

const PROPERTIES = [
  { title: 'Apto 2 cuartos en Nuevo Vedado zona El Bosque', priceUsd: 9500, type: 'apartamento', op: 'venta', area: 68, beds: 2, baths: 1 },
  { title: 'Precioso Apartamento en Bajos en Marianao cerca de 100 y 51', priceUsd: 8750, type: 'apartamento', op: 'venta', area: 55, beds: 2, baths: 1 },
  { title: 'Se vende hermosa casa colonial con 8 habitaciones', priceUsd: 600000, type: 'casa', op: 'venta', area: 350, beds: 8, baths: 4 },
  { title: 'Casa de playa en Santa Fe frente al mar con piscina', priceUsd: 246, type: 'casa', op: 'alquiler', area: 120, beds: 3, baths: 2 },
  { title: 'Vendo propiedad horizontal en El Náutico, La Habana', priceUsd: 150000, type: 'casa', op: 'venta', area: 200, beds: 4, baths: 3 },
  { title: 'Precioso apartamento para extranjeros en ubicación céntrica', priceUsd: 300, type: 'apartamento', op: 'alquiler', area: 65, beds: 2, baths: 1 },
  { title: 'Apartamento en Nuevo Vedado con planta eléctrica', priceUsd: 400, type: 'apartamento', op: 'alquiler', area: 70, beds: 2, baths: 1 },
  { title: 'Bonito Apartamento en el Malecón para extranjeros', priceUsd: 300, type: 'apartamento', op: 'alquiler', area: 50, beds: 1, baths: 1 },
  { title: 'Casa independiente en Centro Habana en venta', priceUsd: 35000, type: 'casa', op: 'venta', area: 85, beds: 2, baths: 1 },
  { title: 'Vendo apartamento de 2 habitaciones en Nuevo Vedado', priceUsd: 20000, type: 'apartamento', op: 'venta', area: 60, beds: 2, baths: 1 },
  { title: 'Se vende apartamento de 2/4 en buen estado', priceUsd: 7000, type: 'apartamento', op: 'venta', area: 55, beds: 2, baths: 1 },
  { title: 'Alquiler de casa independiente en Miramar 3 cuartos', priceUsd: 750, type: 'casa', op: 'alquiler', area: 140, beds: 3, baths: 2 },
  { title: 'Renta de apartamento independiente lineal en el Vedado', priceUsd: 350, type: 'apartamento', op: 'alquiler', area: 48, beds: 1, baths: 1 },
  { title: 'Casa independiente de 2 cuartos en Santos Suárez', priceUsd: 12000, type: 'casa', op: 'venta', area: 75, beds: 2, baths: 1 },
  { title: 'Apartamento en Centro Habana cerca de 23 y 36', priceUsd: 9000, type: 'apartamento', op: 'venta', area: 45, beds: 1, baths: 1 },
  { title: 'Apto de 1/4 en buen lugar de Playa', priceUsd: 13000, type: 'apartamento', op: 'venta', area: 40, beds: 1, baths: 1 },
  { title: 'Permuto casa en bajos de 3 cuartos y 3 baños en Centro Habana', priceUsd: null, type: 'casa', op: 'permuta', area: 120, beds: 3, baths: 3 },
  { title: 'Se renta casa de 3 habitaciones con piscina en Varadero', priceUsd: 80, type: 'casa', op: 'alquiler', area: 90, beds: 3, baths: 2 },
  { title: 'Hostal de lujo de 4 habitaciones en Centro Habana', priceUsd: 30, type: 'casa', op: 'alquiler', area: 160, beds: 4, baths: 4 },
  { title: 'Casa de 2/4 en el Vedado, planta baja', priceUsd: 50000, type: 'casa', op: 'venta', area: 100, beds: 2, baths: 2 },
  { title: 'Se vende casa amplia en Aldabó, casa independiente', priceUsd: 28000, type: 'casa', op: 'venta', area: 110, beds: 3, baths: 2 },
  { title: 'Rento casa en Vedado para larga estancia, solo familia', priceUsd: 750, type: 'casa', op: 'alquiler', area: 130, beds: 3, baths: 2 },
  { title: 'Vendo casa en El Cotorro, 3 cuartos', priceUsd: 9000, type: 'casa', op: 'venta', area: 80, beds: 3, baths: 1 },
  { title: 'Casa independiente en Playa de 5/4', priceUsd: 120000, type: 'casa', op: 'venta', area: 220, beds: 5, baths: 4 },
]

const COVER_TONES = ['#f3f4f6', '#e8f0fe', '#fef3e2', '#e6f7ed', '#fce4e4', '#f0e6f7', '#e0f2f1', '#fff3e0']

const DESCRIPTIONS = [
  'Propiedad en excelente estado, lista para entrar a vivir. Pisos de cerámica, carpintería de aluminio, cocina equipada, baños modernos. Buena ventilación e iluminación natural.',
  'Inmueble bien ubicado, cerca de parques, escuelas y centros comerciales. Agua 24 horas, electricidad estable. Ideal para familia.',
  'Vivienda con amplios espacios, techos altos, patio interior. Climatización en todas las habitaciones. Tanque de agua y planta eléctrica.',
  'Propiedad recién renovada con materiales de primera calidad. Cocina integral, closets empotrados, piso de porcelanato. Lista para mudarse.',
  'Cómoda vivienda en zona residencial tranquila. Cerca del transporte público, farmacias y mercados. Agua y gas de la calle.',
  'Impecable propiedad con acabados de lujo. Vigas de acero, ventanales de cristal, terraza con vista. Cocina abierta equipada con electrodomésticos.',
  'Casa con jardín amplio y garaje para dos autos. Sala-comedor independiente, cocina amplia, lavadero. Ideal para familia con niños.',
  'Apartamento luminoso en edificio con portón eléctrico. Pasillos amplios, balcón tendal, cisterna propia. Tranquilo y seguro.',
]

const PHONES = ['+53 5 4012345', '+53 5 2987654', '+53 7 8321122', '+53 5 3654891', '+53 5 2745638', '+53 7 2049876']
const NAMES = ['Carlos Pérez', 'María García', 'Juan Rodríguez', 'Ana Martínez', 'Pedro Sánchez', 'Laura López']

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function main() {
  const properties = PROPERTIES.map((p, i) => {
    const zone = ZONES[i % ZONES.length]
    const latOffset = (Math.random() - 0.5) * 0.02
    const lngOffset = (Math.random() - 0.5) * 0.02

    return {
      id: `seed-s${String(i + 1).padStart(3, '0')}`,
      title: p.title,
      location: `La Habana, ${zone.name}`,
      description: randomItem(DESCRIPTIONS),
      zoneId: zone.zoneId,
      operation: p.op,
      propertyType: p.type,
      priceUsd: p.priceUsd,
      bedrooms: p.beds,
      bathrooms: p.baths,
      parking: Math.random() > 0.5 ? 1 : 0,
      areaM2: p.area,
      amenities: [],
      status: 'published',
      coverTone: randomItem(COVER_TONES),
      coverImage: `https://picsum.photos/seed/cubitat-${i + 1}/800/600`,
      images: [
        `https://picsum.photos/seed/cubitat-${i + 1}a/800/600`,
        `https://picsum.photos/seed/cubitat-${i + 1}b/800/600`,
        `https://picsum.photos/seed/cubitat-${i + 1}c/800/600`,
      ],
      coordinates: {
        latitude: +(zone.lat + latOffset).toFixed(6),
        longitude: +(zone.lng + lngOffset).toFixed(6),
      },
      mapPoint: {
        x: +(zone.lng + lngOffset).toFixed(6),
        y: +(zone.lat + latOffset).toFixed(6),
      },
      contact_info: {
        name: randomItem(NAMES),
        phone: randomItem(PHONES),
      },
    }
  })

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
      amenities: JSON.stringify(p.amenities),
      status: p.status,
      cover_tone: p.coverTone,
      cover_image: p.coverImage,
      images: JSON.stringify(p.images),
      coordinates: JSON.stringify(p.coordinates),
      map_point: JSON.stringify(p.mapPoint),
      contact_info: p.contact_info ? JSON.stringify(p.contact_info) : null,
      created_at: new Date().toISOString(),
    }

    const cols = Object.keys(vals).join(', ')
    const valsStr = Object.values(vals).map(v =>
      v === null ? 'NULL'
      : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'`
      : v
    ).join(', ')

    return `INSERT INTO properties (${cols}) VALUES (${valsStr});`
  })

  const sql = `-- Seed properties for Cubitat (synthetic test data)
-- Generated ${new Date().toISOString()}
-- WARNING: Test data only, not for production use

${inserts.join('\n')}
`

  const jsonPath = 'scripts/seed-synthetic-data.json'
  const sqlPath = 'scripts/seed-synthetic.sql'

  writeFileSync(jsonPath, JSON.stringify(properties, null, 2))
  writeFileSync(sqlPath, sql)

  console.log(`Generated ${properties.length} test properties`)
  console.log(`  ${jsonPath}`)
  console.log(`  ${sqlPath}`)
  console.log(`\nTo import into Supabase, run the SQL in the Supabase SQL editor.`)
}

main()
