# ForestOS Phase 34 — Farm Mapping Integration & Field Navigation

## Included
- New authenticated `/api/field-navigation` register and `/field-navigation` page.
- Reads active map features from Phase 33 `/api/farm-map`.
- Creates saved navigation targets from map points and block polygons.
- Provides external Google Maps directions and OpenStreetMap location links.
- Owner-only archive endpoint.

## Use
1. Start the same MongoDB/API/web services configured in the previous phase.
2. Sign in and create farm map features at `/farm-map`.
3. Open `/field-navigation`, choose a map feature and save a navigation target.
4. Open directions in a supported mapping app or browser.

## Limitations and safety
- A block polygon is converted to an approximate average-vertex coordinate for directions; it may not be inside the block and is not a safe-entry-point guarantee. For blocks, confirm a gate/access point before field travel.
- Routes and travel times are provided externally and are not calculated by ForestOS.
- This phase does not automatically link navigation targets to SOP runs, worker assignments, or inspection records; the integration is via the shared map-feature register and explicit saved targets.
- GPS and map coordinates may be inaccurate. Check local access permission, terrain and hazards.
- Navigation links require internet and an external map provider.
- No build, browser, API, authorization, or database tests were run. ZIP structure and integrity are checked only.
