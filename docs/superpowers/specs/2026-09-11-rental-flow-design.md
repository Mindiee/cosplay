# CLOSET Frontend Rental Flow Design

**Date:** 2026-09-11  
**Status:** Approved design direction, ready for implementation planning

## Goal

Convert the current buyer and seller journey from one-time purchases into a frontend-only cosplay rental demo while preserving the existing marketplace, search and filters, saved items, listing management, and 3D Studio.

The complete demo journey is:

Marketplace → Product Detail → choose size → choose pickup and return dates → review price → create rental request → view My Rentals → seller views Rental Requests → seller confirms → buyer sees confirmed status.

All data stays in the existing browser-side state and IndexedDB repository. No backend, remote database, API, payment, delivery tracking, chat, review, or production booking infrastructure will be introduced.

## Product Behavior

### Marketplace and product detail

Marketplace cards continue to use the existing catalog, search, filters, favorites, and 3D entry points. User-facing copy changes from selling and buying to renting:

- `Buy Now` / `ซื้อ` becomes `เช่าชุดนี้`.
- Prices are shown as rental prices per day, for example `฿450 / วัน`.
- `Quick Listing` / `ลงขาย` becomes `ลงชุดให้เช่า`.
- Listing forms label each variant price as `ราคาเช่าต่อวัน`.

Product Detail keeps the current gallery, defect information, seller details, size selection, and Try On action. The rental form adds:

- size variant selection;
- pickup date;
- return date;
- inclusive rental-day count;
- daily price;
- total rental price;
- a final `เช่าชุดนี้` button.

The return date may be the same as the pickup date, which counts as one rental day. Both dates must be valid calendar dates, pickup must be today or later, and return must be on or after pickup.

### 3D Studio

The 3D Studio, its mannequin models, garment models, camera controls, fit logic, tailoring controls, catalog rail, and saved studio outfit remain intact. Only the commerce action changes:

- the current purchase button becomes a rental button;
- it opens the same rental form for the active garment/listing;
- after booking, the user can navigate to My Rentals.

No My Mannequin page is reintroduced and no 3D implementation is removed or replaced.

### Buyer journey

When the buyer confirms the rental form, the app validates the listing, selected variant, dates, and availability using the latest state. It creates a rental booking with status `pending` and routes to a confirmation view that shows the saved booking details.

My Closet replaces `Purchases` with `My Rentals`. It shows bookings where the active profile is the renter, including costume, size, dates, number of days, daily rate, total, seller, creation time, and status.

Status labels are:

- `pending` → `รอยืนยัน`
- `confirmed` → `ยืนยันแล้ว`

The buyer cannot confirm their own request and cannot rent their own listing.

### Seller journey

My Closet replaces `Sold` with `Rental Requests`. It shows bookings for listings owned by the active seller. Pending requests have a `ยืนยันการเช่า` action.

Confirmation validates seller ownership and availability again using the latest state. If another confirmed rental now overlaps the same listing and size variant, confirmation is rejected and the request stays pending. A successful confirmation records `confirmedAt`, changes status to `confirmed`, persists the state, and becomes visible to the buyer after account switching or cross-tab state refresh.

The existing Earnings purchase total is removed from the active rental MVP navigation because the demo has no payment or completed-rental lifecycle. Existing order history remains stored and untouched.

## State and Persistence

### Rental booking record

A new top-level `rentals` collection is added to the existing cosplay state. Each record contains:

```js
{
  id,
  listingId,
  variantId,
  renterId,
  sellerId,
  size,
  pickupDate,       // YYYY-MM-DD calendar date
  returnDate,       // YYYY-MM-DD calendar date
  dailyPrice,
  rentalDays,
  totalPrice,
  status,           // "pending" | "confirmed"
  createdAt,
  confirmedAt,      // null until confirmed
  listingSnapshot: {
    title,
    character,
    image,
    sellerName
  }
}
```

`dailyPrice`, `rentalDays`, `totalPrice`, size, and listing display data are snapshots. Later listing edits do not rewrite a booking.

The existing `sizeVariants[].price` field remains in use and is interpreted by rental UI as the daily rental price. This avoids changing every catalog and listing serializer solely to rename a numeric property.

### Migration and compatibility

The repository normalizes older browser state by adding `rentals: []` when absent. Existing `orders`, listings, profiles, favorites, and 3D Studio state are retained. Purchase history is not converted into rentals and is no longer exposed in the main rental navigation.

The current IndexedDB repository remains the source of truth. Existing repository dispatch and BroadcastChannel synchronization persist rental changes and propagate them between tabs. No localStorage-only parallel source of truth is added.

## Pricing and Date Rules

Rental days use inclusive calendar-day arithmetic:

```text
rentalDays = differenceInCalendarDays(returnDate, pickupDate) + 1
totalPrice = dailyPrice × rentalDays
```

Dates are parsed from their `YYYY-MM-DD` components rather than from UTC timestamps so Bangkok-local calendar dates do not shift across time zones or daylight rules.

Examples:

- Pickup 11 Sep, return 11 Sep = 1 day.
- Pickup 11 Sep, return 13 Sep = 3 days.
- At ฿450/day for 3 days, total = ฿1,350.

The calculation is performed in domain code and repeated from current listing data when the booking is created. Values supplied by form markup are never trusted as the final price.

## Availability and Overlap

Availability is scoped to `listingId + variantId`. Variant stock continues to mean how many units the seller offers for that size. Creating or confirming a rental does not permanently set stock to zero.

Two inclusive date ranges overlap when:

```text
newPickup <= existingReturn AND newReturn >= existingPickup
```

Only confirmed rentals block availability. Pending requests may coexist so sellers can receive more than one request. The app checks confirmed conflicts when a buyer creates a request and checks again when a seller confirms it. This second check is required because another tab or seller action may have confirmed an overlapping request after the buyer opened the form.

For the current seeded listings, each size variant represents one rentable unit. If a future listing uses stock greater than one, availability may count concurrent confirmed rentals against stock; that extension is outside this MVP.

## Domain Actions

The existing pure domain reducer gains two actions:

### `rental.create`

Validates:

- active renter profile exists;
- listing exists and is active;
- renter is not the seller;
- selected variant exists and has stock greater than zero;
- dates satisfy the date rules;
- no confirmed rental overlaps the selected listing and variant.

It derives the price, creates a `pending` booking, and returns the updated state plus the new booking ID.

### `rental.confirm`

Validates:

- booking exists and is pending;
- active profile matches the booking seller;
- listing ownership still matches;
- no other confirmed rental overlaps the booking dates for the same listing and variant.

It changes only the booking status and confirmation timestamp. Repeated confirmation is rejected instead of silently creating a second transition.

Repository writes remain atomic at the whole-state transaction boundary already used by the application. UI renders success only after dispatch resolves.

## UI Structure

### Product rental panel

The current purchase dialog becomes a rental dialog rather than adding a second overlapping flow. It contains semantic labels, native date inputs, an accessible summary, inline validation, and a disabled submit button until the form is valid.

If the chosen dates conflict with a confirmed booking, the dialog keeps the entered values and explains that the selected size is unavailable for those dates.

### Booking confirmation

The current order confirmation surface becomes `Rental Request Created`. It displays the persisted booking snapshot and makes the pending status explicit. The primary follow-up opens My Rentals.

### My Closet

Active tabs become:

- My Listings
- Rental Requests
- My Rentals
- Saved

Rental cards share a common renderer so buyer and seller views show identical dates and totals. Seller cards add the confirmation action only for pending bookings. Empty states explain which action will populate the tab.

### Listing form

The existing multi-size listing form and image/3D preview workflow stay unchanged structurally. Visible commerce labels change to rental wording, and review cards show a per-day suffix. Publishing still adds an active listing to Marketplace and My Listings.

## Error Handling and Safety

- User-authored strings continue to be rendered through the existing HTML-escaping helpers.
- Invalid IDs, unauthorized profile actions, missing variants, zero stock, past pickup dates, reversed dates, invalid prices, and overlaps return domain errors and do not mutate state.
- UI success messages appear only after repository persistence succeeds.
- Rental actions use stable IDs and current state so stale product pages cannot create invalid bookings.
- Browser data remains local to the current site and can be lost if site storage is cleared; the UI identifies the experience as a demo.

## Testing

### Domain tests

Add tests for:

- same-day rental equals one day;
- multi-day inclusive calculation;
- invalid, past, and reversed date ranges;
- price derived from the selected variant;
- required booking snapshot fields;
- buyer cannot rent their own listing;
- creation rejects inactive listing, missing variant, or zero stock;
- pending requests do not block each other;
- confirmed overlapping booking blocks creation;
- seller authorization for confirmation;
- confirmation rejects a newly introduced overlap;
- non-overlapping rentals for the same variant succeed;
- state migration adds `rentals` without deleting `orders`;
- persistence and reload keep booking status.

### Existing regression tests

Run the full test suite and syntax checks. The current 3D asset, fitting, tailoring, mannequin, navigation, listing, catalog, and repository tests must remain green.

### Browser acceptance

Verify on desktop and a narrow viewport:

1. Marketplace → Product Detail → size and dates → price summary → create request.
2. My Rentals shows the pending booking after reload.
3. Switch to the seller → Rental Requests → confirm.
4. Switch back to the buyer → My Rentals shows confirmed.
5. Confirmed overlap is rejected; non-overlapping dates work.
6. 3D Studio remains visible and interactive; its rental action opens the same flow.
7. Listing a multi-size costume shows rental labels and appears in Marketplace/My Listings.
8. Search, filters, saved items, defect gallery, account switching, and keyboard dialog behavior still work.

## Delivery

Implementation will be committed and pushed to the current GitHub repository after the rental domain, UI flow, and final verification are stable. The Vercel deployment should update from the connected branch; the live URL will be checked after push.
