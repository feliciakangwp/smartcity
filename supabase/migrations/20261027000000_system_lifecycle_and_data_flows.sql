-- Port Nexus: system lifecycle and input / output data.
--   * systems.product_team        Project / Product Team (free text)
--   * systems.year_originated     year the system originated (1970 to this year); drives its age
--   * systems.decommission_year   year of decommission, required when status is 'Decommission'
--   * system_revamps              revamps with the areas maintained; one may be ticked for the age
--   * system_data_inputs          input data and the system it comes from
--   * system_data_outputs         output data and the system it goes to
--   * data_flow_tally (view)      sender -> receiver pairs with the tally check (broken links)
-- Idempotent: safe to run more than once.

-- ---------------------------------------------------------------------------
-- Systems: product team, year originated, decommission
-- ---------------------------------------------------------------------------
alter table public.systems add column if not exists product_team text;

alter table public.systems add column if not exists year_originated smallint;
alter table public.systems drop constraint if exists systems_year_originated_check;
-- The upper bound is checked against the current year by the app; the constraint keeps values sane.
alter table public.systems add constraint systems_year_originated_check check (year_originated is null or year_originated between 1970 and 2100);

alter table public.systems drop constraint if exists systems_status_check;
alter table public.systems add constraint systems_status_check
  check (status in ('Planned', 'In Development', 'Live', 'Enhancement', 'Sunsetting', 'Decommission', 'Retired'));

alter table public.systems add column if not exists decommission_year smallint;
alter table public.systems drop constraint if exists systems_decommission_year_check;
alter table public.systems add constraint systems_decommission_year_check check (
  (decommission_year is null or decommission_year between 1970 and 2100)
  and (status <> 'Decommission' or decommission_year is not null)
  and (year_originated is null or decommission_year is null or decommission_year >= year_originated));

-- The demo seed listed TradeNet 5.0 as live since 2025; it is a new system at 0%.
-- Only the untouched seed record is corrected.
update public.systems
   set status = 'Planned', build_progress = 0, year_introduced = 2027,
       business_purpose = 'Next-generation trade declaration and permit platform. New system; development has not started.'
 where id = 'b0000000-0000-4000-8000-000000000003' and acronym = 'TradeNet5.0'
   and status = 'Live' and year_introduced = 2025 and build_progress is null;

-- year_introduced now only holds the target go-live year of systems in development.
-- The go-live year of a built system becomes the year it originated.
update public.systems
   set year_originated = year_introduced, year_introduced = null
 where year_originated is null
   and year_introduced is not null
   and status not in ('Planned', 'In Development')
   and year_introduced <= extract(year from now());

-- ---------------------------------------------------------------------------
-- Revamps
-- ---------------------------------------------------------------------------
create table if not exists public.system_revamps (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems (id) on delete cascade,
  year smallint not null check (year between 1970 and 2100),
  areas text not null default '',
  use_for_age boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists system_revamps_system_idx on public.system_revamps (system_id, year);
-- Only one revamp per system can be used for the years of the system.
create unique index if not exists system_revamps_one_for_age on public.system_revamps (system_id) where use_for_age;

-- ---------------------------------------------------------------------------
-- Input and output data
-- ---------------------------------------------------------------------------
create table if not exists public.system_data_inputs (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems (id) on delete cascade,
  data text not null check (length(trim(data)) > 0),
  from_system_id uuid not null references public.systems (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_system_id <> system_id)
);
create index if not exists system_data_inputs_pair_idx on public.system_data_inputs (from_system_id, system_id);

create table if not exists public.system_data_outputs (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems (id) on delete cascade,
  data text not null check (length(trim(data)) > 0),
  to_system_id uuid not null references public.systems (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (to_system_id <> system_id)
);
create index if not exists system_data_outputs_pair_idx on public.system_data_outputs (system_id, to_system_id);

-- Tally check: one row per sender -> receiver pair of active systems. A pair is 'ok' when
-- the receiver lists input from the sender and the sender lists output to the receiver;
-- otherwise it is a broken link and says which side is missing.
create or replace view public.data_flow_tally with (security_invoker = true) as
with inputs as (
  select i.from_system_id as from_id, i.system_id as to_id, array_agg(i.data order by i.data) as items
    from public.system_data_inputs i group by 1, 2
), outputs as (
  select o.system_id as from_id, o.to_system_id as to_id, array_agg(o.data order by o.data) as items
    from public.system_data_outputs o group by 1, 2
)
select coalesce(i.from_id, o.from_id) as from_system_id,
       coalesce(i.to_id, o.to_id) as to_system_id,
       case when o.from_id is null then 'missing-output'
            when i.from_id is null then 'missing-input'
            else 'ok' end as status,
       coalesce(i.items, '{}') as input_data,
       coalesce(o.items, '{}') as output_data
  from inputs i
  full join outputs o on o.from_id = i.from_id and o.to_id = i.to_id
  join public.systems sf on sf.id = coalesce(i.from_id, o.from_id) and not sf.archived
  join public.systems st on st.id = coalesce(i.to_id, o.to_id) and not st.archived;

-- ---------------------------------------------------------------------------
-- Timestamps, audit, row level security (public read, admin-only writes)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['system_revamps', 'system_data_inputs', 'system_data_outputs'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.write_audit_log()', t || '_audit', t);
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format(
      'create policy %I on public.%I for select using (exists (select 1 from public.systems s where s.id = system_id and not s.archived) or public.is_admin())',
      t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_delete', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_admin())', t || '_admin_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', t || '_admin_delete', t);
  end loop;
end $$;

grant select on public.data_flow_tally to anon, authenticated;
