-- =============================================================
-- Raksa App — Realistic Demo Seed Data
-- =============================================================
-- Run in Supabase SQL Editor (as postgres superuser, bypasses RLS)
--
-- Prerequisites:
--   1. migration.sql has been run (tables exist)
--   2. Organization '00000000-0000-0000-0000-000000000001' exists
--   3. Kristian's admin user exists in auth.users + profiles
--
-- IMPORTANT: Before running, replace ADMIN_USER_ID below with
-- the actual UUID from: SELECT id FROM auth.users LIMIT 1;
-- =============================================================

-- ========================
-- 0. Configuration
-- ========================
-- Set these to match your actual admin user
DO $$
DECLARE
  admin_id uuid;
  -- Workaround: Supabase SQL Editor mangles ä on paste.
  -- Proper UTF-8 status_active = 6bc3a4796e6e697373c3a4
  -- Use corrupted encoding that matches what's in the DB enum
  status_active text := convert_from(decode('6be2949cc3b1796e6e697373e2949cc3b1', 'hex'), 'UTF8');
  worker_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeee01';
  org_id uuid := '00000000-0000-0000-0000-000000000001';

  -- Project IDs (fixed for referencing)
  proj_kal uuid := '11111111-1111-1111-1111-111111111001';
  proj_too uuid := '11111111-1111-1111-1111-111111111002';
  proj_esp uuid := '11111111-1111-1111-1111-111111111003';

  -- Budget category IDs for Kalasatama
  kal_mat uuid := '22222222-2222-2222-2222-222222220101';
  kal_tyo uuid := '22222222-2222-2222-2222-222222220102';
  kal_lvi uuid := '22222222-2222-2222-2222-222222220103';
  kal_ali uuid := '22222222-2222-2222-2222-222222220104';
  kal_kon uuid := '22222222-2222-2222-2222-222222220105';
  kal_suu uuid := '22222222-2222-2222-2222-222222220106';

  -- Budget category IDs for Töölö
  too_mat uuid := '22222222-2222-2222-2222-222222220201';
  too_tyo uuid := '22222222-2222-2222-2222-222222220202';
  too_lvi uuid := '22222222-2222-2222-2222-222222220203';
  too_ali uuid := '22222222-2222-2222-2222-222222220204';
  too_kon uuid := '22222222-2222-2222-2222-222222220205';
  too_suu uuid := '22222222-2222-2222-2222-222222220206';

  -- Budget category IDs for Espoo
  esp_mat uuid := '22222222-2222-2222-2222-222222220301';
  esp_tyo uuid := '22222222-2222-2222-2222-222222220302';
  esp_lvi uuid := '22222222-2222-2222-2222-222222220303';
  esp_ali uuid := '22222222-2222-2222-2222-222222220304';
  esp_kon uuid := '22222222-2222-2222-2222-222222220305';
  esp_suu uuid := '22222222-2222-2222-2222-222222220306';

BEGIN
  -- Get admin user ID dynamically
  SELECT id INTO admin_id FROM auth.users LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found in auth.users. Create a user first.';
  END IF;

  RAISE NOTICE 'Using admin_id: %', admin_id;

  -- ========================
  -- 1. Create worker user
  -- ========================
  -- Insert into auth.users (minimal fields for Supabase)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, aud, role
  ) VALUES (
    worker_id,
    '00000000-0000-0000-0000-000000000000',
    'mikko.virtanen@raksa-demo.fi',
    crypt('demo-worker-2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', 'Mikko Virtanen',
      'organization_id', org_id,
      'role', 'worker'
    ),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (id) DO NOTHING;

  -- Profile (trigger may create this, but ensure it exists)
  INSERT INTO public.profiles (id, organization_id, email, full_name, role, hourly_rate, phone)
  VALUES (
    worker_id, org_id, 'mikko.virtanen@raksa-demo.fi',
    'Mikko Virtanen', 'worker', 42.00, '+358 40 555 1234'
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    hourly_rate = EXCLUDED.hourly_rate;

  -- Also ensure admin profile has hourly rate
  UPDATE public.profiles
  SET hourly_rate = COALESCE(hourly_rate, 65.00)
  WHERE id = admin_id;

  -- ========================
  -- 2. Insert 3 projects
  -- ========================
  -- Delete existing demo projects if re-running
  DELETE FROM public.projects WHERE id IN (proj_kal, proj_too, proj_esp);

  INSERT INTO public.projects
    (id, organization_id, name, code, client, address, total_budget, start_date, end_date, status, description)
  VALUES
    -- Kalasatama: active, ~75% budget → green health
    (proj_kal, org_id,
     'Kalasatama As Oy linjasaneeraus', 'KAL-001',
     'As Oy Kalasataman Helmi', 'Kalasatamankatu 12, 00540 Helsinki',
     450000.00, '2026-01-15', '2026-06-30', status_active::project_status,
     'Linjasaneeraus 48 asuntoa. Viemärit, vesijohto, sähkönousu. Vaiheittainen toteutus A-C portaat.'),

    -- Töölö: active, ~90% budget → yellow/red warning
    (proj_too, org_id,
     'Töölö julkisivuremontti', 'TÖÖ-002',
     'As Oy Töölön Tähti', 'Runeberginkatu 45, 00260 Helsinki',
     280000.00, '2026-02-01', '2026-05-15', status_active::project_status,
     'Julkisivun peruskorjaus, rappaus ja maalaus. Parvekekaiteet ja ikkunapellit. Telinetyöt.'),

    -- Espoo: planning phase, 0% used
    (proj_esp, org_id,
     'Espoo rivitalojen peruskorjaus', 'ESP-003',
     'Espoon Asunnot Oy', 'Leppävaarankatu 8, 02600 Espoo',
     180000.00, '2026-04-01', null, 'suunnittelu',
     'Rivitalot 3 kpl peruskorjaus. Katto, julkisivu, pihatyöt. Aloitus huhtikuu 2026.');


  -- ========================
  -- 3. Budget categories
  -- ========================
  -- Kalasatama (total_budget = 450,000)
  INSERT INTO public.budget_categories (id, project_id, name, budgeted_amount, sort_order) VALUES
    (kal_mat, proj_kal, 'Materiaalit',        120000.00, 1),
    (kal_tyo, proj_kal, 'Työvoima',           135000.00, 2),
    (kal_lvi, proj_kal, 'LVIS',                85000.00, 3),
    (kal_ali, proj_kal, 'Aliurakointi',         60000.00, 4),
    (kal_kon, proj_kal, 'Koneet ja kalusto',    30000.00, 5),
    (kal_suu, proj_kal, 'Suunnittelu',          20000.00, 6);

  -- Töölö (total_budget = 280,000)
  INSERT INTO public.budget_categories (id, project_id, name, budgeted_amount, sort_order) VALUES
    (too_mat, proj_too, 'Materiaalit',         80000.00, 1),
    (too_tyo, proj_too, 'Työvoima',            90000.00, 2),
    (too_lvi, proj_too, 'LVIS',                25000.00, 3),
    (too_ali, proj_too, 'Aliurakointi',         50000.00, 4),
    (too_kon, proj_too, 'Koneet ja kalusto',    20000.00, 5),
    (too_suu, proj_too, 'Suunnittelu',          15000.00, 6);

  -- Espoo (total_budget = 180,000)
  INSERT INTO public.budget_categories (id, project_id, name, budgeted_amount, sort_order) VALUES
    (esp_mat, proj_esp, 'Materiaalit',         55000.00, 1),
    (esp_tyo, proj_esp, 'Työvoima',            50000.00, 2),
    (esp_lvi, proj_esp, 'LVIS',                25000.00, 3),
    (esp_ali, proj_esp, 'Aliurakointi',         25000.00, 4),
    (esp_kon, proj_esp, 'Koneet ja kalusto',    15000.00, 5),
    (esp_suu, proj_esp, 'Suunnittelu',          10000.00, 6);


  -- ========================
  -- 4. Cost entries
  -- ========================
  -- TARGET: Kalasatama ~75% of 450k = ~337,500 spent
  -- TARGET: Töölö ~90% of 280k = ~252,000 spent
  -- Espoo: 0 costs (planning)

  -- === KALASATAMA COSTS (target ~337,500 total with VAT) ===
  INSERT INTO public.costs
    (project_id, budget_category_id, description, amount, vat_percent, amount_with_vat, vendor, invoice_date, status, created_by)
  VALUES
    -- Materiaalit (~90k with VAT → ~71.7k without)
    (proj_kal, kal_mat, 'Kupariputket ja liittimet, erä 1-3', 28500.00, 25.5, 35767.50, 'Onninen Oy', '2026-01-28', 'approved', admin_id),
    (proj_kal, kal_mat, 'Muoviviemärit DN110-DN50, kaikki portaat', 18200.00, 25.5, 22841.00, 'Dahl / Kesko', '2026-02-10', 'approved', admin_id),
    (proj_kal, kal_mat, 'Laatat, vedeneristys, tasoitteet (märkätilat)', 22000.00, 25.5, 27610.00, 'Stark Suomi Oy', '2026-02-24', 'approved', admin_id),

    -- Työvoima (~100k with VAT)
    (proj_kal, kal_tyo, 'Purkutyöt A-porras, tammikuu', 32000.00, 25.5, 40160.00, NULL, '2026-01-31', 'approved', admin_id),
    (proj_kal, kal_tyo, 'Putkiasennus A-porras + B-porras alku', 28000.00, 25.5, 35140.00, NULL, '2026-02-28', 'approved', admin_id),
    (proj_kal, kal_tyo, 'Sähkötyöt nousujohdot A-B', 18500.00, 25.5, 23207.50, 'Sähkö-Mikko Oy', '2026-03-05', 'approved', admin_id),

    -- LVIS (~62k with VAT)
    (proj_kal, kal_lvi, 'Ilmanvaihtokoneet 3 kpl (A-C portaat)', 24000.00, 25.5, 30120.00, 'Fläkt Group Oy', '2026-02-15', 'approved', admin_id),
    (proj_kal, kal_lvi, 'Sähkökeskukset ja nousukiskot', 25000.00, 25.5, 31375.00, 'ABB Oy', '2026-02-20', 'approved', admin_id),

    -- Aliurakointi (~42k with VAT)
    (proj_kal, kal_ali, 'Asbestipurku, kaikki portaat', 33500.00, 25.5, 42042.50, 'Delete Finland Oy', '2026-01-20', 'approved', admin_id),

    -- Koneet (~18k with VAT)
    (proj_kal, kal_kon, 'Nosturivuokra tammi-maalis', 8500.00, 25.5, 10667.50, 'Cramo Finland Oy', '2026-03-01', 'approved', admin_id),
    (proj_kal, kal_kon, 'Kurottaja + lavat, helmikuu', 5800.00, 25.5, 7279.00, 'Ramirent Oy', '2026-02-28', 'approved', admin_id),

    -- Suunnittelu (~16k with VAT)
    (proj_kal, kal_suu, 'LVI-suunnittelu, pääsuunnitelma', 9500.00, 25.5, 11922.50, 'Ramboll Finland Oy', '2026-01-10', 'approved', admin_id),
    (proj_kal, kal_suu, 'Sähkösuunnittelu', 3200.00, 25.5, 4016.00, 'Rejlers Finland Oy', '2026-01-12', 'approved', admin_id),

    -- Pending cost (recent)
    (proj_kal, kal_mat, 'Kaakelit, B-portaan märkätilat', 6800.00, 25.5, 8534.00, 'Laattapiste Oy', '2026-03-12', 'pending', admin_id);
  -- Kalasatama total ≈ 330,682 with VAT → ~73.5% of 450k ✓

  -- === TÖÖLÖ COSTS (target ~252,000 total with VAT) ===
  INSERT INTO public.costs
    (project_id, budget_category_id, description, amount, vat_percent, amount_with_vat, vendor, invoice_date, status, created_by)
  VALUES
    -- Materiaalit (~72k with VAT)
    (proj_too, too_mat, 'Rappauslaasti ja pohjatuotteet, 2400m²', 28000.00, 25.5, 35140.00, 'Weber Saint-Gobain', '2026-02-12', 'approved', admin_id),
    (proj_too, too_mat, 'Julkisivumaalit ja pohjusteet', 15500.00, 25.5, 19452.50, 'Tikkurila Oyj', '2026-02-18', 'approved', admin_id),
    (proj_too, too_mat, 'Parvekekaiteet, rst, 24 kpl', 14000.00, 25.5, 17570.00, 'Meconet Oy', '2026-03-01', 'approved', admin_id),

    -- Työvoima (~82k with VAT)
    (proj_too, too_tyo, 'Rappaustyöt, helmikuu', 26000.00, 25.5, 32630.00, NULL, '2026-02-28', 'approved', admin_id),
    (proj_too, too_tyo, 'Rappaustyöt + maalaus, maaliskuu', 24000.00, 25.5, 30120.00, NULL, '2026-03-10', 'approved', admin_id),
    (proj_too, too_tyo, 'Parveketyöt, kaiteet ja pellit', 15000.00, 25.5, 18825.00, NULL, '2026-03-08', 'approved', admin_id),

    -- Aliurakointi (~46k with VAT)
    (proj_too, too_ali, 'Telinetyöt, pystytys + purkuosa 1', 36500.00, 25.5, 45807.50, 'Telinekataja Oy', '2026-02-05', 'approved', admin_id),

    -- Koneet (~15k with VAT)
    (proj_too, too_kon, 'Henkilönostin 3kk vuokra', 6200.00, 25.5, 7781.00, 'Cramo Finland Oy', '2026-02-10', 'approved', admin_id),
    (proj_too, too_kon, 'Painepesuri + kompressori vuokra', 5500.00, 25.5, 6902.50, 'Ramirent Oy', '2026-02-08', 'approved', admin_id),

    -- Suunnittelu (~14k with VAT)
    (proj_too, too_suu, 'Julkisivukartoitus ja kuntotutkimus', 8500.00, 25.5, 10667.50, 'A-Insinöörit Oy', '2026-01-20', 'approved', admin_id),
    (proj_too, too_suu, 'Rakennesuunnittelu, korjaussuunnitelma', 3000.00, 25.5, 3765.00, 'Sweco Finland Oy', '2026-01-25', 'approved', admin_id),

    -- LVIS (~8k with VAT)
    (proj_too, too_lvi, 'Sadevesijärjestelmä, uusinta', 6500.00, 25.5, 8157.50, 'Putkiasennus Mäkelä Oy', '2026-03-05', 'approved', admin_id),

    -- Pending costs (budget pressure!)
    (proj_too, too_mat, 'Ikkunapellit, alumiini, 48 kpl', 9200.00, 25.5, 11546.00, 'Ruukki Construction', '2026-03-14', 'pending', admin_id),
    (proj_too, too_tyo, 'Lisätyöt: halkeamien injektointi', 5600.00, 25.5, 7028.00, NULL, '2026-03-13', 'pending', worker_id);
  -- Töölö total ≈ 255,392 with VAT → ~91.2% of 280k ✓ (yellow/red warning)


  -- ========================
  -- 5. Time entries
  -- ========================
  -- Past 2 weeks of work (early-mid March 2026)
  INSERT INTO public.time_entries
    (project_id, user_id, clock_in, clock_out, break_minutes, description, is_approved, approved_by)
  VALUES
    -- Kalasatama — Admin entries
    (proj_kal, admin_id,
     '2026-03-02 07:00+02', '2026-03-02 15:30+02', 30,
     'B-portaan purkutyöt, kerros 3', true, admin_id),
    (proj_kal, admin_id,
     '2026-03-04 07:00+02', '2026-03-04 16:00+02', 30,
     'Putkiasennuksen tarkastus ja aikataulupalaveri', true, admin_id),
    (proj_kal, admin_id,
     '2026-03-09 07:00+02', '2026-03-09 15:00+02', 30,
     'Sähkönousun tarkastus A-porras, vastaanotto', true, admin_id),

    -- Kalasatama — Worker entries
    (proj_kal, worker_id,
     '2026-03-02 07:00+02', '2026-03-02 15:30+02', 30,
     'Purkutyöt B-porras, kerrokset 3-4', true, admin_id),
    (proj_kal, worker_id,
     '2026-03-03 07:00+02', '2026-03-03 15:30+02', 30,
     'Putkien kannakointi B-porras', true, admin_id),
    (proj_kal, worker_id,
     '2026-03-04 07:00+02', '2026-03-04 15:30+02', 30,
     'Viemäriasennus B3-B4', true, admin_id),
    (proj_kal, worker_id,
     '2026-03-05 07:00+02', '2026-03-05 15:30+02', 30,
     'Vesijohtoasennus B3-B4', false, NULL),

    -- Töölö — Admin entries
    (proj_too, admin_id,
     '2026-03-03 07:30+02', '2026-03-03 16:00+02', 30,
     'Telineiden tarkastus, rappauksen aloituspalaveri', true, admin_id),
    (proj_too, admin_id,
     '2026-03-10 07:30+02', '2026-03-10 16:00+02', 30,
     'Maalaustyön valvonta, värisävy hyväksyntä', true, admin_id),

    -- Töölö — Worker entries
    (proj_too, worker_id,
     '2026-03-03 07:00+02', '2026-03-03 15:30+02', 30,
     'Vanhan rappauksen piikkaus, 2. kerros', true, admin_id),
    (proj_too, worker_id,
     '2026-03-05 07:00+02', '2026-03-05 15:30+02', 30,
     'Rappaustyöt 2. kerros itäpääty', true, admin_id),
    (proj_too, worker_id,
     '2026-03-10 07:00+02', '2026-03-10 16:00+02', 45,
     'Rappaus + pohjamaali 3. kerros', true, admin_id),
    (proj_too, worker_id,
     '2026-03-12 07:00+02', '2026-03-12 15:30+02', 30,
     'Parvekekaiteiden asennus, 1. kerros', false, NULL),

    -- Recent pending entries (this week)
    (proj_kal, worker_id,
     '2026-03-13 07:00+02', '2026-03-13 15:00+02', 30,
     'Laatoitus B3 kylpyhuoneet', false, NULL);


  -- ========================
  -- 6. Daily logs
  -- ========================
  INSERT INTO public.daily_logs
    (project_id, log_date, weather, temperature, workers_on_site, notes, created_by)
  VALUES
    -- Kalasatama logs
    (proj_kal, '2026-03-10', 'Pilvinen', -2.0, 8,
     'B-portaan putkiasennus etenee aikataulussa. Kerrokset 3-4 valmiit, aloitetaan kerros 5 huomenna. Yksi vuotokohta korjattu kellarikerroksessa. Materiaalitoimitus Onniselsta saapui klo 9.',
     admin_id),
    (proj_kal, '2026-03-12', 'Aurinkoinen', 1.5, 7,
     'Sähkönousun asennus A-portaassa valmis, tarkastus tilattu. B-portaan laatoitus aloitettu kerroksessa 3. Vedeneristys kuivunut, laatoittaja aloitti klo 10. Cramon nosturi palautetaan pe.',
     admin_id),
    (proj_kal, '2026-03-14', 'Lumisadetta', -4.0, 6,
     'Pakkanen hidasti ulkotöitä. Sisätyöt jatkuivat normaalisti. B5 viemäriasennus valmis. C-portaan purkutyöt alkavat ensi viikolla. Aliurakoitsija Delete vahvistanut aikataulun.',
     admin_id),

    -- Töölö logs
    (proj_too, '2026-03-10', 'Puolipilvinen', 0.0, 5,
     'Rappaustyöt 3. kerroksessa, itäpääty. Lämpötila rajalla rappaukselle, seurataan. Telinekatajan nostin huollettu aamulla, 1h seisokki. Värisävyn hyväksyntä isännöitsijältä saatu.',
     admin_id),
    (proj_too, '2026-03-13', 'Sateinen', 2.0, 4,
     'Sade keskeytti ulkorappauksen klo 11. Siirryttiin sisätöihin: parvekekaiteiden asennus 1. krs. Budjetti tiukilla — lisätyötarve halkeamien injektoinnissa (yllätys kuntotutkimuksessa). Ilmoitettu tilaajalle.',
     admin_id);


  RAISE NOTICE 'Demo seed complete!';
  RAISE NOTICE 'Projects: 3 (Kalasatama, Töölö, Espoo)';
  RAISE NOTICE 'Budget categories: 18 (6 per project)';
  RAISE NOTICE 'Cost entries: 28 (14 Kalasatama + 14 Töölö)';
  RAISE NOTICE 'Time entries: 15';
  RAISE NOTICE 'Daily logs: 5';
  RAISE NOTICE 'Worker user: Mikko Virtanen (mikko.virtanen@raksa-demo.fi)';
END $$;
