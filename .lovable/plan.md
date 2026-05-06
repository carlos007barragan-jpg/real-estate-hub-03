## Goal

Let admins/Supreme Admins grant individual agents access to specific pipelines (e.g. "Owner Finance Sales" only). Agents see only leads/data inside their granted pipelines. Admins & Supreme Admins always see everything.

**Default:** Agents have access to NOTHING until explicitly granted.

---

## 1. Database

New table `pipeline_access`:
- `user_id` (agent)
- `pipeline_id` (FK → pipelines.id)
- `organization_id`
- unique (user_id, pipeline_id)

RLS:
- Admins/Supreme Admins in the same org can view, insert, delete.
- Agents can view their own rows (so the client can read their grants).

Helper SQL function `user_has_pipeline_access(_user_id, _pipeline_name, _org_id)`:
- Returns `true` if user is admin/supreme_admin in that org.
- Otherwise `true` if a row exists in `pipeline_access` joining `pipelines.name = _pipeline_name`.

(We match by pipeline **name** because `leads.pipeline` is stored as text, not as an FK.)

Update RLS on `leads`:
- Keep current org-membership policy, but AND it with: caller is admin/supreme_admin OR `user_has_pipeline_access(auth.uid(), leads.pipeline, org)`.
- Leads with `pipeline IS NULL` (uncategorized) → only admins see them. (Open question — could also be visible to all; default to admin-only since the user wants strict segregation.)

Same gating added to:
- `lead_deals` SELECT policy (joined to `leads.pipeline`, or use `lead_deals.pipeline_id` directly which is cleaner).
- `notes`, `appointments`, `follow_ups`, `call_logs`, `documents`, `tasks` — filter by `lead_id` whose pipeline the user can access.

To avoid touching every table's RLS, simpler approach: gate at the `leads` table only. Notes/appointments/etc. already require lead visibility through joins in the UI. Where they don't (RLS allows direct row access via org membership), add a check that the related `lead_id` is in a pipeline the user can access.

---

## 2. Admin UI

**Settings → Team Management:** for each agent row, add a "Pipeline Access" button → opens a dialog with checkboxes for every pipeline in the org. Save writes/deletes rows in `pipeline_access`.

Visible only to admins/Supreme Admins.

---

## 3. Frontend filtering (defense-in-depth, RLS is the source of truth)

- **Pipelines page:** only show pipelines the user can access in the tab/selector. Admins see all.
- **Leads page:** filter dropdown reflects accessible pipelines only.
- **Lead Profile:** if an agent opens a lead outside their access, RLS hides it → show 404 / "no access" state.
- **New Lead / Assign Lead:** pipeline picker shows only accessible pipelines.
- **Dashboard:** existing queries automatically scoped via RLS — no extra work.

A new hook `useAccessiblePipelines()` returns the pipeline list a user can see (admins → all; agents → joined via `pipeline_access`).

---

## 4. Memory

Add a memory file documenting the new access model so future changes respect it.

---

## Open question

When an agent has zero pipeline grants, the Pipelines page and Leads page will be empty. Confirm this is the desired UX (vs. showing a "Request access from your admin" message). I'll implement the empty-state message by default.

---

## Out of scope

- No retroactive bulk assignment — admins grant access per-agent in the new dialog.
- No per-stage access (whole pipeline only).
- Marketing/owner roles unchanged.