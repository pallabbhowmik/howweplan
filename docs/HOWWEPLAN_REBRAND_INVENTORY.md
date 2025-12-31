# HowWePlan Safe-Rename Inventory (Dec 30, 2025)

This repo is undergoing a **branding-only** rename from **TripComposer** → **HowWePlan** (`howweplan.com`).

**Hard constraints (do not break):**
- Do **not** rename domain models, contracts, events, DB tables, or API paths.
- Preserve compatibility: internal identifiers can remain `tripcomposer` where changing them would be a contract change.

---

## What we are renaming (SAFE)
These are **branding-only** surfaces and are safe to update:
- UI copy, page titles, metadata
- Public-facing emails/domains shown in docs or used as default sender info
- Notification subjects / simple email template branding
- README/doc prose describing the product

Examples updated already:
- Frontends: `TripComposer` display strings → `HowWePlan`
- Docs: admin credentials emails → `admin@howweplan.com`
- Notifications: subjects/template/footer branding → `HowWePlan`

---

## What we are NOT renaming (AMBIGUOUS / CONTRACT)
The following strings are treated as **internal identifiers** or **cross-service contracts**. Renaming them would likely break runtime behavior and requires a coordinated migration plan.

### Docker + runtime identifiers
- Docker Compose project name: `name: tripcomposer`
- Container/service/network/volume names such as:
  - `tripcomposer-identity`, `tripcomposer-postgres`, `tripcomposer-network`

### Event bus identifiers
- Exchange/channel/prefix names used for inter-service communication:
  - `tripcomposer.events`, `tripcomposer.audit`, `tripcomposer:*`

### Package scopes
- Monorepo npm package scopes:
  - `@tripcomposer/*`

### Auth token claims / expectations
- JWT issuer/audience defaults that may be validated across services:
  - `JWT_ISSUER=tripcomposer`, `JWT_AUDIENCE=tripcomposer-services`

---

## Remaining repo-wide occurrences: quick classification guide
When you see `TripComposer` / `tripcomposer`:
- If it appears in **UI strings**, **docs prose**, **email subject/template**, **example emails** → **rename**.
- If it appears as a **Docker container/network name**, **event exchange/channel**, **package name/scope**, **JWT issuer/audience** → **do not rename** without an explicit migration plan.

---

## Next steps (if you want to fully migrate internal identifiers)
If you later decide to rename internal identifiers too, it should be done as a separate project:
- Dual-publish events to old+new exchanges during migration.
- Support both JWT issuer/audience values temporarily.
- Add Docker Compose aliases or phased renames to avoid breaking service discovery.
- Coordinate package scope migration (`@tripcomposer/*` → new scope) with tooling and lockfiles.
