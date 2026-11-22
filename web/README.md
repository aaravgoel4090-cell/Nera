# Nera — Timetable Management Game

React + TypeScript + Vite build of Nera. The timetable is the whole game: take incoming tasks, schedule them without overlap, and keep Nera's stats from hitting breaking point. You cannot really win — the system ramps until it is mathematically impossible. The ending is the pivot: Nera walks away to learn CS, research Indian education, and build with Hack Club.

## Run

```bash
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

Static output is written to `web/dist/`.

## Implemented rules

- Continuous clock: one week per 280s; if the current day is ≥90% packed, 14s per week.
- School Mon–Fri 08:00–14:00, one per day. Coaching Mon–Sat 16:00–19:00, one per day.
- Holidays: school 1/15, coaching 1/45, generated per week from a seeded RNG.
- Attendance = school days attended / school days held. Below 75% loses school and maxes stress.
- Skipping coaching makes all task effects harder (×1.5), compounding with a weekly ramp.
- Sleep: minimum 6h/day; 8–10h grants +15 energy and +15 focus. Sleep and free time stretch to fill the gap they are dropped into.
- Tasks have stat costs, requirements, deadlines and predefined names. Missing a deadline spikes stress; unmet requirements send a task back to to-do if time remains, otherwise it fails.
- Hover any task to see its exact stat effects and requirements.
- Intro and ending use 3-second non-interactive video placeholders.

## Structure

- `src/simulation/` — pure engine, clock, scheduler, placement, holidays, attendance, difficulty, stats, task generation
- `src/types/` — shared TypeScript types
- `src/hooks/useGame.ts` — animation-frame loop driving the engine
- `src/components/` — UI panels, cards, cutscene and ending
- `src/styles/` — design tokens and global layout

## Tuning knobs

Failure stress, sleep bonus, holiday odds, task counts and deadline slack are constants in `src/simulation/`. The GDD is still a work in progress, so these are deliberately easy to change.
