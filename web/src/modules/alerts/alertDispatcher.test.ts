import { describe, expect, it, vi } from 'vitest'
import {
  matchPropertyWithAlerts,
  dispatchSearchAlertNotifications,
  type SavedSearchAlert,
} from './alertDispatcher'
import type { Property } from '../properties/types'

const mockProperty: Property = {
  id: 'prop-101',
  title: 'Hermosa Casa con Jardín en Playa',
  location: 'Playa, La Habana',
  description: 'Casa amplia de 3 habitaciones y 2 baños',
  zoneId: 'playa',
  operation: 'venta',
  propertyType: 'casa',
  priceUsd: 45000,
  bedrooms: 3,
  bathrooms: 2,
  parking: 1,
  areaM2: 120,
  amenities: ['jardin', 'garaje'],
  status: 'published',
  coverTone: '#ffffff',
  coverImage: 'https://example.com/casa.jpg',
  mapPoint: { x: 10, y: 20 },
  coordinates: { latitude: 23.12, longitude: -82.43 },
}

const mockAlerts: SavedSearchAlert[] = [
  {
    id: 'alert-1',
    user_id: 'user-1',
    email: 'user1@example.com',
    label: 'Casas en Venta en Playa',
    operation: 'venta',
    property_type: 'casa',
    zoneId: 'playa',
    price_range: '30000-50000',
    is_active: true,
  },
  {
    id: 'alert-2',
    user_id: 'user-2',
    email: 'user2@example.com',
    label: 'Apartamentos en Alquiler',
    operation: 'alquiler',
    property_type: 'apartamento',
    zoneId: 'vedado',
    price_range: '200-800',
    is_active: true,
  },
  {
    id: 'alert-3',
    user_id: 'user-3',
    email: 'user3@example.com',
    label: 'Casas caras en Playa',
    operation: 'venta',
    property_type: 'casa',
    zoneId: 'playa',
    price_range: '60000-100000',
    is_active: true,
  },
  {
    id: 'alert-4',
    user_id: 'user-4',
    email: 'user4@example.com',
    label: 'Alerta inactiva',
    operation: 'venta',
    property_type: 'casa',
    zoneId: 'playa',
    price_range: '30000-50000',
    is_active: false,
  },
]

describe('alertDispatcher', () => {
  describe('matchPropertyWithAlerts', () => {
    it('returns alerts that match zone, operation, property type, and price range', () => {
      const matches = matchPropertyWithAlerts(mockProperty, mockAlerts)
      expect(matches).toHaveLength(1)
      expect(matches[0].id).toBe('alert-1')
    })

    it('ignores inactive alerts', () => {
      const inactiveOnlyAlerts: SavedSearchAlert[] = [
        {
          id: 'alert-inactive',
          email: 'test@example.com',
          operation: 'venta',
          property_type: 'casa',
          zoneId: 'playa',
          is_active: false,
        },
      ]

      const matches = matchPropertyWithAlerts(mockProperty, inactiveOnlyAlerts)
      expect(matches).toHaveLength(0)
    })

    it('matches wildcard/all filters correctly', () => {
      const wildcardAlert: SavedSearchAlert = {
        id: 'alert-wildcard',
        email: 'all@example.com',
        operation: 'all',
        property_type: 'all',
        zoneId: 'all',
        price_range: 'all',
        is_active: true,
      }

      const matches = matchPropertyWithAlerts(mockProperty, [wildcardAlert])
      expect(matches).toHaveLength(1)
      expect(matches[0].id).toBe('alert-wildcard')
    })

    it('filters out properties outside price range', () => {
      const expensiveProperty: Property = {
        ...mockProperty,
        priceUsd: 150000,
      }

      const matches = matchPropertyWithAlerts(expensiveProperty, mockAlerts)
      expect(matches).toHaveLength(0)
    })

    it('matches query string against property title and location', () => {
      const queryAlert: SavedSearchAlert = {
        id: 'alert-query',
        email: 'query@example.com',
        query: 'Jardín',
        is_active: true,
      }

      const matches = matchPropertyWithAlerts(mockProperty, [queryAlert])
      expect(matches).toHaveLength(1)
      expect(matches[0].id).toBe('alert-query')
    })
  })

  describe('dispatchSearchAlertNotifications', () => {
    it('dispatches emails via Resend API to matching alert subscribers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_12345' }),
      })

      const summary = await dispatchSearchAlertNotifications(mockProperty, mockAlerts, {
        resendApiKey: 're_test_key_123',
        fetchFn: mockFetch as any,
      })

      expect(summary.matchedAlerts).toHaveLength(1)
      expect(summary.dispatchedCount).toBe(1)
      expect(summary.results[0].success).toBe(true)
      expect(summary.results[0].email).toBe('user1@example.com')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer re_test_key_123',
          }),
        }),
      )
    })

    it('handles missing Resend API key gracefully', async () => {
      const summary = await dispatchSearchAlertNotifications(mockProperty, mockAlerts, {
        resendApiKey: '',
      })

      expect(summary.matchedAlerts).toHaveLength(1)
      expect(summary.dispatchedCount).toBe(0)
      expect(summary.results[0].success).toBe(false)
      expect(summary.results[0].error).toContain('Missing Resend API key')
    })

    it('handles Resend API errors gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })

      const summary = await dispatchSearchAlertNotifications(mockProperty, mockAlerts, {
        resendApiKey: 'invalid_key',
        fetchFn: mockFetch as any,
      })

      expect(summary.dispatchedCount).toBe(0)
      expect(summary.results[0].success).toBe(false)
      expect(summary.results[0].error).toContain('Resend API error (401)')
    })
  })
})
