# Lender Figma alignment — 2026-09-29

## Scope
Matched the approved lender frames in Figma KkDX6bjZu8uPS8irVEXIcs: Overview 103:1246, My Closet 101:1040, Rental Orders 102:1556, Returns 101:538.

- Header 64px, desktop sidebar 256px, main padding 24px; corrected heading/table sizes, spacing, neutral active states, white order tabs, card borders and radii.
- Imported original SVG icons into assets/lender-figma, preserving intrinsic dimensions.
- Kept self-hosted English Inter / Thai Anuphan. No font download dependency added.
- Extracted lender rendering to lender-ui.js; existing listing, booking, payment and earnings actions remain in app.js and the existing domain/repository.
- Search, status tabs, select filters, pagination and management buttons connect to actual local data.
- Removed the previous UI-only invented 15% earnings deduction. No new financial calculations or domain changes.

## Intentional data/product differences from static Figma
Actual account, listings, images, sizes, prices and bookings are retained. Rental-only wording replaces sale wording. Unspecified shipping fees show an em dash. Tier fees, account badge and consignment copy are visual demo content; their dialogs clarify that no real service/insurance/fee deduction has been implemented.

## Verification
- npm test: 99 passed, 0 failed.
- node --check app.js and lender-ui.js; git diff --check passed.
- Browser: all four lender routes rendered; original SVGs loaded without broken images.
- My Closet Manage exposes Edit / Pause / Delete; booking Manage exposes the existing fulfillment action and original mock payment/escrow details.
- Search with no matching term shows empty state; clearing restores results.
- Desktop 1280: measured header 64px, sidebar 256px. Tablet 768, mobile 390 and 360 checked without document horizontal overflow. Scrollable table/navigation remain contained.
- Reload preserved account/listing data. Studio smoke check rendered one existing WebGL canvas and existing mannequin/outfit; no console errors. Studio code, catalog, assets, database and transaction logic are unchanged.
- This is visual and navigation regression verification, not a claim of exhaustive lifecycle browser retesting or pixel-identical static fixture data.
