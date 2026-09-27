# TooSuePha Parts 1–3 implementation plan

Authority: the user-approved Master Spec and the approved plan in this conversation.

## Task 1: Brand, Home, and categories

- Rename visible product branding to TooSuePha without changing persisted storage keys or existing asset identifiers.
- Add Home with the existing 3D renderer, required headline/message/CTA, and an accessible five-category carousel.
- Add occasion categories and two demo listings for Travel, Outdoor, Formal, and Event while retaining all Costume and Studio records.
- Add responsive navigation and category-aware Marketplace filtering.
- Verify unit suite, syntax, asset invariants, and browser layouts; commit and push Part 1.

## Task 2: Multi-store rental and mock money

- Add a shared-date rental bag and an atomic checkout group that creates paid bookings split by seller.
- Add availability revalidation, payment/escrow records, cancellations, earnings release, tracking, and the full receive/return lifecycle.
- Preserve legacy rentals and expose enough UI to demo every transition.
- Verify domain, concurrency, persistence, account authorization, and browser flow; commit and push Part 2.

## Task 3: Renter, Fit Match, and Try-on

- Implement one Fit Match calculation shared by Marketplace, Product, and Try-on.
- Redesign Marketplace/Product/Try-on from the supplied SVG layouts while preserving product evidence and the existing 3D system.
- Enter Try-on directly with the selected listing/variant and retain shared dates and rental bag state through checkout.
- Verify missing measurements, non-3D fallback, WebGL lifecycle, responsive layouts, and the full renter flow; commit and push Part 3.

## Final review

- Run the full test/syntax/diff checks, browser regression at desktop/tablet/mobile widths, and inspect the whole range from `8f8d602`.
- Fix Critical/Important findings with failing tests first; record deferred minor findings.
