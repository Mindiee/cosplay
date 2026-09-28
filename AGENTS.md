# TooSuePha Rental Marketplace - Agent Guide

## Stack
- Plain HTML, CSS and JavaScript modules.
- IndexedDB stores local versioned cosplay and rental data. No backend or real payment.
- Run npm start and open http://127.0.0.1:4173/#studio
- Run npm test before committing.

## Product rules
- Listings have independent size variants, measurements, daily rental prices and availability flags.
- Rental price is stored in `sizeVariants[].price` and displayed per day.
- Rental checkout groups live in `state.rentalCheckoutGroups`; paid bookings live in `state.rentals`; preserve `state.orders` as legacy history.
- Paid inclusive date ranges block the same listing and variant. Checkout validates every item and commits the group, bookings, mock payment and escrow atomically.
- Keep checkout, booking lifecycle, tracking, cancellation, mock refund and escrow release inside existing IndexedDB transactions.
- Rental status follows the receive and return lifecycle in `cosplay-domain.js`; enforce renter and lender actions for every transition.
- Keep one account model for both roles. `#rentals` is renter history; `#closet/listings` and `#closet/requests` are the owner workspace; `#saved` is independent.
- Keep legacy Closet data separate from TooSuePha rental data and preserve stable storage keys.
- Preserve realistic male and female mannequins and independent top, bottom, wig, footwear and accessory slots.
- Product photos represent real items. 3D garments are visual approximations.
- Always display the virtual-fit limitation notice.
- Never invent missing measurements or substitute another product.

## Workflow
1. Check git status and preserve unrelated changes.
2. Read relevant modules and tests before editing.
3. Test fit rules, mannequin persistence, rental dates, overlap, authorization and wearable slots.
4. Run npm test and browser QA on desktop and mobile.
5. Make focused commits and never force-push.

## File map
- `app.js` and `panels.js`: application shell, routing and marketplace panels. `index.html` loads only `toosuepha.css`; keep SVG parity rules there and do not re-enable legacy stylesheets.
- `repository.js`: IndexedDB access and persistence boundaries.
- `cosplay-domain.js` and `domain.js`: rental, legacy purchase, listing and account rules.
- `mannequin.js`: mannequin dimensions and fit calculation.
- `studio-ui.js`, `studio-renderer.js`, `studio-domain.js`: 3D Studio UI, Three.js rendering and slot rules.
- `cosplay-seed.js` and `studio-catalog.json`: versioned demo catalog.
- `tests/`: behavioral regression tests.
- `Closet-handoff.md` and `IMPLEMENTATION-REPORT.md`: detailed project history and delivery notes.

## Delivery
- GitHub destination: `https://github.com/Mindiee/cosplay.git`.
- Publish the current tested tree to `main` without rewriting history.
- The app is static; all website source and bundled assets live in this repository.
