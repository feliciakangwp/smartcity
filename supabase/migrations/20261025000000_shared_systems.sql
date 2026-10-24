-- Cross-division shared systems.
-- Additive and idempotent: keeps every existing system id, zone assignment and integration.
--   * zones.kind            'division' (default for all existing zones) or 'shared'
--   * systems.zone_id       renamed to display_zone_id (where the building is shown); data kept
--   * systems.owning_zone_id accountable division, nullable (= unassigned); backfilled from the
--                           current zone only where no owner is set and that zone is a division
--   * system_division_usage many-to-many: which divisions use which system

-- ---------------------------------------------------------------------------
-- Zones: kind + 'shared' theme
-- ---------------------------------------------------------------------------
alter table public.zones add column if not exists kind text not null default 'division';
alter table public.zones drop constraint if exists zones_kind_check;
alter table public.zones add constraint zones_kind_check check (kind in ('division', 'shared'));

alter table public.zones drop constraint if exists zones_theme_check;
alter table public.zones add constraint zones_theme_check
  check (theme in ('trade', 'compliance', 'enforcement', 'finance', 'traveller', 'integration', 'shared', 'generic'));

-- ---------------------------------------------------------------------------
-- Systems: display zone + owning division
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'systems' and column_name = 'zone_id')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'systems' and column_name = 'display_zone_id') then
    -- Renaming keeps the values, the foreign key and the RLS policy that refer to the column.
    alter table public.systems rename column zone_id to display_zone_id;
  end if;
end $$;
alter index if exists public.systems_zone_idx rename to systems_display_zone_idx;

alter table public.systems add column if not exists owning_zone_id uuid references public.zones (id) on delete set null;
create index if not exists systems_owning_zone_idx on public.systems (owning_zone_id);

-- Existing systems were owned by the zone they stood in. Never overwrite an owner already set.
update public.systems s
   set owning_zone_id = s.display_zone_id
  from public.zones z
 where z.id = s.display_zone_id and z.kind = 'division' and s.owning_zone_id is null;

-- ---------------------------------------------------------------------------
-- Division usage (many-to-many)
-- ---------------------------------------------------------------------------
create table if not exists public.system_division_usage (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems (id) on delete cascade,
  zone_id uuid not null references public.zones (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (system_id, zone_id)
);
create index if not exists system_division_usage_zone_idx on public.system_division_usage (zone_id);

-- Each existing system is used by its owner.
insert into public.system_division_usage (system_id, zone_id)
select id, owning_zone_id from public.systems where owning_zone_id is not null
on conflict (system_id, zone_id) do nothing;

-- Only divisions may own or use systems; shared zones only display them.
create or replace function public.assert_division_zone(zid uuid) returns void
language plpgsql as $$
begin
  if zid is not null and not exists (select 1 from public.zones where id = zid and kind = 'division') then
    raise exception 'Zone % is not a division, so it cannot own or use a system', zid using errcode = 'check_violation';
  end if;
end $$;

create or replace function public.check_system_owner() returns trigger
language plpgsql as $$
begin
  perform public.assert_division_zone(new.owning_zone_id);
  return new;
end $$;

create or replace function public.check_usage_zone() returns trigger
language plpgsql as $$
begin
  perform public.assert_division_zone(new.zone_id);
  return new;
end $$;

drop trigger if exists systems_owner_is_division on public.systems;
create trigger systems_owner_is_division before insert or update of owning_zone_id on public.systems
  for each row execute function public.check_system_owner();
drop trigger if exists usage_zone_is_division on public.system_division_usage;
create trigger usage_zone_is_division before insert or update of zone_id on public.system_division_usage
  for each row execute function public.check_usage_zone();
drop function if exists public.check_division_zone();

drop trigger if exists system_division_usage_audit on public.system_division_usage;
create trigger system_division_usage_audit after insert or update or delete on public.system_division_usage
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.system_division_usage enable row level security;

drop policy if exists usage_read on public.system_division_usage;
create policy usage_read on public.system_division_usage for select using (
  exists (select 1 from public.systems s where s.id = system_id and not s.archived) or public.is_admin());

drop policy if exists usage_admin_insert on public.system_division_usage;
create policy usage_admin_insert on public.system_division_usage for insert to authenticated with check (public.is_admin());
drop policy if exists usage_admin_update on public.system_division_usage;
create policy usage_admin_update on public.system_division_usage for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists usage_admin_delete on public.system_division_usage;
create policy usage_admin_delete on public.system_division_usage for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Shared Services Hub on the central plot, for databases that already have plots.
-- (On a fresh database there are no plots yet; seed.sql adds the hub instead.)
-- ---------------------------------------------------------------------------
update public.zone_plots set ring = 0 where x = 45 and z = -104;

insert into public.zones (name, description, color, theme, kind, plot_id, sort_order)
select 'Shared Services Hub',
       'Enterprise-wide systems used across several divisions and not owned by any single one.',
       '#0d9488', 'shared', 'shared', p.id,
       coalesce((select max(sort_order) from public.zones), 0) + 1
  from public.zone_plots p
 where p.x = 45 and p.z = -104
   and not exists (select 1 from public.zones where kind = 'shared' and not archived)
   and not exists (select 1 from public.zones where plot_id = p.id and not archived);
