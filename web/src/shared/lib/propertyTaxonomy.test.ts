import { describe, expect, it } from 'vitest'
import {
  OPERATION_VALUES,
  PROPERTY_TYPE_VALUES,
  operationLabels,
  propertyTypeLabels,
} from './propertyTaxonomy'

describe('property taxonomy shared by search and publication', () => {
  it('defines the canonical operations in publication order', () => {
    expect(OPERATION_VALUES).toEqual(['venta', 'alquiler', 'permuta'])
    expect(OPERATION_VALUES.map((value) => operationLabels[value].publish)).toEqual([
      'Venta',
      'Renta / Alquiler',
      'Permuta',
    ])
  })

  it('defines the canonical property types with search and publication labels', () => {
    expect(PROPERTY_TYPE_VALUES).toEqual(['casa', 'apartamento', 'terreno'])
    expect(PROPERTY_TYPE_VALUES.map((value) => propertyTypeLabels[value].publish)).toEqual([
      'Casa',
      'Departamento',
      'Terreno',
    ])
    expect(PROPERTY_TYPE_VALUES.map((value) => propertyTypeLabels[value].search)).toEqual([
      'Casas',
      'Departamentos',
      'Terrenos',
    ])
  })
})
