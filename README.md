# PORT NEXUS

**Connecting Systems. Moving Information.**

Port Nexus is a 3D ICT landscape drawn as a stylised Singapore. Buildings are ICT systems, districts are organisational divisions, and moving cargo stands for information flowing between systems. Container ports at Tuas and Queenstown, Changi Airport and the expressways run on a simulated timetable. The world is drawn from data, so zones, systems and integrations added in the Port Management Studio appear straight away.

> **Status: Phase 1 complete, plus parts of Phases 2 and 5.** See [Roadmap](#roadmap) for what is done and what is next.

## Quick start

```sh
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript only |
| `npm run sim:check` | Run the shipping, road and airport simulations headlessly for 20 simulated minutes and print a summary |
| `npm run layout:check` | Check the map: plots on land and clear of roads, ports and the airport; ship waypoints in water |
| `npm run gen:seed-sql` | Regenerate `supabase/seed.sql` from the demo seed |

### Publishing on GitHub Pages

This is a Vite app, so GitHub Pages must serve the **built** files, not the repository itself. Serving the repo as-is gives a blank page, because the browser cannot run `src/main.tsx`.

1. In the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
2. Push to `main` or `claude/nifty-brahmagupta-u20t59`, or run **Actions → Deploy to GitHub Pages → Run workflow**.
3. The site is published at `https://<owner>.github.io/<repo>/`.

`.github/workflows/deploy-pages.yml` builds with `VITE_BASE=/<repo>/`, so asset paths and routes work under the repository path. It also copies `index.html` to `404.html`, so refreshing a page such as `/dashboard` works.

### Demo Mode vs shared data

With no Supabase credentials the app runs in **Demo Mode**. It uses the built-in seed data (6 zones, 10 systems, 6 ships, 4 berths) and saves every change to **this browser's localStorage only**. Integrations and journeys start empty: the earlier placeholder ones referred to systems that were removed, and links between the real systems have not been recorded yet. A badge in the header says so. Demo Mode is for trying things out; it is not a multi-user backend.

To prepare for the shared database, copy `.env.example` to `.env` and set the project URL and **anon** key:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<public anon key>
```

Never put the `service_role` key in the frontend. In Phase 1 the app detects these values but still reads and writes the demo store; the Supabase adapter and administrator sign-in are Phase 4.

### Database (Supabase)

```sh
supabase db reset        # applies supabase/migrations and supabase/seed.sql
```

Then make yourself an administrator (SQL editor, after signing up through Supabase Auth):

```sql
insert into public.admins (user_id) values ('<your auth.users id>');
```

The migration and seed were checked against PostgreSQL 16:
- Anonymous reads work.
- Anonymous and non-admin writes are refused.
- Admin edits are written to `audit_logs`.
- Two active zones cannot share a plot.

## Using the Port World

- **Navigate:** drag to rotate, scroll to zoom, right-drag (or two-finger drag) to pan. The toolbar has **Home view**, **Reset**, **Labels**, **Integration lines**, **Ambient animations** and **Fullscreen**.
- **Search** for a zone, system acronym, ship or place (Tuas Port, Queenstown Port, Changi Airport) to fly the camera to it.
- **Operations schedule** (right-hand panel, calendar button in the toolbar): flight arrivals and aircraft at gates, each port's berths, ships waiting at anchorage, inbound ships and ships at sea, and the next truck departures. It is a simulated timetable, not live data.
- **Click a zone** to focus it. Other zones are subdued and the panel lists its systems, with **Add system**.
- **Click a building** to open its system panel: purpose, owner, incoming and outgoing integrations, **View data flow** and **View impact**. Connected systems light up and their integration arcs appear. **Double-click** to fly in.
- **Click a ship** to see its voyage state, berth and cargo counts. **Follow vessel** keeps the camera on it.
- **Simulation speed:** Pause, 1×, 2×, 4× (bottom left). Shipping is labelled as simulated activity.
- **Dashboard strip** across the top shows totals and systems by status. **Expand dashboard** opens the full charts and the impact analysis.

Deep links: `/?focus=system:<id>`, `/?focus=zone:<id>`, `/?focus=ship:<id>`.

## Cross-division shared systems

Each system has three separate zone fields:

| Field | Meaning |
| --- | --- |
| **Owning division** | The one accountable division. It can be **Unassigned** while ownership is unconfirmed. |
| **Using divisions** | Any number of divisions that use the system. These can differ from the owner. |
| **Display zone** | Where the building stands. It defaults to the owner and can be any zone, including a shared services zone. |

**Shared system** is calculated, never stored: a system is shared when two or more divisions use it. Having several users never moves a system automatically.

**Modules:** a system can be split into modules, each with its own using divisions (for example eCustoms' 13 modules). It is still one record and one building, drawn as a campus with a pod per module. Clicking a pod, or a module in the side panel, highlights only that module's divisions. The system's users are everyone who uses any module.

- **Shared Services Hub:** an ordinary zone whose kind is *shared services*, beside the Trade zone. It is edited, moved or archived in **Studio → Zones**, and any zone can be marked as shared services. A shared zone displays systems but cannot own or use them.
- **In the Port World:** selecting a system lights its building and every zone that uses it, and draws **flowing dashed lines in each division's colour** to those zones. Unrelated zones dim. These usage lines are deliberately different from integration arcs (solid, coloured by data type). A division using a system is not shown as an integration unless one is configured.
- **Systems view filter** (bottom of the Port World): All, Division-owned, Shared or Unassigned. It has an optional **Show cross-division relationships** toggle.
- **Dashboard:**
  - figures for total shared systems, systems used across multiple divisions, and cross-division usage
  - systems by owning division, and cross-division usage by division
  - a shared systems table (click a system to fly to it)
- **Existing data:**
  - **Saved demo data** from before the Singapore layout restarts from the new seed, because the old plots no longer exist (branding settings are kept). JSON imports from older versions are normalised to the current model.
  - **Database:** `supabase/migrations/20261025000000_shared_systems.sql` renames `systems.zone_id` to `display_zone_id`, keeping its values, foreign key and policies. It adds `owning_zone_id` (filled from the current zone only where no owner is set), `zones.kind`, and the `system_division_usage` table. That table has a unique key on (system, zone), triggers that allow only divisions to own or use systems, row-level security and audit logging. The migration is idempotent. It was tested on PostgreSQL 16 both upgrading a Phase 1 database (all system IDs and integrations kept) and on a fresh database.
  - **Database (Singapore update):** `supabase/migrations/20261026000000_singapore_layout_and_modules.sql` adds `systems.year_introduced` and `build_progress`, the `system_modules` and `system_module_usage` tables (division-only, row-level security, audit), and `port_id` on berths and ships. It also allows acronyms such as `TradeNet5.0` and `Customs@SG`, unique regardless of case. It is idempotent and keeps existing rows. It was tested on PostgreSQL 16 on an upgraded database and on a fresh one.

## The Singapore layout

The map is traced from a reference map of Singapore (`src/data/layout.ts`): map pixels convert to world units, north is up (−z) and the Singapore Strait faces the camera.

| Where | What |
| --- | --- |
| Tuas (west) and Queenstown / Pasir Panjang (south) | The two container ports. Each has 2 berths, quay cranes, a yard and 3 ships. |
| Tuas → Pioneer → Jurong → Queenstown | Port highway with container shuttles between the two ports |
| Pioneer | Compliance Centre and Enforcement HQ |
| Between Bukit Timah and Serangoon | Trade Gateway, with the Shared Services Hub (eCustoms) beside it |
| Marina / CBD | Finance Treasury (location not given in the brief; easy to move in Studio → Zones) |
| Changi | Changi Airport and the Traveller Checkpoint |

Spare plots open with **Expand port map**: Jurong West, Sembawang, Ang Mo Kio and Pasir Ris.

### Timetabled activity (simulated)

- **Ships:** each port has 2 berths and 3 ships, so at busy times one waits at anchorage. Ships approach from the strait, berth, unload and load, then leave.
- **Port shuttles:** a container truck leaves every 9 seconds, alternating Tuas → Queenstown and Queenstown → Tuas. The container moves from one yard to the other.
- **Deliveries:** a truck leaves a port every 4.5 seconds for a town (Woodlands, Punggol, Bedok, CBD and others), unloads and drives back. Trucks keep left.
- **Flights:** an arrival every 22 seconds lands on the western runway, taxis to one of 4 gates and stays about 28 seconds. Ten passengers walk from the gate through the Traveller Checkpoint counters, then the aircraft departs from the eastern runway.

### System age and build progress

Each system has a **go-live year** and, while in development, a **build progress**:

| State | How the building looks |
| --- | --- |
| Live and older than 5 years | Legacy: weathered cream walls, faded colours, stains, a crack, a rusty roof tank, wall air-conditioners |
| Live and 5 years old or less | Modern: bright glass, glowing trim, rooftop solar panels |
| Planned / In Development, 0% | Fenced empty site with a sign |
| 1–10% | Foundation slab with rebar |
| Over 10% | Built up to that share of its height, with scaffolding, a ghost of the finished volume and a tower crane |

The demo's go-live years and the eCustoms module names and usage are **placeholders** to confirm in the System Registry.

## Routes

| Route | Page |
| --- | --- |
| `/` | Port World (3D) |
| `/dashboard` | Full ICT dashboard |
| `/systems` | System Directory: search, filter, show in port |
| `/journeys` | Data Journey Explorer (`?system=<id>` filters to one system) |
| `/admin` | Port Management Studio overview |
| `/admin/zones` | Zone Management |
| `/admin/systems` | System Registry |
| `/admin/integrations` | Integration Manager (view only in Phase 1) |
| `/admin/journeys` | Journey Builder (view only in Phase 1) |
| `/admin/maritime` | Maritime Simulation (ambient toggle; view only otherwise) |
| `/admin/settings` | Branding, graphics quality, JSON export/import, demo reset |

The admin pages and the 3D world are lazy-loaded, so the Studio does not download Three.js.

## Architecture

```
src/
  types/domain.ts          Records shared by the demo store and the database
  data/
    seed.ts                Demo zones, systems, eCustoms modules, ships, berths
    layout.ts              Singapore outline, ports, airport, expressway graph, plots, shipping lanes
    upgrade.ts             Normalises imported landscapes to the current model
    themes.ts              Zone facility-type labels
  lib/
    datasource.ts          Demo Mode / Supabase detection (anon client only)
    placement.ts           Zone layouts and building slots (pure functions)
    metrics.ts             Dashboard figures, ownership/usage and impact analysis, all from stored records
    systemAge.ts           Legacy / modern / under-construction state from year, status and progress
  store/
    landscape.ts           Zustand store for records + actions, persisted in Demo Mode
    world.ts               UI state: selection, camera focus, toggles, speed, quality
  sim/
    maritime.ts            Shipping at both ports (plain TypeScript, no React)
    logistics.ts           Timetabled port shuttles and town deliveries on the expressways
    airport.ts             Timetabled flights and travellers through the checkpoint
  world/                   React Three Fiber scene
    PortScene.tsx          Canvas, lights, sky, adaptive quality
    Ocean.tsx              Wave shader (+ matching JS wave function for bobbing)
    Terrain.tsx            Island, port terminals, expressways, town blocks, trees, place names, buoys
    airport/               Changi runways, terminal, aircraft and travellers
    ZoneDistrict.tsx       Zone slab, landmark, buildings, label
    zoneThemes.tsx         Landmarks: entry gates, scanning gantry, secure compound, plaza, canopy, conveyor
    buildings/             Building type per category; legacy, modern and construction looks; module campus
    maritime/              Ships, quay cranes, apron, container yard, trucks, sim context
    CameraRig.tsx          Smooth flights and ship following
    IntegrationLines.tsx   Arcs between buildings coloured by data type
  components/              App shell, dashboard, world overlays, forms, UI primitives
  pages/                   Routes, including admin/*
supabase/
  migrations/              Schema, constraints, indexes, triggers, RLS, storage bucket
  seed.sql                 Generated from src/data/seed.ts
scripts/                   Seed SQL generator, headless simulation check, layout check
```

### Maritime simulation

`sim/maritime.ts` is a self-contained state machine stepped once per frame and sub-stepped at high speed. The 3D components only read from it.

- **Ships:** each ship moves through `APPROACHING → WAITING → BERTHING → DOCKED → UNLOADING → LOADING → DEPARTING → AT_SEA`.
  - It reserves a free berth before berthing, so two ships never share one.
  - Ships slow down as they near their goal and give way to moving ships ahead.
  - Each waits at its own anchorage.
- **Quay cranes:** each container move is a real sequence:
  1. Gantry travels along the rail and the trolley runs out along the boom.
  2. The spreader lowers and locks on, and the container leaves the ship's deck.
  3. The crane hoists, travels and lowers the container onto the apron.
  4. It releases the container and raises the spreader.
  
  Loading runs the same sequence in reverse.
- **Trucks:** they collect unloaded containers from the apron and drive them to the yard. During loading they bring export containers from the yard. The yard's instanced stacks grow and shrink with these moves.
- **Ports:** each berth, ship and yard belongs to Tuas or Queenstown; ships only use their own port's berths.
- **Road logistics and the airport** run on their own timetables (`sim/logistics.ts`, `sim/airport.ts`). Port shuttles move containers between the two yards.

ICT data flows (Phase 3) will be a separate layer and do not touch this simulation.

### Performance

- Repeated objects use instanced meshes: yard containers, ship cargo, trees, bollards, road markings and breakwater blocks.
- Geometries, materials and textures are cached and shared.
- One shadow-casting light. Ocean resolution, shadow map size and pixel ratio follow the quality level.
- Quality **Auto** starts high on desktops and low on phones, then steps down if the frame rate drops (`PerformanceMonitor`).
- Labels are canvas sprites (no font downloads). System labels hide when the camera is far away.
- The simulation mutates plain objects instead of React state, so it causes no re-renders.

## Roadmap

### Phase 1: Working 3D port (done)
- [x] Vite + React + TypeScript + R3F + drei + Zustand + Tailwind + Recharts + React Router + Lucide
- [x] Ocean with animated waves, land, quay, roads, breakwater, lighthouse, navigation buoys
- [x] Six configurable zones, each with its own landmark
- [x] Camera navigation: orbit, zoom, pan, home, reset, zone, system and ship focus, fullscreen
- [x] Procedural buildings for all 10 system categories, with acronym labels
- [x] Three ships of different sizes, full voyage state machine, berth reservation, docking
- [x] Quay cranes doing multi-step unloading and loading; trucks; container yard; yard gantries
- [x] Pause, 1×, 2× and 4× speed controls; ambient on/off
- [x] Expandable dashboard strip and full dashboard, all figures from stored records
- [x] Demo Mode with seed data and browser persistence, clearly labelled
- [x] SQL migration with RLS, plus generated seed

### Phase 2: Dynamic landscape (mostly done)
- [x] Add, edit, recolour, move between plots, resize, hide, reorder and archive zones
- [x] Port map expansion (plot rings 1 and 2)
- [x] Add, edit, relocate and archive systems; empty zones show an **Add system** placeholder
- [x] System, zone and ship information panels; search and filtering
- [ ] Drag-to-place buildings within a zone (slots are automatic today)

### Phase 3: Integration and journey animation
- [x] Integration data model, static arcs coloured by data type, incoming and outgoing lists
- [ ] Add and edit integrations in the Studio
- [ ] Animated data containers along routes, with click-for-details
- [ ] Journey playback (sequential steps, branches, one-to-many, many-to-one, bidirectional)
- [ ] Journey Builder (ordered steps, branches, speed, preview, publish)

### Phase 4: Management Studio and persistence
- [ ] Supabase adapter replacing the demo store (read published data publicly; admin writes)
- [ ] Supabase Auth sign-in for `/admin`
- [ ] Supabase Storage uploads (bucket and policies already in the migration)
- [ ] Dashboard Manager (show, hide and reorder widgets)

### Phase 5: Advanced capabilities
- [x] Impact analysis (upstream and downstream, highlighted in the world)
- [x] Cross-division shared systems: ownership vs usage, Shared Services Hub, filter, dashboard, migration
- [x] Singapore layout: two ports, port highway, Changi Airport, timetabled ships, trucks, flights and travellers
- [x] System go-live year and build progress (legacy, modern and under-construction looks); system modules
- [ ] Conditional journey builder UI
- [ ] Expanded analytics
- [ ] Editable vessels, routes, berth assignments and cargo operations
- [ ] Further performance work (per-zone instancing of building parts, LOD meshes)
