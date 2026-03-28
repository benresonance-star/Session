# Workout App Repo

Minimal dark-mode workout app starter built for Cursor.

## Included
- Next.js App Router starter
- TypeScript domain types
- Session definition JSON schema v1.1
- Sample session JSON
- UI routes:
  - Home / Sessions
  - Session Detail
  - Play / Exercise
  - Play / Rest
  - Edit Exercise
  - Exit Sheet
- Basic playback compiler and reducer-style state helpers
- `spec.md` with implementation guidance and Cursor prompt

## Run
```bash
npm install
npm run dev
```

## Design constraints
- No cards, gradients, or heavy shadows in the app UI
- Typography-led layout
- One primary action per screen
- Persistent next-exercise preview
- Tap exercise/prescription to adjust
- Session Builder for structural editing

## Notes
This repo is intentionally minimal and uses local sample data. It is designed to be extended in Cursor with persistence, session runs, mutation proposals, and variants.
