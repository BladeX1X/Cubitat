export const OPERATION_VALUES = ['venta', 'alquiler', 'permuta'] as const
export const PROPERTY_TYPE_VALUES = ['casa', 'apartamento', 'terreno'] as const

export type CanonicalOperation = (typeof OPERATION_VALUES)[number]
export type CanonicalPropertyType = (typeof PROPERTY_TYPE_VALUES)[number]

export const operationLabels: Record<
  CanonicalOperation,
  { publish: string; search: string; filter: string }
> = {
  venta: { publish: 'Venta', search: 'Comprar', filter: 'Venta' },
  alquiler: { publish: 'Renta / Alquiler', search: 'Rentar', filter: 'Renta' },
  permuta: { publish: 'Permuta', search: 'Permuta', filter: 'Permuta' },
}

export const propertyTypeLabels: Record<
  CanonicalPropertyType,
  { publish: string; search: string }
> = {
  casa: { publish: 'Casa', search: 'Casas' },
  apartamento: { publish: 'Departamento', search: 'Departamentos' },
  terreno: { publish: 'Terreno', search: 'Terrenos' },
}
