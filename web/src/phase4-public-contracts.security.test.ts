import { describe, expect, it } from 'vitest'
import contactSql from '../supabase/migrations/20261105170000_phase4_private_marketplace_contact.sql?raw'
import valuationSql from '../supabase/migrations/20261105180000_phase4_valuation.sql?raw'
import currencySql from '../supabase/migrations/20261116140000_property_price_currency.sql?raw'

describe('Fase 4 production privacy contracts', () => {
  it('does not grant browser roles access to seller contact columns', () => {
    expect(contactSql).toMatch(/REVOKE SELECT ON TABLE public\.home_service_providers FROM PUBLIC, anon, authenticated/i)
    expect(contactSql).toMatch(/GRANT SELECT \(id, slug, display_name[\s\S]*TO anon, authenticated/i)
    expect(contactSql).toMatch(/REVOKE SELECT ON TABLE public\.material_listings FROM PUBLIC, anon, authenticated/i)
    expect(contactSql).toMatch(/GRANT SELECT \(id, slug, title[\s\S]*TO anon, authenticated/i)
    expect(contactSql).not.toMatch(/GRANT SELECT \([^)]*(?:phone|whatsapp)[^)]*\) ON public\.(?:home_service_providers|material_listings)/i)
    expect(contactSql).toMatch(/REVOKE ALL ON FUNCTION public\.get_public_marketplace_contact\(text, uuid\)[\s\S]*FROM PUBLIC, anon, authenticated/i)
    expect(contactSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_public_marketplace_contact\(text, uuid\)[\s\S]*TO service_role/i)
    expect(contactSql).toMatch(/provider\.status = 'published'/i)
    expect(contactSql).toMatch(/listing\.status = 'published'[\s\S]*listing\.availability <> 'out_of_stock'/i)
  })

  it('returns only a minimum-size sample of published listings to signed-in users', () => {
    expect(valuationSql).toMatch(/FUNCTION public\.get_property_value_comparables/i)
    expect(valuationSql).toMatch(/SECURITY DEFINER[\s\S]*SET search_path = pg_catalog/i)
    expect(valuationSql).toMatch(/\(SELECT auth\.uid\(\)\) IS NULL/i)
    expect(valuationSql).toMatch(/property\.status = 'published'/i)
    expect(valuationSql).toMatch(/IF v_count < 5 THEN[\s\S]*RETURN;/i)
    expect(valuationSql).toMatch(/RETURNS TABLE \([\s\S]*comparable_id uuid,[\s\S]*area_m2 numeric,[\s\S]*price_usd numeric,[\s\S]*published_at timestamptz/i)
    expect(valuationSql).not.toMatch(/RETURNS TABLE \([^)]*(?:owner_id|phone|whatsapp|address)/i)
    expect(valuationSql).toMatch(/REVOKE ALL ON FUNCTION public\.get_property_value_comparables\(text, text, text, numeric\)[\s\S]*FROM PUBLIC, anon/i)
    expect(valuationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_property_value_comparables\(text, text, text, numeric\)[\s\S]*TO authenticated/i)
  })

  it('keeps valuation and legacy price alerts from treating CUP amounts as USD', () => {
    expect(currencySql).toMatch(/property\.price_currency = 'USD'/i)
    expect(currencySql).toMatch(/NEW\.price_currency <> 'USD'[\s\S]*matches_alert := false/i)
    expect(currencySql).toMatch(/GRANT INSERT \(price_currency\)[\s\S]*GRANT UPDATE \(price_currency\)/i)
  })
})
