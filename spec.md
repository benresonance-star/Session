# Workout App Spec

## Goal
Build a minimal workout app for creating, previewing, editing, and running structured workout sessions defined by JSON, with support for multiple UI skins.

The product should feel like a calm instrument rather than a generic fitness app.

## Current implementation snapshot
- **JSON schema:** **`schema/session-definition.schema.json`** validates session JSON (Ajv in **`lib/session-validation.ts`**). **`schema_version`** is **`"1.1"`** or **`"1.2"`** (enum); both accept the same exercise shape. Optional per-exercise **`coach`** is edited in the builder and **shown in play mode only** (not on the session preview / detail page before start). **Version emission:** untouched sessions stay **`1.1`**. On **save**, **export**, and **`PUT /api/sessions`**, **`prepareSessionForPersistence`** sets **`schema_version`** to **`"1.2"`** when any exercise has non-empty **`coach`**, otherwise leaves the existing **`schema_version`** unchanged (no auto-downgrade from **`1.2`** when coach is cleared). New drafts from **`createEmptySession`** start at **`1.1`**.
- The app runs on Next.js App Router with React and Tailwind.
- **UI skins:** the app now supports token-driven skins via **`html[data-skin]`**. **`lib/ui-skin.ts`** defines the curated skins plus the LCD tuning schema, **`components/providers/SkinProvider.tsx`** persists the selected skin in **`localStorage`** (`workout-ui-skin`), mirrors LCD tuning into a local cache, and syncs the active values to the document, and **`app/layout.tsx`** applies the initial skin and globally synced LCD tuning before React paints to avoid a flash of the wrong theme.
- **Current skins:** **`minimal-dark`** remains the default look. **`retro-lcd`** is an alternate full-app skin with LCD-style palette tokens, pixel-grid display texture, bitmap / device fonts, squarer chrome, and shared retro display primitives in **`components/ui/LcdChrome.tsx`**. Bitmap fonts come from **`@fontsource/press-start-2p`** and **`@fontsource/vt323`**.
- **iPhone install / standalone mode:** the app now includes App Router web-app metadata in **`app/layout.tsx`**, a standalone manifest in **`app/manifest.ts`**, and an Apple touch icon in **`app/apple-icon.png`** so iPhone users can use **Share → Add to Home Screen** and launch the Vercel app in standalone mode with Safari browser chrome removed. Remaining visible UI should be standard iOS system chrome rather than Safari controls.
- `/`, `/home`, `/session/[id]`, `/builder/[id]`, `/builder/new`, `/play/[id]`, `/edit/[sessionId]/[exerciseId]`, and `/exit` are present.
- **`lib/session-repository.ts`** resolves sessions: when Supabase is configured (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`), **list** and **get** read from the `session_definitions` table; otherwise the app falls back to **bundled sample sessions**. Rows are ordered by **`sort_order`** (then `title`); new rows get the next sort index on upsert.
- **`lib/session-draft.ts`** provides **`createNewSessionDraft()`** for **`/builder/new`** so that route does not import the `server-only` session repository (avoids fragile server chunks in dev).
- **`PUT /api/sessions`** upserts a validated `SessionDefinition` into Supabase (same table), preserving or assigning **`sort_order`**. The stored **`payload`** is passed through **`prepareSessionForPersistence`** (normalize empty exercise titles + emit **`1.2`** when **`coach`** is present). The builder’s **save to Supabase** action and the **adjust** screen’s **done** action call this route.
- **`PATCH /api/sessions/order`** accepts `{ session_ids: string[] }` (full ordered list, no duplicates) and updates **`sort_order`** for each row when Supabase is configured. Used by the home session list when drag-reorder is enabled.
- **`DELETE /api/sessions/[sessionId]`** removes the matching row from **`session_definitions`** when Supabase is configured. Used from **`/builder/[id]`** only (not **`/builder/new`**) after the user confirms in a modal.
- The builder is the most complete flow: structural editing, block-type conversion, import/export, schema validation, optional **delete session**, and a compact header: **save to Supabase** is shown only when the editor has **unsaved changes** (working copy differs from the last loaded or successfully saved snapshot). **validate**, **import JSON**, **export JSON**, and **delete session** live under a **settings cog** dropdown (with **lucide-react** icon controls for expand/collapse, reorder, and remove on stage/section/block/exercise rows). Builder and home both use the shared **`components/ui/CogIcon.tsx`** SVG for that cog.
- **`SessionList`** (**`/home`**): **settings cog** menu with **create new session** (**`/builder/new`**), **import JSON** (file → **`parseImportedSession`** then **`PUT /api/sessions`**), **paste JSON** (modal with textarea, **cancel** / **import**; validates then same **`PUT`**; errors listed with schema paths for correction), **copy JSON schema** (clipboard, transient **JSON schema copied** confirmation), a **skin selector** for switching between curated UI skins, and an **LCD tuning** overlay for the **`retro-lcd`** skin. LCD tuning is stored in Supabase as one shared global profile when configured, so retro display parameters stay aligned across devices. When drag reorder is enabled, the sortable DnD layer activates after hydration so the initial server render stays stable.
- Builder collapse state for sections, blocks, and exercises is UI-only and is not part of exported session JSON.
- **Session metadata:** optional **`description`** (multi-line, schema `maxLength` 2000) is documented in the JSON schema, edited in the builder (**session description** textarea), and shown on the **session detail** page when present.
- **Play mode:** the playback compiler emits **`exercise`**, **`rest`**, and **`circuit_time_play`** steps (no structural stage/section/block marker steps). Normal **exercise** steps with a **time** prescription use a **work countdown** (`mm:ss`) with **`[ start ]`**, **`[ pause ]` / `[ resume ]`**, **`[ complete ]`** (early exit), and **auto-advance at zero**; **`exercise`** steps with **reps** / **rep range** use **`[ complete ]`** only. **Rest** steps use a **live countdown** (`mm:ss`), auto-advance at zero, and skip. **← back** (under **← exit**) returns to the previous step when `index > 0`. **`circuit_time` blocks** compile to a **single `circuit_time_play` step**: a **block-level countdown** from `duration_seconds`, **`[ start ]`** before the clock runs, **`[ pause ]` / `[ resume ]`**, cycling **exercises** in order with **`[ complete ]`**; optional **per-exercise** `rest_after_seconds` shows an in-block rest timer (skip supported). While the block clock runs, time counts down during rests too. When time reaches **zero**, the UI shows **time up — finish this step**; the user **finishes the current exercise or rest**, then play **advances past the circuit** (no extra rest after time up if they were on an exercise). After the final plan step, a **completion splash** (CONGRATULATIONS / Session completed); **tap** navigates to **`/home`**.
- **Play resume and adjust:** **`/play/[id]?at=N`** (from the server, `N` clamped to a valid step index) restores the **playback step index** after leaving play. **Tap to adjust** links include **`returnStep`** so **done** on **`/edit/...`** can navigate back with **`?at=`**. **`AdjustScreen`** applies edits via **`applyExerciseAdjustments`** in **`lib/session-apply.ts`** (including supersets), validates, **`PUT`s** the full session, then returns to play. If Supabase returns **503**, a message is shown and play still resumes at **`?at=`** without persisting.
- **Timer persistence across adjust:** For **`circuit_time_play`** and plan-level **rest** steps, **sessionStorage** snapshots (keyed by session id, step index, and `step_id`) preserve **countdown and UI phase** when returning from adjust with **`?at=`**; opening **`/play/[id]`** without **`at`** clears those keys for a fresh run. A short **gate** runs before play UI mounts so clears happen before panels rehydrate.
- **Resume later / paused badge:** **`lib/session-pause-storage.ts`** stores **`{ v, at }`** in **`localStorage`** under **`workoutSessionPause:`** + **`session_id`**. Play’s **← exit** links to **`/exit?sessionId=…&at=planIndex`**. Completing a run (past the last step), **end session** on the exit sheet, or **Paused** / **cancel** on home clears the entry as appropriate.
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
- Theme and skin changes should stay token-driven and centralized in shared UI primitives
- The default identity remains calm and minimal, but alternate skins may adopt stronger character when done intentionally and consistently

## Visual skin system
- **Default skin:** **`minimal-dark`** keeps the original dark, sparse, typography-led interface.
- **Alternate skin:** **`retro-lcd`** is a full-app old-device interpretation with LCD glass texture, heavier divider rules, pixel / device typography, boxed transport controls, and squarer panel chrome.
- Skins should be selected from the **home** settings menu and persist per browser / device using **`localStorage`**.
- **Retro LCD tuning** should be edited from the **home** settings menu, apply live, and persist as a single shared Supabase-backed profile across devices when Supabase is configured. A local browser cache may be used as a temporary fallback.
- Large retro display headings should scale with viewport size and allow emergency intra-word wrapping so long all-caps titles do not crop inside the LCD frame on smaller devices.
- When **`retro-lcd`** is active, the outer app background should also carry a subtler animated LCD field (pixel grid / shimmer) so the area outside the main screen frame feels like the same device surface rather than flat empty space.
- iPhone home-screen installs should use the retro LCD kettlebell Apple icon and open the app in standalone mode via the web manifest / Apple web-app metadata.
- Shared semantic tokens live in **`app/globals.css`** and should remain the primary surface for future skin work. Shared skin-aware wrappers / primitives include **`PageShell`**, **`ActionButton`**, **`EditorPanel`**, and **`LcdChrome`**.

## Session model
Session structure:
- Session
- Stage
- Section
- Block
- Exercise

Supported concepts:
- optional session-level **description** (goals, focus, equipment; for authors and AI-generated metadata)
- optional per-exercise **`coach`** (short prose for form, tempo, or holds), validated by schema when present
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
7. `/exit?sessionId=...&at=N` — Exit session sheet (`N` = current playback step index for resume / cancel)
8. Root `/` should redirect to `/home`

### API (server)
- **`PUT /api/sessions`** — body: full `SessionDefinition` JSON; validates against the canonical schema; upserts into Supabase when configured (including **`sort_order`**). Used by the builder **save to Supabase**, **adjust / done**, and the **home** list **import JSON** (file) and **paste JSON** (modal) flows after client-side **`parseImportedSession`**.
- **`PATCH /api/sessions/order`** — body: `{ session_ids: string[] }` (every session exactly once, no duplicates); updates **`sort_order`** by array index. Used by the home list when Supabase is configured.
- **`DELETE /api/sessions/[sessionId]`** — deletes the row with that **`session_id`** from Supabase when configured. Used by the builder **delete session** flow after confirmation.
- **`GET /api/lcd-tuning`** — returns the global retro LCD tuning payload (or defaults when no profile exists yet). Used for shared device-consistent LCD presentation.
- **`PUT /api/lcd-tuning`** — body: `LcdTuningValues`; normalizes and upserts the singleton global retro LCD tuning profile in Supabase when configured.

### Web app install metadata
- **`app/manifest.ts`** serves **`/manifest.webmanifest`** with **`display: 'standalone'`**, **`start_url: '/home'`**, **`scope: '/'`**, theme/background colors, and icon metadata for installable web-app behavior.
- **`app/layout.tsx`** exports Apple web-app metadata (`appleWebApp`, `manifest`, and viewport theme color) so iPhone home-screen launches use standalone presentation when opened from the installed icon.
- **`app/apple-icon.png`** is the Apple touch icon asset for iPhone home-screen installs and should remain an opaque **180×180** PNG.

## Screen requirements

### 1. Home / Sessions
Purpose:
- show sessions
- create new session
- jump to a session detail page
- reorder sessions when persisted to Supabase
- choose a UI skin

UI:
- session title
- duration + tags/meta in muted text
- subtle row layout
- no dashboard stats
- when Supabase is configured: **drag handle** per row (**@dnd-kit**, vertical list); row body remains a link to session detail
- **settings cog** (same icon as the session builder) opens a dropdown with **create new session**, **import JSON**, **paste JSON**, **copy JSON schema**, a **skin selector**, and when **`retro-lcd`** is active an **LCD tuning** overlay; click-outside and **Escape** close the menu. **Paste JSON** opens a modal (backdrop / **Escape** / **cancel** closes): large textarea, **import** runs validation then **`PUT /api/sessions`**; failures show a bulleted list of messages (including JSON Schema paths from `parseImportedSession` or API errors).

Primary interactions:
- tap row -> Session Detail
- **create new session** (under settings) -> Session Builder (**`/builder/new`**)
- **import JSON** (under settings): pick a file; client validates with `parseImportedSession`, then **`PUT /api/sessions`** upserts into Supabase when configured (same as builder save). If Supabase is not configured (**503**), use the builder **settings → import JSON** to load a draft client-side only.
- **paste JSON** (under settings): modal to paste AI-generated (or any) session JSON; **cancel** aborts; **import** validates and uploads like file import; errors are listed explicitly for correction.
- **copy JSON schema** (under settings): copies canonical schema for use with external tools (e.g. AI-generated session JSON for later import)
- drag handle -> reorder list; order **PATCH**ed to Supabase
- **skin selector** (under settings): switches the active UI skin immediately and persists it locally for future visits
- **LCD tuning** (under settings, retro skin only): updates the retro display live and saves the tuning to a shared global Supabase profile so the same LCD parameters load on other devices
- **Paused run (local only):** if the user chose **resume later** on the exit sheet, **`localStorage`** holds a snapshot for that **`session_id`** (step index). On the list, **Paused** opens **`/play/[id]?at=…`**, clears that snapshot, and starts from the saved step; **cancel** (next to **Paused**) clears the snapshot only and does not navigate. Other tabs can update the badge via the **`storage`** event.

### 2. Session Detail / Preview
Purpose:
- inspect session contents before starting
- start session
- open the builder
- duplicate session later

UI:
- session title
- duration and tags (and optional **description** body copy when `description` is set—multi-line, prose style)
- visible stage -> section -> exercise structure; each **block** line shows a short **structure hint** after the title (e.g. **4 rounds** for `circuit_rounds`, set counts for straight sets / supersets, EMOM minutes, timed circuit duration) so repeats are obvious before play (**coach** cues are not shown here; they appear in play only)
- start session action
- edit / duplicate secondary actions

### 3. Session Builder
Purpose:
- create a new session or structurally edit an existing one
- update stages, sections, blocks, exercises, prescriptions, load, and rest settings
- import and export valid JSON
- edit optional **session description** (multi-line) for targeting / context
- delete an existing session from Supabase when editing **`/builder/[id]`** (with confirmation)

UI:
- `← session` or `← sessions`
- header: **`save to Supabase`** (primary) only when there are **unsaved edits**; **settings cog** opens a dropdown with **validate**, **import JSON**, **export JSON**, and (on **`/builder/[id]`** only) **delete session** (warning-styled); click-outside and **Escape** close the menu
- session metadata: title, id, **session description** (textarea), duration, tags; **save to Supabase** when API and env are configured
- visible stage -> section -> block -> exercise tree
- structured editing controls rather than raw JSON by default
- lightweight `+ add exercise`, `+ add block`, `+ add section`, `+ add stage`
- remove and reorder controls at each structural level (icon buttons: chevron expand/collapse, arrows for move up/down, trash for remove; accessible names via `aria-label`)
- block-type switching for flow, straight sets, circuit rounds, timed circuits, supersets, and EMOM
- collapsible toggles for sections, blocks, and exercises so the tree can compress to title-only rows
- per-exercise optional **coach / form cue** (textarea) for cues and timing
- **delete session** (existing sessions only): modal warns that the session is removed from Supabase permanently; on success, navigate to **`/home`**

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
- prescription line (`10 reps @ 16 kg` or `30s` for time)
- when **`coach`** is set on the exercise, muted prose under the prescription (after **tap to adjust**)
- **Reps / rep range:** one primary action `[ complete ]` to advance
- **Time prescription:** large **`mm:ss`** countdown; **`[ start ]`** begins the work timer; **`[ pause ]` / `[ resume ]`** while running; **`[ complete ]`** always available to finish early; at **zero** (while running, not paused), brief **time up** copy then **auto-advance** to the next plan step (same idea as rest). Timer state is snapshotted to **`sessionStorage`** under the same **`playTimer:`** key pattern as rest when returning from adjust with **`?at=`** (invalid snapshot if prescription seconds changed is ignored).
- persistent `next` preview
- subtle hint that tapping the prescription opens adjust mode
- when **`retro-lcd`** is active, the play screen should lean into a more device-like composition: prominent timer / metric regions, stronger divider rules, boxed transport controls, and pixel / device typography while preserving the same workout behavior

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

Entry: **`/exit?sessionId=…&at=N`** where **`N`** is the current plan step index (from play’s **← exit** link).

UI:
- `exit session?`
- **`resume later`** — writes the paused snapshot to **`localStorage`** for this session, then navigates to **`/home`** (list shows **Paused** for that session).
- **`end session`** — removes any paused snapshot for this session, then navigates to **`/home`**.
- **`cancel`** — navigates back to **`/play/[sessionId]?at=N`** without writing or clearing pause state (same as closing the sheet without choosing resume/end).

**Note:** **cancel** here returns to play. **cancel** on the home list (next to **Paused**) only clears the saved pause and stays on **`/home`**.

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
- Table **`lcd_tuning_profiles`**: singleton-style retro LCD tuning storage keyed by **`profile_key`** (see **`supabase/lcd_tuning_profiles.sql`**). The app uses the **`global`** row for shared cross-device LCD parameters.

## Implementation notes
- Use sample local JSON when Supabase is not configured
- Use **`session-repository`** for list/get; optional Supabase-backed persistence, **`PUT /api/sessions`** for saves from the builder and adjust flow, **`PATCH /api/sessions/order`** for home list order, and **`DELETE /api/sessions/[sessionId]`** for builder delete
- Use provided TypeScript types as source of truth in code
- Use provided JSON schema as canonical import/export contract
- Compile nested session structure into a flat playback plan before rendering play mode
- Keep the play UI very light; state changes are more important than decorative UI
- Builder UI should stay text-led and sparse, with minimal borders
- Keep theming token-driven so future reskinning happens mostly in shared UI and theme layers
- Apply skins globally through **`html[data-skin]`** and semantic CSS variables rather than route-by-route hardcoded colors
- Use shared UI primitives for editor shells and actions where possible (e.g. **`CogIcon`** for builder and home settings menus, and **`LcdChrome`** for retro LCD display chrome)

## Current builder status
- `SessionBuilder` currently supports:
- session title, id, **session description** (multi-line textarea), duration, and tags editing
- header **save to Supabase** only when **dirty** (JSON snapshot differs from baseline after load or last successful save); **validate** + **import** / **export** / **delete** (when allowed) via **cog** menu
- **delete session** on **`/builder/[id]`** only: confirmation modal, then **`DELETE /api/sessions/[sessionId]`**, then **`/home`**
- **save to Supabase** (via `PUT /api/sessions`) when environment variables are set
- stage, section, block, and exercise add/remove/reorder flows
- block-type conversion with block-shape-aware controls
- superset pair editing
- JSON import, schema validation, and JSON export
- collapsible sections, blocks, and exercises
- Unsaved edits remain client-side until the user saves to Supabase or exports JSON; a successful **save to Supabase** clears the dirty baseline so the save action hides until the next edit

## Known gaps
- No session **duplication** workflow yet (detail page control is still inert)
- No **run history** or durable in-progress playback state across devices (step index and timers use URL + **sessionStorage** only for the adjust round-trip)
- When Supabase is not configured, adjust **done** cannot persist edits; home list **drag reorder** and builder **delete session** are unavailable (API returns **503**); only sample/fallback sessions are available for list/detail/play unless JSON is imported elsewhere

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
