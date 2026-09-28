# TooSuePha Part 5 Lender Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the lender path from managing listings through fulfillment, return inspection, cleaning, earnings release, and renewed availability.

**Architecture:** Add pure lender selectors that derive operational queues, listing schedules, and ledger-backed balances from the existing state. Keep only My Listings and Rental Requests routes, place summary information above them, and reuse the same booking detail data without introducing a duplicate dashboard store or seller account.

**Tech Stack:** HTML, `toosuepha.css`, JavaScript modules, IndexedDB repository, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-28-toosuepha-parts-4-5-design.md`

## Global Constraints

- Frontend-only; no backend, API, database service, authentication, real payment, chat, review, or carrier integration.
- Keep one account for renter and lender roles.
- Keep only `#closet/listings` and `#closet/requests` inside My Closet; do not add a duplicate dashboard or earnings route.
- Derive availability and earnings from bookings and ledger entries already stored in IndexedDB.
- Preserve 3D Studio, Fit Match, existing listings, historical orders, and the 15 clothing assets.
- Commit and push Part 5 only after Part 4 is deployed and verified; never force-push.

## Review Focus

- Multiple bookings for the same listing but different variants or non-overlapping dates must produce the correct schedule.
- The lender must never see or action another lender’s booking, ledger entry, or listing.
- A refunded booking must reduce pending earnings once and never create available earnings.
- An inspection retry must not release escrow twice.
- Pausing or deleting a listing must preserve its booking history, snapshots, tracking, and earnings entries.

---

### Task 1: Lender presentation model

**Files:**
- Create: `lender-presenter.js`
- Create: `tests/lender-presenter.test.mjs`

**Interfaces:**
- Consumes: normalized state, seller id, and current date.
- Produces: `lenderSummary(state, sellerId, now)`, `lenderBookingBuckets(state, sellerId)`, `lenderNextAction(booking, sellerId)`, `listingRentalSchedule(state, sellerId, listingId)`, and `lenderLedgerRows(state, sellerId)`.

- [ ] Write failing tests for multiple listings/bookings, variant-specific date ranges, urgent action ordering, wrong sellers, refunds, releases, legacy bookings, paused/deleted listings, and repeated inspection history.
- [ ] Run `node --test tests/lender-presenter.test.mjs`; expect failure because the module does not exist.
- [ ] Implement pure selectors. Prioritize return intake/inspection before outbound fulfillment, then chronological start date; derive balances only from ledger types.
- [ ] Exclude cancelled bookings from occupied ranges, retain completed history, and return one lender action descriptor or `null`.
- [ ] Run the presenter tests and expect all cases to pass.

### Task 2: My Listings management surface

**Files:**
- Modify: `app.js`
- Modify: `toosuepha.css`
- Modify: `tests/navigation.test.mjs`

**Interfaces:**
- Consumes: `lenderSummary` and `listingRentalSchedule`, plus existing listing transitions and listing editor.
- Produces: SVG-language listing overview cards with availability and management actions.

- [ ] Add failing UI tests for overview counts, per-size availability, nearest booked range, edit, pause/resume, remove, and the absence of a separate dashboard route.
- [ ] Render summary cards for active listings, bookings requiring action, currently rented units, pending earnings, and available earnings.
- [ ] Replace generic listing rows with cards showing photo, category, active/paused state, variant badges, next occupied range, and existing management actions.
- [ ] Keep the existing listing wizard and measurements. After publish/edit, return to `#closet/listings` and refresh the derived schedule.
- [ ] Add responsive styles using the established header, card, border, spacing, typography, and button tokens.
- [ ] Run `node --test tests/navigation.test.mjs tests/lender-presenter.test.mjs`; expect all tests to pass.

### Task 3: Rental Requests operations and earnings trace

**Files:**
- Modify: `app.js`
- Modify: `toosuepha.css`
- Modify: `tests/navigation.test.mjs`
- Modify: `tests/rental-checkout.test.mjs`

**Interfaces:**
- Consumes: `lenderBookingBuckets`, `lenderNextAction`, and `lenderLedgerRows`.
- Produces: one operational booking queue, status filters, mock earnings trace, and existing lifecycle actions.

- [ ] Add failing tests for “ต้องทำตอนนี้”, “กำลังดำเนินการ”, and “ประวัติ” buckets; payment/escrow labels; status filters; tracking; and one visible lender action per booking.
- [ ] Render action-first booking cards with renter, items, date range, total, payment, escrow, and two tracking legs; keep full details expandable in the same route.
- [ ] Bind prepare, outbound tracking, simulated transit, return receipt, inspection, and cleaning actions only from `lenderNextAction`.
- [ ] Render pending/available earnings and ledger rows tied to booking ids. Label every monetary value as Mock Payment/Escrow.
- [ ] Verify failed inspection stays in the action queue, successful inspection releases once, completion moves to history, and the listing schedule becomes available after the booked range.
- [ ] Run `node --test tests/lender-presenter.test.mjs tests/rental-checkout.test.mjs tests/navigation.test.mjs`; expect all tests to pass.

### Task 4: Part 5 end-to-end regression, documentation, commit, and deployment

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Create: `outputs/PART-5-QA.md`

**Interfaces:**
- Consumes: completed renter and lender workflows.
- Produces: final Phase 1 QA evidence and continuation notes.

- [ ] Run `npm test`, syntax-check every top-level JavaScript file, and run `git diff --check`; require zero failures.
- [ ] Browser-test list → paid booking → prepare → ship → renter receives → return → lender receives → inspect → clean → earnings available → listing available again.
- [ ] Test two accounts, multiple sellers, multiple bookings, same-variant date collision, cancellation/refund, failed inspection/retry, reload, and two-tab synchronization.
- [ ] Check My Listings and Rental Requests at 1440×900, 1280×1005, 1024×768, 390×844, and 360×800 with keyboard/focus/overflow checks.
- [ ] Re-run Marketplace, Product, Try-on, My Rentals, Saved, listing wizard, and 3D Studio regressions; verify all 15 Studio assets and one WebGL canvas.
- [ ] Record exact results and limitations in `outputs/PART-5-QA.md`; update README/AGENTS for the final Phase 1 renter/lender flow.
- [ ] Commit with `feat: complete lender rental operations` and push `main` to `Mindiee/cosplay`.
- [ ] Verify remote SHA and the Vercel renter/lender end-to-end path before reporting completion.
