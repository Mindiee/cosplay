# TooSuePha Parts 4–5 Design

## Intent

Part 4 completes the renter’s post-checkout experience. Part 5 completes the lender’s listing, fulfillment, return, and earnings experience. Both parts use the atomic rental state delivered in Part 2 and the TooSuePha visual shell delivered in Part 3.

The implementation remains frontend-only. It reuses the existing IndexedDB repository, account model, listing data, booking transitions, 3D Studio, mannequin profiles, and the 15 clothing assets.

## Visual source

The supplied archive contains SVG frames for Home, Marketplace, Product Detail, Virtual Try-On, and 3D Studio. It does not contain a My Rentals or Lender frame. Parts 4–5 therefore reuse the exact design tokens and component language already extracted from those SVGs: 81 px desktop header, 24 px page inset at 1280 px, Arial/Noto Sans Thai typography, white cards, `#e5e5e5` borders, 12 px radii, black primary actions, and the established compact icon style. No legacy stylesheet is re-enabled.

## Part 4: My Rentals

`#rentals` is the renter’s overview. It shows each booking’s current phase, date range, total, tracking summary, and one clear next action. It separates active bookings from completed or cancelled history without creating separate Receive and Return pages.

`#rental/:id` is the booking detail. It contains:

- Receive timeline: paid → preparing → outbound shipped → outbound transit → received.
- Return timeline: renting → return preparation → return shipped → return received → inspection → cleaning → completed.
- All items and size snapshots in that seller booking.
- Pickup/return dates, inclusive day count, daily price, total, mock payment state, and escrow state.
- Outbound and return tracking, when present.
- Fit Match as secondary information, calculated from the current saved mannequin and the immutable garment measurement snapshot. Missing measurements show “ยังประเมินไม่ได้”.
- Only the action allowed for the current renter and status.

Historical `pending` and `confirmed` bookings remain visible with a legacy label and legacy actions. Cancelled bookings remain in history and never appear as active.

## Part 5: Lender workspace

`#closet/listings` remains My Listings and `#closet/requests` remains Rental Requests. No separate seller account, dashboard route, or earnings route is added.

My Listings contains a compact overview followed by listing cards. Each card shows active/paused state, available size variants, the nearest blocked rental range, and actions to edit, pause/resume, or remove. Booking date ranges are read from existing paid or later bookings; availability is not duplicated into a second store.

Rental Requests is the operational queue. It groups bookings into “ต้องทำตอนนี้”, “กำลังดำเนินการ”, and “ประวัติ”, and supports status filtering. Every card shows renter, date range, items, payment/escrow state, tracking summary, and the single allowed lender action.

Pending and available earnings are summary values from the existing immutable ledger. The workspace also shows the related hold, release, or refund entries so amounts can be traced to a booking. Return inspection releases escrow once; repeated actions remain blocked by the domain.

## Shared rules

- A single account can rent and lend.
- Booking status and monetary state come from IndexedDB; the UI does not invent local duplicates.
- Product snapshot data remains immutable after checkout.
- Receive and Return use one booking detail route.
- Payment, tracking, escrow, and balances are explicitly labelled as mock data.
- Sale, real payment, backend, API, authentication, chat, review, and real carrier integration remain out of scope.
- Desktop, tablet, and mobile layouts must preserve the same information and actions without horizontal overflow.

## Completion gates

Each Part is implemented, regression-tested, committed, pushed to `Mindiee/cosplay` `main`, verified by remote SHA, and checked on the Vercel deployment before the next Part starts.
