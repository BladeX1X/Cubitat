UPDATE properties
SET contact_info = jsonb_build_object('name', 'Equipo Cubitat', 'phone', phone_seed.phone)
FROM (
  VALUES
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'::uuid, '+5355510101'),
    ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e'::uuid, '+5355510102'),
    ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f'::uuid, '+5355510103'),
    ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a'::uuid, '+5355510104'),
    ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b'::uuid, '+5355510105'),
    ('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c'::uuid, '+5355510106'),
    ('a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d'::uuid, '+5355510107'),
    ('b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e'::uuid, '+5355510108')
) AS phone_seed(id, phone)
WHERE properties.id = phone_seed.id
  AND COALESCE(properties.contact_info->>'phone', '') = '';
