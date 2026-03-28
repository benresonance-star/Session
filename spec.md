# Workout App Spec

## Goal
Build a minimal dark-mode workout app for creating, previewing, editing, and running structured workout sessions defined by JSON.

The product should feel like a calm instrument rather than a generic fitness app.

## Current implementation snapshot
- The app runs on Next.js App Router with React and Tailwind.
- `/`, `/home`, `/session/[id]`, `/builder/[id]`, `/builder/new`, `/play/[id]`, `/edit/[sessionId]/[exerciseId]`, and `/exit` are present.
- Routes currently resolve against local seeded session data through a small repository layer.
- The builder is now the most complete flow in the app and supports structural editing, block-type conversion, import/export, and schema validation.
- Builder collapse state for sections, blocks, and exercises is UI-only and is not part of exported session JSON.
- Persistence, run history, and post-run mutation workflows are still future work.

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

## Screen requirements

### 1. Home / Sessions
Purpose:
- show sessions
- create new session
- jump to a session detail page

UI:
- session title
- duration + tags/meta in muted text
- subtle row layout
- no dashboard stats

Primary interactions:
- tap row -> Session Detail
- tap `+ new session` -> Session Builder (new)
- optional import JSON action

### 2. Session Detail / Preview
Purpose:
- inspect session contents before starting
- start session
- open the builder
- duplicate session later

UI:
- session title
- duration and summary
- visible stage -> section -> exercise structure
- start session action
- edit / duplicate secondary actions

### 3. Session Builder
Purpose:
- create a new session or structurally edit an existing one
- update stages, sections, blocks, exercises, prescriptions, load, and rest settings
- import and export valid JSON

UI:
- `← session` or `← sessions`
- session title and summary
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

UI:
- top line: `← exit`, stage / section context, progress
- large exercise title
- prescription line (`10 reps @ 16 kg`)
- one primary action `[ complete ]`
- persistent `next` preview
- subtle hint that tapping the prescription opens adjust mode

### 5. Play / Rest
Purpose:
- show countdown and next exercise

UI:
- `rest`
- large countdown
- next exercise preview
- optional skip action

### 6. Edit Exercise
Purpose:
- adjust current exercise values during a session
- return cleanly to play mode

UI:
- `← back`
- exercise title
- direct manipulation controls for reps / time / load
- `done` action

### 7. Exit Sheet
Purpose:
- safely leave a session

UI:
- `exit session?`
- `resume later`
- `end session`
- `cancel`

## Data architecture
- `SessionDefinition`: authoring / import-export format
- `NormalizedSessionDefinition`: compile-time normalized representation
- `PlaybackPlan`: flattened runtime plan
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

## Implementation notes
- Use sample local JSON first
- Use a small local repository layer for seeded session resolution before persistence exists
- Use provided TypeScript types as source of truth in code
- Use provided JSON schema as canonical import/export contract
- Compile nested session structure into a flat playback plan before rendering play mode
- Keep the play UI very light; state changes are more important than decorative UI
- Builder UI should stay text-led and sparse, with minimal borders
- Keep builder theming token-driven so future reskinning happens mostly in shared UI and theme layers
- Use shared UI primitives for editor shells and actions where possible

## Current builder status
- `SessionBuilder` currently supports:
- session title, id, description, duration, and tags editing
- stage, section, block, and exercise add/remove/reorder flows
- block-type conversion with block-shape-aware controls
- superset pair editing
- JSON import, schema validation, and JSON export
- collapsible sections, blocks, and exercises
- Builder edits are currently local to the client session; persistence is not implemented yet

## Known gaps
- No durable save/persistence layer yet
- No session duplication workflow yet
- Play mode and adjust flow still need deeper runtime state work to match the builder’s sophistication
- There is no authored-session storage backend yet; seeded local sessions remain the route source of truth

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
