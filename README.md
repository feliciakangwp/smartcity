# ICT Cityscape

A dashboard that tracks how far each system in the agency's ICT landscape has been built, and whether the data links between systems are agreed on both sides.

## Views

| Tab | What it does |
| --- | --- |
| **Overview** | All systems at a glance: build progress per part, stage, legacy / data-leak flags, and the data linkage check. Selecting a system asks its product manager to sign in. |
| **System register** | Anyone can read a system's profile. The signed-in PM can edit the description, build parts and progress, and declare **upstream** (pulls from) and **downstream** (pushes to) links. Each link row shows live whether the other system confirms it. Claims made by other systems that this one hasn't matched are listed with a one-click "Add" button. |
| **City landscape** | A Three.js smart city. Every system is a store on its own lot. Click a store or a vehicle for details. |

## Linkage validation

A link A → B is **connected** only when A lists B as downstream **and** B lists A as upstream.

- Only one side declares it → **broken linkage** (red). In the city this is a courier stuck on the road with a big **?** over their head.
- Both sides declare it, but either end is 0% built → **at risk** (amber truck). If the receiving system is unbuilt, the data is flagged as lost.
- Both sides declare it and both exist → **connected** (green delivery trucks).

## How the city draws a system

| Build state | Drawn as |
| --- | --- |
| 0% | Empty fenced dirt lot with a "Land reserved" board |
| 1–15% (discovery) | Foundation slab with rebar stubs and survey stakes |
| 16–99% | Walls up to that share of full height, scaffolding above, crane from 30% |
| 100% | Finished store with roof |
| Legacy | Weathered brick, stains, cracks, boarded windows, pitched old roof |
| Data leaks | Dripping pipe with a puddle |

Systems with several parts (e.g. POLARIS, CORDIS) get one building block per part on the same lot.

## Demo data

ORION 80% · POLARIS 50% / 10% / 10% · CORDIS 10% / 10% / 10% · REGGIE empty land · CASEM 90% legacy · ESERV 70% legacy · RMS 100% legacy with leaking pipe.

Links: RMS → POLARIS (both declared), CORDIS → POLARIS (both declared), ESERV → REGGIE (REGGIE hasn't declared it → broken, data lost).

Every demo PM signs in with username `<system>.pm` (e.g. `polaris.pm`) and passcode `demo`. "Reset demo data" on the Overview restores the seed.

## Running it

No build step. Serve the folder with any static server and open it:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Three.js 0.160.0 loads from the jsDelivr CDN, so the city tab needs internet access.

## Limitations

This is a front-end prototype. Data is saved in the browser's `localStorage`, so each browser has its own copy, and PM sign-in is a client-side gate, not real authentication. A shared deployment needs a backend (database + SSO) behind `js/store.js`.

## Code layout

```
index.html        page shell, tabs, sign-in modal
css/styles.css    design tokens (light + dark) and components
js/data.js        demo seed data
js/store.js       state, persistence, PM session, progress/stage helpers
js/validation.js  push/pull linkage check
js/overview.js    Overview tab
js/editor.js      System register tab
js/city.js        3D city (Three.js)
js/app.js         tab routing and re-rendering
js/ui.js          shared helpers (escaping, toast, sign-in modal)
```
