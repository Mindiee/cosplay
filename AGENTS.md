# CLOSET Cosplay Marketplace - Agent Guide

## Stack
- Plain HTML, CSS and JavaScript modules.
- IndexedDB stores local versioned cosplay and rental data. No backend or real payment.
- Run npm start and open http://127.0.0.1:4173/#studio
- Run npm test before committing.

## Product rules
- Listings have independent size variants, measurements, daily rental prices and availability flags.
- Rental price is stored in `sizeVariants[].price` and displayed per day.
- Rental bookings live in `state.rentals`; preserve `state.orders` as legacy history.
- Only confirmed inclusive date ranges block the same listing and variant.
- Keep rental creation and seller confirmation inside existing IndexedDB transactions.
- Keep legacy Closet data separate from cosplay data.
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
- `app.js` and `panels.js`: application shell, routing and marketplace panels.
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
