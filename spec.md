# Workout App Spec

## Goal
Build a minimal dark-mode workout app for creating, previewing, editing, and running structured workout sessions defined by JSON.

The product should feel like a calm instrument rather than a generic fitness app.

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
- export valid JSON later

UI:
- `← session` or `← sessions`
- session title and summary
- visible stage -> section -> block -> exercise tree
- tap lines to edit inline
- lightweight `+ add exercise`, `+ add block`, `+ add section`, `+ add stage`
- save action and optional duplicate action

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

## Implementation notes
- Use sample local JSON first
- Use provided TypeScript types as source of truth in code
- Use provided JSON schema as canonical import/export contract
- Compile nested session structure into a flat playback plan before rendering play mode
- Keep the play UI very light; state changes are more important than decorative UI
- Builder UI should stay text-led and sparse, with minimal borders

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
- lightweight builder state helpers for add / edit / remove operations
- playback compiler
- minimal playback state
- rest handling
- edit exercise flow
- exit session confirmation flow

Do not add analytics dashboards, streaks, charts, or extra gamification.
