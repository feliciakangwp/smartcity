-- Singapore layout, system age/build progress and system modules.
-- Additive and idempotent: existing rows keep their ids and values.
--   * systems.year_introduced  go-live (or target) year; drives the legacy / modern look
--   * systems.build_progress   0–100 for systems under development
--   * acronyms may contain lower case, @, dot and dash (e.g. TradeNet5.0, Customs@SG)
--   * system_modules           parts of a system (e.g. eCustoms' 13 modules)
--   * system_module_usage      which divisions use each module
--   * berths.port_id, ships.port_id  Tuas or Queenstown

-- ---------------------------------------------------------------------------
-- Systems
-- ---------------------------------------------------------------------------
alter table public.systems add column if not exists year_introduced smallint;
alter table public.systems drop constraint if exists systems_year_introduced_check;
alter table public.systems add constraint systems_year_introduced_check check (year_introduced is null or year_introduced between 1980 and 2050);

alter table public.systems add column if not exists build_progress smallint;
alter table public.systems drop constraint if exists systems_build_progress_check;
alter table public.systems add constraint systems_build_progress_check check (build_progress is null or build_progress between 0 and 100);

alter table public.systems drop constraint if exists systems_acronym_check;
alter table public.systems add constraint systems_acronym_check check (acronym ~ '^[A-Za-z0-9@.\-]{2,16}$');
drop index if exists public.systems_active_acronym_uniq;
create unique index if not exists systems_active_acronym_ci_uniq on public.systems (upper(acronym)) where not archived;

-- ---------------------------------------------------------------------------
-- Modules
-- ---------------------------------------------------------------------------
create table if not exists public.system_modules (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists system_modules_name_uniq on public.system_modules (system_id, lower(name));
create index if not exists system_modules_system_idx on public.system_modules (system_id, sort_order);

create table if not exists public.system_module_usage (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.system_modules (id) on delete cascade,
  zone_id uuid not null references public.zones (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (module_id, zone_id)
);
create index if not exists system_module_usage_zone_idx on public.system_module_usage (zone_id);

-- Only divisions may use a module (same rule as system usage).
create or replace function public.check_module_usage_zone() returns trigger
language plpgsql as $$
begin
  perform public.assert_division_zone(new.zone_id);
  return new;
end $$;
drop trigger if exists module_usage_zone_is_division on public.system_module_usage;
create trigger module_usage_zone_is_division before insert or update of zone_id on public.system_module_usage
  for each row execute function public.check_module_usage_zone();

drop trigger if exists system_modules_updated_at on public.system_modules;
create trigger system_modules_updated_at before update on public.system_modules for each row execute function public.set_updated_at();
drop trigger if exists system_modules_audit on public.system_modules;
create trigger system_modules_audit after insert or update or delete on public.system_modules for each row execute function public.write_audit_log();
drop trigger if exists system_module_usage_audit on public.system_module_usage;
create trigger system_module_usage_audit after insert or update or delete on public.system_module_usage for each row execute function public.write_audit_log();

alter table public.system_modules enable row level security;
alter table public.system_module_usage enable row level security;

drop policy if exists modules_read on public.system_modules;
create policy modules_read on public.system_modules for select using (
  exists (select 1 from public.systems s where s.id = system_id and not s.archived) or public.is_admin());
drop policy if exists module_usage_read on public.system_module_usage;
create policy module_usage_read on public.system_module_usage for select using (
  exists (select 1 from public.system_modules m join public.systems s on s.id = m.system_id where m.id = module_id and not s.archived) or public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['system_modules', 'system_module_usage'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_delete', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', t || '_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || '_admin_delete', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Ports: berths and ships belong to Tuas or Queenstown
-- ---------------------------------------------------------------------------
alter table public.berths add column if not exists port_id text not null default 'tuas';
alter table public.berths drop constraint if exists berths_port_id_check;
alter table public.berths add constraint berths_port_id_check check (port_id in ('tuas', 'queenstown'));

alter table public.ships add column if not exists port_id text not null default 'tuas';
alter table public.ships drop constraint if exists ships_port_id_check;
alter table public.ships add constraint ships_port_id_check check (port_id in ('tuas', 'queenstown'));
