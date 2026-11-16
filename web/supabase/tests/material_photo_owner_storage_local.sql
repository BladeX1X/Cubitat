\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users(id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES
  ('f1091200-0000-0000-0000-000000000012', 'authenticated', 'authenticated',
    'material-photo-owner@local.invalid', '{"full_name":"Material QA owner"}', now(), now()),
  ('f1091200-0000-0000-0000-000000000013', 'authenticated', 'authenticated',
    'material-photo-other@local.invalid', '{"full_name":"Material QA other"}', now(), now());

INSERT INTO public.material_listings(id, owner_id, slug, title, category, description, province, status)
VALUES
  ('f1091200-0000-0000-0000-000000000014', 'f1091200-0000-0000-0000-000000000012',
    'qa-owner-photo-active', 'Material activo QA', 'cemento',
    'Anuncio sintético para validar el acceso del dueño a sus fotos privadas.', 'La Habana', 'pending_review'),
  ('f1091200-0000-0000-0000-000000000015', 'f1091200-0000-0000-0000-000000000012',
    'qa-owner-photo-archived', 'Material archivado QA', 'cemento',
    'Anuncio archivado sintético para validar el rechazo seguro de cargas.', 'La Habana', 'archived');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"f1091200-0000-0000-0000-000000000012","role":"authenticated"}', true);

INSERT INTO storage.objects(bucket_id, name, owner, metadata)
VALUES (
  'material-listings',
  'f1091200-0000-0000-0000-000000000012/f1091200-0000-0000-0000-000000000014/f1091200-0000-0000-0000-000000000016.webp',
  'f1091200-0000-0000-0000-000000000012',
  '{"mimetype":"image/webp","size":100}'::jsonb
);

DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects
      WHERE bucket_id = 'material-listings'
        AND name = 'f1091200-0000-0000-0000-000000000012/f1091200-0000-0000-0000-000000000014/f1091200-0000-0000-0000-000000000016.webp') <> 1 THEN
    RAISE EXCEPTION 'owner_cannot_read_own_material_photo';
  END IF;
END $$;

DO $$ BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"f1091200-0000-0000-0000-000000000013","role":"authenticated"}', true);
  BEGIN
    INSERT INTO storage.objects(bucket_id, name, owner, metadata)
    VALUES (
      'material-listings',
      'f1091200-0000-0000-0000-000000000012/f1091200-0000-0000-0000-000000000014/f1091200-0000-0000-0000-000000000017.webp',
      'f1091200-0000-0000-0000-000000000012',
      '{"mimetype":"image/webp","size":100}'::jsonb
    );
    RAISE EXCEPTION 'different_account_uploaded_owner_photo';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  PERFORM set_config('request.jwt.claims',
    '{"sub":"f1091200-0000-0000-0000-000000000012","role":"authenticated"}', true);
END $$;

DO $$ BEGIN
  BEGIN
    INSERT INTO storage.objects(bucket_id, name, owner, metadata)
    VALUES (
      'material-listings',
      'f1091200-0000-0000-0000-000000000012/f1091200-0000-0000-0000-000000000015/f1091200-0000-0000-0000-000000000018.webp',
      'f1091200-0000-0000-0000-000000000012',
      '{"mimetype":"image/webp","size":100}'::jsonb
    );
    RAISE EXCEPTION 'owner_uploaded_to_archived_listing';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

RESET ROLE;
UPDATE public.material_listings
SET status = 'published',
    photo_urls = ARRAY['f1091200-0000-0000-0000-000000000012/f1091200-0000-0000-0000-000000000014/f1091200-0000-0000-0000-000000000016.webp']
WHERE id = 'f1091200-0000-0000-0000-000000000014';

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects
      WHERE bucket_id = 'material-listings'
        AND name = 'f1091200-0000-0000-0000-000000000012/f1091200-0000-0000-0000-000000000014/f1091200-0000-0000-0000-000000000016.webp') <> 1 THEN
    RAISE EXCEPTION 'published_material_photo_not_publicly_readable';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"f1091200-0000-0000-0000-000000000012","role":"authenticated"}', true);
DO $$ BEGIN
  IF public.owns_unreferenced_material_photo(
    'f1091200-0000-0000-0000-000000000014',
    'f1091200-0000-0000-0000-000000000012/f1091200-0000-0000-0000-000000000014/f1091200-0000-0000-0000-000000000016.webp'
  ) THEN RAISE EXCEPTION 'referenced_material_photo_marked_deletable'; END IF;
  IF public.owns_unreferenced_material_photo(
    'f1091200-0000-0000-0000-000000000014',
    'f1091200-0000-0000-0000-000000000012/f1091200-0000-0000-0000-000000000014/f1091200-0000-0000-0000-000000000019.webp'
  ) IS NOT TRUE THEN RAISE EXCEPTION 'owner_cannot_delete_unreferenced_material_photo'; END IF;
  IF public.owns_unreferenced_material_photo(
    'f1091200-0000-0000-0000-000000000015',
    'f1091200-0000-0000-0000-000000000012/f1091200-0000-0000-0000-000000000015/f1091200-0000-0000-0000-000000000019.webp'
  ) IS NOT TRUE THEN RAISE EXCEPTION 'owner_cannot_delete_archived_listing_photo'; END IF;
END $$;

RESET ROLE;
ROLLBACK;
