-- Raksa: Construction Project Tracker
-- Run this in Supabase SQL Editor to set up all tables, RLS, and views.

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

alter table public.organizations enable row level security;

-- ============================================================
-- 2. PROFILES (extends auth.users)
-- ============================================================
create type public.user_role as enum ('admin', 'manager', 'worker');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  email text not null,
  full_name text not null,
  role public.user_role not null default 'worker',
  hourly_rate numeric(8,2),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- ============================================================
-- 3. PROJECTS
-- ============================================================
create type public.project_status as enum ('suunnittelu', 'käynnissä', 'valmis', 'keskeytetty');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  code text not null,
  client text not null,
  address text,
  total_budget numeric(12,2) not null default 0,
  start_date date not null,
  end_date date,
  status public.project_status not null default 'suunnittelu',
  description text,
  created_at timestamptz default now()
);

alter table public.projects enable row level security;

-- ============================================================
-- 4. BUDGET CATEGORIES
-- ============================================================
create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  budgeted_amount numeric(12,2) not null default 0,
  sort_order integer not null default 0
);

alter table public.budget_categories enable row level security;

-- ============================================================
-- 5. COSTS
-- ============================================================
create type public.cost_status as enum ('pending', 'approved', 'rejected');

create table public.costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  budget_category_id uuid references public.budget_categories(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null,
  vat_percent numeric(5,2) not null default 25.5,
  amount_with_vat numeric(12,2) not null,
  vendor text,
  invoice_date date not null default current_date,
  receipt_url text,
  status public.cost_status not null default 'pending',
  ai_extracted boolean not null default false,
  ai_confidence numeric(3,2),
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

alter table public.costs enable row level security;

-- ============================================================
-- 6. TIME ENTRIES
-- ============================================================
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  break_minutes integer not null default 0,
  description text,
  is_approved boolean not null default false,
  approved_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.time_entries enable row level security;

-- ============================================================
-- 7. DAILY LOGS
-- ============================================================
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  log_date date not null default current_date,
  weather text,
  temperature numeric(4,1),
  workers_on_site integer,
  notes text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  unique(project_id, log_date)
);

alter table public.daily_logs enable row level security;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Helper: get user's org_id
create or replace function public.get_user_org_id()
returns uuid
language sql
stable
security definer
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

-- Helper: get user's role
create or replace function public.get_user_role()
returns public.user_role
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Organizations: users can see their own org
create policy "Users see own org"
  on public.organizations for select
  using (id = public.get_user_org_id());

-- Profiles: users see profiles in their org
create policy "Users see org profiles"
  on public.profiles for select
  using (organization_id = public.get_user_org_id());

create policy "Admins manage profiles"
  on public.profiles for all
  using (
    organization_id = public.get_user_org_id()
    and public.get_user_role() = 'admin'
  );

-- Projects: users see projects in their org
create policy "Users see org projects"
  on public.projects for select
  using (organization_id = public.get_user_org_id());

create policy "Admin/manager manage projects"
  on public.projects for all
  using (
    organization_id = public.get_user_org_id()
    and public.get_user_role() in ('admin', 'manager')
  );

-- Budget categories: via project's org
create policy "Users see budget categories"
  on public.budget_categories for select
  using (
    project_id in (
      select id from public.projects where organization_id = public.get_user_org_id()
    )
  );

create policy "Admin/manager manage budget categories"
  on public.budget_categories for all
  using (
    project_id in (
      select id from public.projects where organization_id = public.get_user_org_id()
    )
    and public.get_user_role() in ('admin', 'manager')
  );

-- Costs: via project's org
create policy "Users see costs"
  on public.costs for select
  using (
    project_id in (
      select id from public.projects where organization_id = public.get_user_org_id()
    )
  );

create policy "Admin/manager manage all costs"
  on public.costs for all
  using (
    project_id in (
      select id from public.projects where organization_id = public.get_user_org_id()
    )
    and public.get_user_role() in ('admin', 'manager')
  );

create policy "Workers insert own costs"
  on public.costs for insert
  with check (
    created_by = auth.uid()
    and project_id in (
      select id from public.projects where organization_id = public.get_user_org_id()
    )
  );

-- Time entries: workers manage own, admin/manager see all in org
create policy "Workers manage own time"
  on public.time_entries for all
  using (user_id = auth.uid());

create policy "Admin/manager see all time"
  on public.time_entries for select
  using (
    project_id in (
      select id from public.projects where organization_id = public.get_user_org_id()
    )
    and public.get_user_role() in ('admin', 'manager')
  );

create policy "Admin/manager approve time"
  on public.time_entries for update
  using (
    project_id in (
      select id from public.projects where organization_id = public.get_user_org_id()
    )
    and public.get_user_role() in ('admin', 'manager')
  );

-- Daily logs: via project's org
create policy "Users see daily logs"
  on public.daily_logs for select
  using (
    project_id in (
      select id from public.projects where organization_id = public.get_user_org_id()
    )
  );

create policy "Admin/manager manage daily logs"
  on public.daily_logs for all
  using (
    project_id in (
      select id from public.projects where organization_id = public.get_user_org_id()
    )
    and public.get_user_role() in ('admin', 'manager')
  );

-- ============================================================
-- VIEW: Project Budget Summary
-- ============================================================
create or replace view public.project_budget_summary as
select
  p.id as project_id,
  p.name as project_name,
  p.code as project_code,
  p.status as project_status,
  p.total_budget,
  coalesce(sum(c.amount_with_vat), 0) as total_spent,
  p.total_budget - coalesce(sum(c.amount_with_vat), 0) as budget_remaining,
  case
    when p.total_budget > 0
    then round((coalesce(sum(c.amount_with_vat), 0) / p.total_budget * 100)::numeric, 1)
    else 0
  end as used_percent,
  p.start_date,
  p.end_date,
  p.client,
  p.organization_id
from public.projects p
left join public.costs c on c.project_id = p.id and c.status != 'rejected'
group by p.id;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, organization_id, email, full_name, role)
  values (
    new.id,
    coalesce(
      (new.raw_user_meta_data->>'organization_id')::uuid,
      (select id from public.organizations limit 1)
    ),
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'worker')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- STORAGE BUCKET FOR RECEIPTS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "Org users can upload receipts"
  on storage.objects for insert
  with check (bucket_id = 'receipts');

create policy "Org users can view receipts"
  on storage.objects for select
  using (bucket_id = 'receipts');
