import { describe, expect, it } from 'vitest'
import adminPageSource from './AdminPage.tsx?raw'
import propertiesModuleSource from '../../modules/admin/properties/PropertiesTab.tsx?raw'
import reportsModuleSource from '../../modules/admin/reports/ReportsTab.tsx?raw'
import metricsModuleSource from '../../modules/admin/metrics/MetricsTab.tsx?raw'
import advertiserContextSource from '../../modules/admin/advertiser-context/AdvertiserContextPanel.tsx?raw'
import propertyDetailsSource from '../../modules/admin/properties/PropertyDetails.tsx?raw'

describe('AdminPage modular architecture', () => {
  it('keeps the page as a small shell without direct Supabase access', () => {
    expect(adminPageSource.split(/\r?\n/).length).toBeLessThanOrEqual(200)
    expect(adminPageSource).not.toContain('supabase.')
    expect(adminPageSource).toContain('PropertiesTab')
    expect(adminPageSource).toContain('ReportsTab')
    expect(adminPageSource).toContain('MetricsTab')
  })

  it('keeps each existing feature in its own module', () => {
    expect(propertiesModuleSource).toContain('export function PropertiesTab')
    expect(reportsModuleSource).toContain('export function ReportsTab')
    expect(metricsModuleSource).toContain('export function MetricsTab')
  })

  it('integrates advertiser context through an independent module contract', () => {
    expect(advertiserContextSource).toContain('export function AdvertiserContextPanel')
    expect(advertiserContextSource).not.toContain('../properties')
    expect(propertyDetailsSource).toContain('<AdvertiserContextPanel userId={property.user_id}')
    expect(propertyDetailsSource).not.toContain('supabase.')
  })
})
