-- Port Nexus schema.
-- Public (anon) users can read published, non-archived landscape data.
-- Only authenticated administrators listed in public.admins can write.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Zones and plots
-- ---------------------------------------------------------------------------
create table public.zone_plots (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  x numeric not null,
  z numeric not null,
  width numeric not null check (width > 0),
  depth numeric not null check (depth > 0),
  ring smallint not null default 0 check (ring >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (x, z)
);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  theme text not null default 'generic'
    check (theme in ('trade', 'compliance', 'enforcement', 'finance', 'traveller', 'integration', 'generic')),
  plot_id uuid not null references public.zone_plots (id),
  scale numeric not null default 1 check (scale between 0.6 and 1),
  visible boolean not null default true,
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- No two active zones may share a plot (zones never overlap).
create unique index zones_active_plot_uniq on public.zones (plot_id) where not archived;
create unique index zones_active_name_uniq on public.zones (lower(name)) where not archived;
create index zones_sort_idx on public.zones (sort_order);

-- ---------------------------------------------------------------------------
-- Systems
-- ---------------------------------------------------------------------------
create table public.systems (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  acronym text not null check (acronym ~ '^[A-Z0-9]{2,8}$'),
  description text not null default '',
  zone_id uuid not null references public.zones (id) on delete restrict,
  business_purpose text not null default '',
  category text not null check (category in (
    'Frontend / eService', 'Core Processing', 'Finance', 'Compliance', 'Enforcement',
    'Data Repository', 'Integration', 'Analytics', 'External System', 'Other')),
  status text not null check (status in ('Planned', 'In Development', 'Live', 'Enhancement', 'Sunsetting', 'Retired')),
  criticality text not null check (criticality in ('Low', 'Medium', 'High', 'Mission Critical')),
  tech_stack text,
  owner text,
  endpoints text,
  docs jsonb not null default '[]'::jsonb check (jsonb_typeof(docs) = 'array'),
  slot smallint check (slot >= 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index systems_active_acronym_uniq on public.systems (acronym) where not archived;
create index systems_zone_idx on public.systems (zone_id);

-- ---------------------------------------------------------------------------
-- Integrations and journeys
-- ---------------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  source_id uuid not null references public.systems (id) on delete cascade,
  destination_id uuid not null references public.systems (id) on delete cascade,
  data_type text not null check (data_type in ('Transaction', 'Clearance / Approval', 'Pending Processing', 'Exception', 'Compliance')),
  mechanism text not null check (mechanism in ('REST API', 'Event / Message Queue', 'File Transfer', 'Batch', 'Database Interface', 'Manual Transfer', 'Other')),
  direction text not null default 'one-way' check (direction in ('one-way', 'bidirectional')),
  description text not null default '',
  trigger_event text not null default '',
  status text not null default 'Live' check (status in ('Planned', 'Live', 'Degraded', 'Retired')),
  via uuid[] not null default '{}',
  payload text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_id <> destination_id)
);
create index integrations_source_idx on public.integrations (source_id);
create index integrations_destination_idx on public.integrations (destination_id);

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  published boolean not null default false,
  speed numeric not null default 1 check (speed > 0 and speed <= 8),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index journeys_active_code_uniq on public.journeys (code) where not archived;

create table public.journey_steps (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys (id) on delete cascade,
  step_order integer not null check (step_order >= 0),
  integration_id uuid not null references public.integrations (id) on delete restrict,
  label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (journey_id, step_order)
);
create index journey_steps_journey_idx on public.journey_steps (journey_id);

create table public.journey_branches (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys (id) on delete cascade,
  after_step_id uuid not null references public.journey_steps (id) on delete cascade,
  condition text not null,
  integration_id uuid not null references public.integrations (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index journey_branches_journey_idx on public.journey_branches (journey_id);

-- ---------------------------------------------------------------------------
-- Maritime simulation
-- ---------------------------------------------------------------------------
create table public.berths (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  x numeric not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('entry', 'exit', 'anchorage')),
  waypoints jsonb not null check (jsonb_typeof(waypoints) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hull_color text not null check (hull_color ~ '^#[0-9a-fA-F]{6}$'),
  bays smallint not null check (bays between 1 and 12),
  row_count smallint not null check (row_count between 1 and 8),
  tiers smallint not null check (tiers between 1 and 6),
  unload_count smallint not null default 4 check (unload_count >= 0),
  load_count smallint not null default 4 check (load_count >= 0),
  sea_time_seconds integer not null default 40 check (sea_time_seconds >= 0),
  preferred_berth_id uuid references public.berths (id) on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Single-row settings tables.
create table public.simulation_settings (
  id boolean primary key default true check (id),
  ambient_enabled boolean not null default true,
  default_speed smallint not null default 1 check (default_speed in (0, 1, 2, 4)),
  updated_at timestamptz not null default now()
);

create table public.dashboard_settings (
  id boolean primary key default true check (id),
  platform_name text not null default 'PORT NEXUS',
  tagline text not null default 'Connecting Systems. Moving Information.',
  quality text not null default 'auto' check (quality in ('auto', 'low', 'medium', 'high')),
  map_rings smallint not null default 0 check (map_rings >= 0),
  widgets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor uuid default auth.uid(),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_table_idx on public.audit_logs (table_name, created_at desc);

create or replace function public.write_audit_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data)
  values (
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', null),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

-- updated_at + audit triggers on every content table
do $$
declare t text;
begin
  foreach t in array array['zone_plots', 'zones', 'systems', 'integrations', 'journeys', 'journey_steps',
                           'journey_branches', 'berths', 'shipping_routes', 'ships', 'simulation_settings', 'dashboard_settings']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.write_audit_log()', t || '_audit', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.zone_plots enable row level security;
alter table public.zones enable row level security;
alter table public.systems enable row level security;
alter table public.integrations enable row level security;
alter table public.journeys enable row level security;
alter table public.journey_steps enable row level security;
alter table public.journey_branches enable row level security;
alter table public.berths enable row level security;
alter table public.shipping_routes enable row level security;
alter table public.ships enable row level security;
alter table public.simulation_settings enable row level security;
alter table public.dashboard_settings enable row level security;
alter table public.audit_logs enable row level security;

-- Admin membership: admins can see the list; nobody writes it from the client.
create policy admins_read on public.admins for select to authenticated using (public.is_admin());

-- Public read of published landscape data. Admins also see archived and draft rows.
create policy plots_read on public.zone_plots for select using (true);
create policy zones_read on public.zones for select using ((not archived and visible) or public.is_admin());
create policy systems_read on public.systems for select using (
  (not archived and exists (select 1 from public.zones z where z.id = zone_id and not z.archived and z.visible)) or public.is_admin());
create policy integrations_read on public.integrations for select using (not archived or public.is_admin());
create policy journeys_read on public.journeys for select using ((published and not archived) or public.is_admin());
create policy steps_read on public.journey_steps for select using (
  exists (select 1 from public.journeys j where j.id = journey_id and j.published and not j.archived) or public.is_admin());
create policy branches_read on public.journey_branches for select using (
  exists (select 1 from public.journeys j where j.id = journey_id and j.published and not j.archived) or public.is_admin());
create policy berths_read on public.berths for select using (not archived or public.is_admin());
create policy routes_read on public.shipping_routes for select using (true);
create policy ships_read on public.ships for select using (not archived or public.is_admin());
create policy sim_read on public.simulation_settings for select using (true);
create policy dash_read on public.dashboard_settings for select using (true);
create policy audit_read on public.audit_logs for select to authenticated using (public.is_admin());

-- Writes: authenticated administrators only. No public write policies.
do $$
declare t text;
begin
  foreach t in array array['zone_plots', 'zones', 'systems', 'integrations', 'journeys', 'journey_steps',
                           'journey_branches', 'berths', 'shipping_routes', 'ships', 'simulation_settings', 'dashboard_settings']
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', t || '_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || '_admin_delete', t);
  end loop;
end $$;

-- Asset uploads (Phase 4): a public-read bucket that only admins can write to.
insert into storage.buckets (id, name, public) values ('port-assets', 'port-assets', true)
on conflict (id) do nothing;
create policy port_assets_admin_write on storage.objects for insert to authenticated
  with check (bucket_id = 'port-assets' and public.is_admin());
create policy port_assets_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'port-assets' and public.is_admin());
create policy port_assets_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'port-assets' and public.is_admin());
