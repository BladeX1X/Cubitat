-- Preserve complete legacy addresses privately; expose only catalogued areas.
-- Catalogue snapshot: src/shared/data/cubaLocations.ts. No remote execution here.
BEGIN;

CREATE TABLE public.property_private_addresses (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED,
  location text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_private_addresses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_private_addresses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.property_private_addresses TO authenticated;
GRANT ALL ON public.property_private_addresses TO service_role;
CREATE POLICY "Owners read their private property address"
ON public.property_private_addresses FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.properties p
  WHERE p.id = property_id AND p.user_id = (SELECT auth.uid())
));

CREATE FUNCTION public.public_property_location(raw_location text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE
  catalogue jsonb := '{"La Habana":["Playa","Plaza de la Revolución","Centro Habana","La Habana Vieja","Regla","La Habana del Este","Guanabacoa","San Miguel del Padrón","Diez de Octubre","Cerro","Marianao","La Lisa","Boyeros","Arroyo Naranjo","Cotorro"],"Matanzas":["Matanzas","Cárdenas","Colón","Jovellanos","Jagüey Grande","Calimete","Ciénaga de Zapata","Limonar","Los Arabos","Martí","Pedro Betancourt","Perico","Unión de Reyes"],"Santiago de Cuba":["Santiago de Cuba","Contramaestre","Guamá","Mella","Palma Soriano","San Luis","Segundo Frente","Songo - La Maya","Tercer Frente"],"Pinar del Río":["Pinar del Río","Consolación del Sur","Guane","La Palma","Los Palacios","Mantua","Minas de Matahambre","San Juan y Martínez","San Luis","Sandino","Viñales"],"Artemisa":["Artemisa","Alquízar","Bahía Honda","Bauta","Caimito","Candelaria","Guanajay","Güira de Melena","Mariel","San Antonio de los Baños","San Cristóbal"],"Mayabeque":["San José de las Lajas","Batabanó","Bejucal","Güines","Jaruco","Madruga","Melena del Sur","Nueva Paz","Quivicán","San Nicolás","Santa Cruz del Norte"],"Villa Clara":["Santa Clara","Caibarién","Camajuaní","Cifuentes","Corralillo","Encrucijada","Manicaragua","Placetas","Quemado de Güines","Ranchuelo","Remedios","Sagua la Grande","Santo Domingo"],"Cienfuegos":["Cienfuegos","Abreus","Aguada de Pasajeros","Cruces","Cumanayagua","Lajas","Palmira","Rodas"],"Sancti Spíritus":["Sancti Spíritus","Cabaiguán","Fomento","Jatibonico","La Sierpe","Taguasco","Trinidad","Yaguajay"],"Ciego de Ávila":["Ciego de Ávila","Baraguá","Bolivia","Chambas","Ciro Redondo","Florencia","Majagua","Morón","Primero de Enero","Venezuela"],"Camagüey":["Camagüey","Carlos Manuel de Céspedes","Esmeralda","Florida","Guáimaro","Jimaguayú","Minas","Najasa","Nuevitas","Santa Cruz del Sur","Sibanicú","Sierra de Cubitas","Vertientes"],"Las Tunas":["Las Tunas","Amancio","Colombia","Jesús Menéndez","Jobabo","Majibacoa","Manatí","Puerto Padre"],"Granma":["Bayamo","Bartolomé Masó","Buey Arriba","Campechuela","Cauto Cristo","Guisa","Jiguaní","Manzanillo","Media Luna","Niquero","Pilón","Río Cauto","Yara"],"Holguín":["Holguín","Antilla","Báguano","Banes","Cacocum","Calixto García","Cueto","Frank País","Gibara","Mayarí","Moa","Rafael Freyre","Sagua de Tánamo","Urbano Noris"],"Guantánamo":["Guantánamo","Baracoa","Caimanera","El Salvador","Imías","Maisí","Manuel Tames","Niceto Pérez","San Antonio del Sur","Yateras"],"Isla de la Juventud":["Isla de la Juventud"]}'::jsonb;
  parts text[] := regexp_split_to_array(coalesce(raw_location, ''), '\s*,\s*');
  province text;
  municipality text;
  suffix text;
BEGIN
  suffix := lower(translate(trim(parts[array_length(parts, 1)]), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'));
  SELECT key INTO province FROM jsonb_each(catalogue)
  WHERE lower(translate(key, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = suffix;
  IF province IS NULL THEN RETURN 'Cuba'; END IF;
  suffix := lower(translate(trim(parts[array_length(parts, 1) - 1]), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'));
  SELECT value INTO municipality FROM jsonb_array_elements_text(catalogue -> province)
  WHERE lower(translate(value, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')) = suffix;
  RETURN CASE WHEN municipality IS NULL THEN province ELSE municipality || ', ' || province END;
END;
$$;
REVOKE ALL ON FUNCTION public.public_property_location(text) FROM PUBLIC;

-- Back up before changing any public text. Unknown formats remain intact privately.
INSERT INTO public.property_private_addresses(property_id, location)
SELECT id, location FROM public.properties;
UPDATE public.properties SET location = public.public_property_location(location);

CREATE FUNCTION public.protect_property_address()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  -- Updates unrelated to the address, including old clients echoing the public
  -- area, must never replace the owner's full address with its redacted version.
  IF TG_OP = 'UPDATE' AND NEW.location IS NOT DISTINCT FROM OLD.location THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.property_private_addresses(property_id, location)
  VALUES (NEW.id, NEW.location)
  ON CONFLICT (property_id) DO UPDATE SET location = EXCLUDED.location, updated_at = now();
  NEW.location := public.public_property_location(NEW.location);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_property_address() FROM PUBLIC;
CREATE TRIGGER protect_property_address
BEFORE INSERT OR UPDATE OF location ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.protect_property_address();

COMMENT ON TABLE public.property_private_addresses IS
  'Owner-only original address. Public properties.location is a catalogued area. Written atomically by trigger.';
COMMIT;
