# Workout App Spec

## Goal
Build a minimal dark-mode workout app for creating, previewing, editing, and running structured workout sessions defined by JSON.

The product should feel like a calm instrument rather than a generic fitness app.

## Current implementation snapshot
- The app runs on Next.js App Router with React and Tailwind.
- `/`, `/home`, `/session/[id]`, `/builder/[id]`, `/builder/new`, `/play/[id]`, `/edit/[sessionId]/[exerciseId]`, and `/exit` are present.
- **`lib/session-repository.ts`** resolves sessions: when Supabase is configured (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), **list** and **get** read from the `session_definitions` table; otherwise the app falls back to **bundled sample sessions**. Rows are ordered by **`sort_order`** (then `title`); new rows get the next sort index on upsert.
- **`lib/session-draft.ts`** provides **`createNewSessionDraft()`** for **`/builder/new`** so that route does not import the `server-only` session repository (avoids fragile server chunks in dev).
- **`PUT /api/sessions`** upserts a validated `SessionDefinition` into Supabase (same table), preserving or assigning **`sort_order`**. The builder’s **save to Supabase** action and the **adjust** screen’s **done** action call this route.
- **`PATCH /api/sessions/order`** accepts `{ session_ids: string[] }` (full ordered list, no duplicates) and updates **`sort_order`** for each row when Supabase is configured. Used by the home session list when drag-reorder is enabled.
- The builder is the most complete flow: structural editing, block-type conversion, import/export, and schema validation.
- Builder collapse state for sections, blocks, and exercises is UI-only and is not part of exported session JSON.
- **Session metadata:** optional **`description`** (multi-line, schema `maxLength` 2000) is documented in the JSON schema, edited in the builder (**session description** textarea), and shown on the **session detail** page when present.
- **Play mode:** the playback compiler emits **`exercise`**, **`rest`**, and **`circuit_time_play`** steps (no structural stage/section/block marker steps). Normal **exercise** / **rest** lines use a **live countdown** on rests (`mm:ss`), auto-advance at zero, and skip. **← back** (under **← exit**) returns to the previous step when `index > 0`. **`circuit_time` blocks** compile to a **single `circuit_time_play` step**: a **block-level countdown** from `duration_seconds`, **`[ start ]`** before the clock runs, **`[ pause ]` / `[ resume ]`**, cycling **exercises** in order with **`[ complete ]`**; optional **per-exercise** `rest_after_seconds` shows an in-block rest timer (skip supported). While the block clock runs, time counts down during rests too. When time reaches **zero**, the UI shows **time up — finish this step**; the user **finishes the current exercise or rest**, then play **advances past the circuit** (no extra rest after time up if they were on an exercise). After the final plan step, a **completion splash** (CONGRATULATIONS / Session completed); **tap** navigates to **`/home`**.
- **Play resume and adjust:** **`/play/[id]?at=N`** (from the server, `N` clamped to a valid step index) restores the **playback step index** after leaving play. **Tap to adjust** links include **`returnStep`** so **done** on **`/edit/...`** can navigate back with **`?at=`**. **`AdjustScreen`** applies edits via **`applyExerciseAdjustments`** in **`lib/session-apply.ts`** (including supersets), validates, **`PUT`s** the full session, then returns to play. If Supabase returns **503**, a message is shown and play still resumes at **`?at=`** without persisting.
- **Timer persistence across adjust:** For **`circuit_time_play`** and plan-level **rest** steps, **sessionStorage** snapshots (keyed by session id, step index, and `step_id`) preserve **countdown and UI phase** when returning from adjust with **`?at=`**; opening **`/play/[id]`** without **`at`** clears those keys for a fresh run. A short **gate** runs before play UI mounts so clears happen before panels rehydrate.
- **Next.js:** `serverExternalPackages: ['@supabase/supabase-js']` in `next.config.mjs` avoids broken server vendor chunks for Supabase (e.g. missing `./vendor-chunks/@supabase.js`); clear **`.next`** after config changes if dev misbehaves.
- Run history, durable run state, and post-run mutation workflows are still future work.

## Design principles
- Typography-led interface
- Minimal chrome
- No gradients
- No heavy shadows
- No cluttered dashboards
- One primary action per screen
- Always show the next step during play mode
- Inline adjustment rather than complex forms whenever possible
- Session Builder should feel like a structured editor, not a form builder

## Session model
Session structure:
- Session
- Stage
- Section
- Block
- Exercise

Supported concepts:
- optional session-level **description** (goals, focus, equipment; for authors and AI-generated metadata)
- warmup / main / cooldown stages
- sections (sub-sessions)
- blocks such as flow, straight sets, circuit rounds, EMOM
- reps, rep ranges, time
- weights, bodyweight, resistance bands
- exercise rest, set rest, round rest, section rest
- optional in-session adjustment and mutation proposal support

## Core routes / screens
1. `/home` — Session list
2. `/session/[id]` — Session detail / preview
3. `/builder/[id]` — Session builder / structural editor
4. `/builder/new` — New session builder starting point
5. `/play/[id]` — Play mode (exercise or rest state)
6. `/edit/[sessionId]/[exerciseId]` — Adjust exercise values during a run
7. `/exit?sessionId=...` — Exit session sheet
8. Root `/` should redirect to `/home`

### API (server)
- **`PUT /api/sessions`** — body: full `SessionDefinition` JSON; validates against the canonical schema; upserts into Supabase when configured (including **`sort_order`**). Used by the builder save action and by **adjust / done**.
- **`PATCH /api/sessions/order`** — body: `{ session_ids: string[] }` (every session exactly once, no duplicates); updates **`sort_order`** by array index. Used by the home list when Supabase is configured.

## Screen requirements

### 1. Home / Sessions
Purpose:
- show sessions
- create new session
- jump to a session detail page
- reorder sessions when persisted to Supabase

UI:
- session title
- duration + tags/meta in muted text
- subtle row layout
- no dashboard stats
- when Supabase is configured: **drag handle** per row (**@dnd-kit**, vertical list); row body remains a link to session detail

Primary interactions:
- tap row -> Session Detail
- tap `+ new session` -> Session Builder (new)
- optional import JSON action
- drag handle -> reorder list; order **PATCH**ed to Supabase

### 2. Session Detail / Preview
Purpose:
- inspect session contents before starting
- start session
- open the builder
- duplicate session later

UI:
- session title
- duration and tags (and optional **description** body copy when `description` is set—multi-line, prose style)
- visible stage -> section -> exercise structure; each **block** line shows a short **structure hint** after the title (e.g. **4 rounds** for `circuit_rounds`, set counts for straight sets / supersets, EMOM minutes, timed circuit duration) so repeats are obvious before play
- start session action
- edit / duplicate secondary actions

### 3. Session Builder
Purpose:
- create a new session or structurally edit an existing one
- update stages, sections, blocks, exercises, prescriptions, load, and rest settings
- import and export valid JSON
- edit optional **session description** (multi-line) for targeting / context

UI:
- `← session` or `← sessions`
- session metadata: title, id, **session description** (textarea), duration, tags; **save to Supabase** when API and env are configured
- visible stage -> section -> block -> exercise tree
- structured editing controls rather than raw JSON by default
- lightweight `+ add exercise`, `+ add block`, `+ add section`, `+ add stage`
- remove and reorder controls at each structural level
- block-type switching for flow, straight sets, circuit rounds, timed circuits, supersets, and EMOM
- collapsible toggles for sections, blocks, and exercises so the tree can compress to title-only rows
- import JSON, validate, and export JSON actions

Important distinction:
- Builder handles structural editing
- In-session adjust screen handles lightweight per-exercise updates only

### 4. Play / Exercise
Purpose:
- execute one exercise step
- see current context and next exercise
- recover from an accidental advance to the next step

UI:
- top line: **`← exit`** and, when not on the first step, **`← back`** (returns to the previous playback step); stage / section context; round/set progress where applicable
- large exercise title
- prescription line (`10 reps @ 16 kg`)
- one primary action `[ complete ]`
- persistent `next` preview
- subtle hint that tapping the prescription opens adjust mode

### 5. Play / Rest
Purpose:
- show **live** countdown and next exercise

UI:
- same **← exit** / **← back** (when past the first step) pattern as exercise
- `rest`
- large **countdown** that decrements each second (`mm:ss`); **auto-advance** to the next step at zero
- next exercise preview
- **skip** action (advance immediately)

### 5c. Play / Timed circuit (`circuit_time` → `circuit_time_play`)
Purpose:
- repeat a fixed list of exercises for a **wall-clock duration** (AMRAP-style within the cap)

UI / behavior:
- **← exit** / **← back** (same as other play screens when not on the first plan step)
- prominent **circuit** countdown (`mm:ss`, or `h:mm:ss` when ≥ 1 hour)
- **`[ start ]`** — begins the block countdown (before start, clock shows full duration and does not tick)
- **`[ pause ]` / `[ resume ]`** — freezes the block timer and the in-block rest timer
- **Exercise phase:** same pattern as normal play (title, prescription, edit link); **`[ complete ]`** is ignored until after **start**; advances to **rest** if the exercise has `rest_after_seconds`, otherwise the **next exercise** in the list (wraps to the first after the last)
- **Rest phase:** countdown and **`[ skip ]`**; when rest ends or is skipped, advances to the **next exercise** (wrap) unless time is up
- when **block time is up**, after the current mini-step completes, play moves to the **next item in the overall session plan** (not another lap in the circuit)

### 5b. Play / Session complete (end of run)
Purpose:
- acknowledge a finished session and return to the list

UI:
- full-screen tappable area after the last playback step
- **CONGRATULATIONS** and **Session completed** (empty plan shows **Nothing to play** with the same tap target)
- navigates to **`/home`** on tap (not the exit sheet)

### 6. Edit Exercise
Purpose:
- adjust current exercise values during a session
- **persist** changes to Supabase when configured
- return cleanly to play mode at the **same plan step** (`/play/[id]?at=…`)

UI:
- `← back` (returns to play with the same **`at`** when `returnStep` was present)
- exercise title
- direct manipulation controls for reps / time / load (and **rep_range** maps to a single reps control for min/max)
- **`[ done ]`** button: validate, **`PUT /api/sessions`** with updated **`SessionDefinition`**, then **`router.push`** to **`/play/[sessionId]?at=returnStep`**; on **503**, show a short error and still resume position

### 7. Exit Sheet
Purpose:
- safely leave a session

UI:
- `exit session?`
- `resume later`
- `end session`
- `cancel`

## Data architecture
- `SessionDefinition`: authoring / import-export format (includes optional `description`, `tags`, `duration_minutes`, `notes`, etc.)
- `NormalizedSessionDefinition`: compile-time normalized representation
- `PlaybackPlan`: flattened runtime plan for play mode — **`exercise`**, **`rest`**, and **`circuit_time_play`** (one step per timed circuit block). Legacy structural step types remain in TypeScript for potential reuse but are not emitted by the compiler today
- `SessionRun`: what happened during a specific run
- `SessionMutationProposal`: suggested changes after a run

## Builder module notes
- The builder edits a working copy of `SessionDefinition`
- Exercise identity is session-local, not global
- A future exercise library is optional and non-authoritative
- Import/export should always validate against the canonical JSON schema
- The builder should allow session creation without forcing raw JSON editing
- Raw JSON view can be added later as an advanced mode
- Collapse/expand state is ephemeral UI state and should not affect validation or exports

## Supabase schema
- Table **`session_definitions`**: includes **`sort_order integer not null default 0`** (see **`supabase/session_definitions.sql`**). Existing projects without the column should run **`supabase/migrate_add_sort_order.sql`** once.

## Implementation notes
- Use sample local JSON when Supabase is not configured
- Use **`session-repository`** for list/get; optional Supabase-backed persistence, **`PUT /api/sessions`** for saves from the builder and adjust flow, and **`PATCH /api/sessions/order`** for home list order
- Use provided TypeScript types as source of truth in code
- Use provided JSON schema as canonical import/export contract
- Compile nested session structure into a flat playback plan before rendering play mode
- Keep the play UI very light; state changes are more important than decorative UI
- Builder UI should stay text-led and sparse, with minimal borders
- Keep builder theming token-driven so future reskinning happens mostly in shared UI and theme layers
- Use shared UI primitives for editor shells and actions where possible

## Current builder status
- `SessionBuilder` currently supports:
- session title, id, **session description** (multi-line textarea), duration, and tags editing
- **save to Supabase** (via `PUT /api/sessions`) when environment variables are set
- stage, section, block, and exercise add/remove/reorder flows
- block-type conversion with block-shape-aware controls
- superset pair editing
- JSON import, schema validation, and JSON export
- collapsible sections, blocks, and exercises
- Unsaved edits remain client-side until the user saves to Supabase or exports JSON

## Known gaps
- No session **duplication** workflow yet (detail page control is still inert)
- No **run history** or durable in-progress playback state across devices (step index and timers use URL + **sessionStorage** only for the adjust round-trip)
- When Supabase is not configured, adjust **done** cannot persist edits; home list **drag reorder** is disabled; only sample/fallback sessions are available for list/detail/play unless JSON is imported elsewhere

## Prompt for Cursor
Build a minimal dark-mode workout app using Next.js + React + Tailwind.

Constraints:
- No cards, no gradients, no heavy shadows
- Typography-driven layout
- One primary action per screen
- Persistent next exercise preview
- Tap exercise / prescription to adjust during play mode
- Session structure: Stage → Section → Block → Exercise
- Keep the interface calm, precise, and sparse
- Session Builder must be present and must support structural editing

Implement these screens and flows:
1. Home / Sessions
2. Session Detail / Preview
3. Session Builder / Structural Editor
4. Play / Exercise
5. Play / Rest
6. Edit Exercise
7. Exit Sheet

Use the provided TypeScript types and JSON schema.

Implement:
- session detail view
- session builder route and component
- builder state helpers for add / edit / remove / reorder operations
- playback compiler
- minimal playback state
- rest handling
- edit exercise flow
- exit session confirmation flow

Do not add analytics dashboards, streaks, charts, or extra gamification.
