# ForestOS Phase 33 — Farm Mapping & Geospatial Intelligence

## Included
- Authenticated API and MongoDB register for map features.
- GeoJSON-style Point records for hive/apiary, inspection, access and other locations.
- Polygon records for farm-block boundaries.
- Client-only Leaflet map using OpenStreetMap tiles.
- Map-click coordinate picker, browser GPS capture, polygon coordinate entry, and feature register.
- Owner-only archive action.
- Server-side coordinate range, geometry type, polygon closure, and vertex-count validation.

## Run
Install updated web dependencies, configure the existing Phase 32 environment, start MongoDB/API/web, sign in, then open `/farm-map`. Click the map for a point or capture device GPS. For blocks, enter at least three `latitude,longitude` vertices, one per line.

## Limitations
- The fallback map center is a Kampala-area display default only, not a verified farm location.
- Polygon acreage is not calculated; `areaAcres` is a manual record, not proof of legal acreage.
- Mapping is operational, not a cadastral survey. GPS accuracy is device-reported and may be poor under canopy.
- Public OpenStreetMap tiles require internet; offline tiles are not included. Review tile usage policy before high-volume production use.
- Active list capped at 2,000 features; no clustering, GIS import/export, offline maps, or automatic linking to SOP inspections/hives.
- Archive endpoint is owner-role protected; verify role guard configuration in deployment.
- Build, database, browser, authorization and live API tests were not run. Only archive structure/integrity checks are performed.
