# Phase 204 — Trusted Source Inventory

Phase 204 adds a bounded, read-only inventory of plausible lockfile sources. It checks the API lockfile and shrinkwrap paths and examines lockfile paths known to the current Git index, where Git is available. Candidate JSON is compared against the API manifest's package identity, lockfile version, and root dependency maps; SHA-256 hashes are recorded for evidence.

Run `node scripts/phase204_trusted_source_inventory.js` to refresh `PHASE204_TRUSTED_SOURCE_INVENTORY_REPORT.json`. Run `node scripts/phase204_trusted_source_inventory_contract_tests.js` for the Phase 204 contract tests.

This tool does not contact the network, install dependencies, import candidate files, or build the API. A matching lockfile is only a candidate: trusted Git/CI provenance must be independently verified. Current report status: see the generated JSON. Production remains not cleared.
