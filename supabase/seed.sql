-- Seed data: Olle's organization + sample projects
-- Run AFTER migration.sql and AFTER creating admin user in Supabase Auth

-- 1. Create Olle's organization
insert into public.organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Ollen Rakennus Oy');

-- 2. After creating admin user in Supabase Auth dashboard,
--    update their profile:
-- update public.profiles
-- set role = 'admin', full_name = 'Olle'
-- where email = 'olle@example.com';

-- 3. Sample projects (uncomment after org + admin exist)
/*
insert into public.projects (organization_id, name, code, client, address, total_budget, start_date, end_date, status) values
  ('00000000-0000-0000-0000-000000000001', 'Kalasatama As Oy', 'KAL-001', 'As Oy Kalasataman Helmi', 'Kalasatamankatu 12, Helsinki', 450000, '2026-01-15', '2026-06-30', 'käynnissä'),
  ('00000000-0000-0000-0000-000000000001', 'Töölö Julkisivuremontti', 'TÖÖ-002', 'As Oy Töölön Tähti', 'Runeberginkatu 45, Helsinki', 280000, '2026-02-01', '2026-05-15', 'käynnissä'),
  ('00000000-0000-0000-0000-000000000001', 'Espoo Rivitalo', 'ESP-003', 'Espoon Asunnot Oy', 'Leppävaarankatu 8, Espoo', 180000, '2026-03-01', null, 'suunnittelu');
*/
