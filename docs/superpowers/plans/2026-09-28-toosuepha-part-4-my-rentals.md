# TooSuePha Part 4 My Rentals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn My Rentals into a complete renter status, next-action, tracking, payment, and detail experience without changing the existing rental transaction model.

**Architecture:** Add pure presentation selectors for booking phase, timeline, urgency, and renter actions; keep all mutations in `transitionCosplay`. Render an overview at `#rentals` and one detail at `#rental/:id`, using the current TooSuePha SVG-derived design system and immutable booking snapshots.

**Tech Stack:** HTML, `toosuepha.css`, JavaScript modules, IndexedDB repository, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-28-toosuepha-parts-4-5-design.md`

## Global Constraints

- Frontend-only; no backend, API, database service, authentication, real payment, chat, review, or carrier integration.
- Keep the current account model, IndexedDB key, 3D Studio, mannequin state, 15 clothing assets, and legacy booking history.
- `index.html` continues to load only `toosuepha.css`; do not re-enable legacy stylesheets.
- Use the existing SVG-derived tokens. No new visual theme or page family.
- Commit and push Part 4 before starting Part 5; never force-push.

## Review Focus

- A multi-item booking must show every item while using one seller/date/payment summary.
- Legacy `pending`/`confirmed` records must render without missing `items`, tracking, payment, or escrow fields.
- A booking owned by another account must not expose renter actions or its detail.
- Missing body or garment measurements must show an unavailable Fit Match instead of a guessed percentage.
- Reload, account switching, and cross-tab updates must preserve the current booking status and avoid duplicate WebGL instances.

---

### Task 1: Booking presentation model

**Files:**
- Create: `rental-presenter.js`
- Create: `tests/rental-presenter.test.mjs`

**Interfaces:**
- Consumes: normalized booking records, actor id, current date, and optional body measurements.
- Produces: `rentalPhase(booking)`, `rentalTimeline(booking)`, `renterNextAction(booking, actorId)`, `rentalUrgency(booking, now)`, and `rentalFitSummary(booking, body)`.

- [ ] Write failing tests covering every modern status, cancelled history, `pending`/`confirmed` legacy records, pickup/return boundary dates, wrong actors, multi-item bookings, and incomplete measurements.
- [ ] Run `node --test tests/rental-presenter.test.mjs`; expect failures because the module does not exist.
- [ ] Implement pure selectors. Map modern states into `receive`, `rent`, `return`, or `complete`; return one action descriptor or `null`; never mutate the booking.
- [ ] Calculate secondary Fit Match from each item’s snapshot measurements using `calculateFitMatch`; return `null` when category, target length, body, or required measurements are absent.
- [ ] Run the presenter tests and expect all cases to pass.

### Task 2: Preserve Fit inputs in new booking snapshots

**Files:**
- Modify: `cosplay-domain.js`
- Modify: `tests/rental-checkout.test.mjs`

**Interfaces:**
- Consumes: the selected listing and variant at `rental.checkout`.
- Produces: immutable snapshot fields `category`, `lengthTarget`, and `measurements` for Part 4 selectors.

- [ ] Add a failing checkout assertion for the new snapshot fields and confirm the original listing can change afterward without changing the booking snapshot.
- [ ] Extend checkout snapshot creation with cloned category, length target, and measurements; keep old booking normalization compatible.
- [ ] Run `node --test tests/rental-checkout.test.mjs tests/rental-presenter.test.mjs`; expect all tests to pass.

### Task 3: My Rentals overview and booking detail

**Files:**
- Modify: `app.js`
- Modify: `toosuepha.css`
- Modify: `tests/navigation.test.mjs`

**Interfaces:**
- Consumes: Part 4 presenter selectors and existing `run()` transitions.
- Produces: `#rentals` overview and `#rental/:id` detail with receive/return timeline and the current renter action.

- [ ] Add failing navigation/static UI tests for active/history sections, booking detail route, two timelines, mock payment/escrow labels, and the absence of separate Receive/Return routes.
- [ ] Replace the shared generic rental card on the renter side with an overview card showing status, next action, date range, total, and a detail link.
- [ ] Replace `confirmationPage` with a renter-owned booking detail renderer; retain a success banner for a newly created booking but use the same page structure.
- [ ] Render item snapshots, tracking legs, payment/escrow state, secondary Fit Match, and timeline states. Bind only the action descriptor returned by `renterNextAction`.
- [ ] Add SVG-language styles for the overview, progress rail, detail summary, item list, and compact mock labels at desktop, tablet, 390 px, and 360 px.
- [ ] Run `node --test tests/navigation.test.mjs tests/rental-presenter.test.mjs tests/rental-checkout.test.mjs`; expect all tests to pass.

### Task 4: Part 4 regression, documentation, commit, and deployment

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Create: `outputs/PART-4-QA.md`

**Interfaces:**
- Consumes: the completed Part 4 UI and domain snapshots.
- Produces: reproducible QA evidence and the handoff contract for Part 5.

- [ ] Run `npm test`, syntax-check every top-level JavaScript file, and run `git diff --check`; require zero failures.
- [ ] Browser-test checkout → My Rentals → detail → receive → prepare return → ship return, including reload and account switching.
- [ ] Check 1440×900, 1280×1005, 1024×768, 390×844, and 360×800 for overflow, focus, keyboard operation, and one WebGL canvas on 3D pages.
- [ ] Verify the original 15 Studio items and all Part 1–3 routes still work.
- [ ] Record exact commands and results in `outputs/PART-4-QA.md`; update README/AGENTS to describe the delivered route and selectors.
- [ ] Commit with `feat: complete renter rental tracking experience` and push `main` to `Mindiee/cosplay`.
- [ ] Verify the remote SHA and Vercel Home, My Rentals, booking detail, and 3D Studio before beginning Part 5.
