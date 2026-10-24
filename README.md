# PORT NEXUS

**Connecting Systems. Moving Information.**

Port Nexus is a 3D ICT landscape shown as a living seaport. Buildings are ICT systems, districts are organisational divisions, and moving cargo stands for information flowing between systems. The world is drawn from data, so zones, systems and integrations added in the Port Management Studio appear in the port straight away.

> **Status: Phase 1 complete, plus parts of Phase 2.** See [Roadmap](#roadmap) for what is done and what is next.

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
| `npm run sim:check` | Run the maritime simulation headlessly for 20 simulated minutes and print every ship state change |
| `npm run gen:seed-sql` | Regenerate `supabase/seed.sql` from the demo seed |

### Demo Mode vs shared data

With no Supabase credentials the app runs in **Demo Mode**. It uses the built-in seed data (6 zones, 19 placeholder systems, 19 integrations, 4 journeys, 3 ships) and saves every change to **this browser's localStorage only**. A badge in the header says so. Demo Mode is for trying things out; it is not a multi-user backend.

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
- **Search** for a zone, system acronym or ship to fly the camera to it.
- **Click a zone** to focus it. Other zones are subdued and the panel lists its systems, with **Add system**.
- **Click a building** to open its system panel: purpose, owner, incoming and outgoing integrations, **View data flow** and **View impact**. Connected systems light up and their integration arcs appear. **Double-click** to fly in.
- **Click a ship** to see its voyage state, berth and cargo counts. **Follow vessel** keeps the camera on it.
- **Simulation speed:** Pause, 1×, 2×, 4× (bottom left). Shipping is labelled as simulated activity.
- **Dashboard strip** across the top shows totals and systems by status. **Expand dashboard** opens the full charts and the impact analysis.

Deep links: `/?focus=system:<id>`, `/?focus=zone:<id>`, `/?focus=ship:<id>`.

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
    seed.ts                Demo zones, placeholder systems, integrations, journeys A–D, ships, berths
    layout.ts              World geometry: plots, quay, cranes, yard, roads, shipping lanes
    themes.ts              Zone facility-type labels
  lib/
    datasource.ts          Demo Mode / Supabase detection (anon client only)
    placement.ts           Zone layouts and building slots (pure functions)
    metrics.ts             Dashboard figures and impact analysis, all from stored records
  store/
    landscape.ts           Zustand store for records + actions, persisted in Demo Mode
    world.ts               UI state: selection, camera focus, toggles, speed, quality
  sim/maritime.ts          Ambient shipping simulation (plain TypeScript, no React)
  world/                   React Three Fiber scene
    PortScene.tsx          Canvas, lights, sky, adaptive quality
    Ocean.tsx              Wave shader (+ matching JS wave function for bobbing)
    Terrain.tsx            Land, quay, roads, trees, breakwater, lighthouse, buoys
    ZoneDistrict.tsx       Zone slab, landmark, buildings, label
    zoneThemes.tsx         Landmarks: entry gates, scanning gantry, secure compound, plaza, canopy, conveyor
    buildings/             One procedural building type per system category
    maritime/              Ships, quay cranes, apron, container yard, trucks, sim context
    CameraRig.tsx          Smooth flights and ship following
    IntegrationLines.tsx   Arcs between buildings coloured by data type
  components/              App shell, dashboard, world overlays, forms, UI primitives
  pages/                   Routes, including admin/*
supabase/
  migrations/              Schema, constraints, indexes, triggers, RLS, storage bucket
  seed.sql                 Generated from src/data/seed.ts
scripts/                   Seed SQL generator, headless simulation check
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
- **Ambient traffic:** yard gantries and district road traffic run independently.

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
- [ ] Conditional journey builder UI
- [ ] Expanded analytics
- [ ] Editable vessels, routes, berth assignments and cargo operations
- [ ] Further performance work (per-zone instancing of building parts, LOD meshes)
