# Renter Figma alignment — 2026-09-30

Reference: Figma Closet, KkDX6bjZu8uPS8irVEXIcs. Frames Marketplace 3:549, Product 3:951, Try-on 51:3808, Studio 3:144.

## Delivered
- Scoped shared renter header/footer, page grids, cards, spacing, typography and original exported SVG icons in assets/renter-figma.
- Existing self-hosted Inter (Latin) and Anuphan (Thai), weights 300–700, with unicode ranges retained.
- Marketplace categories, six-item pagination, filters and existing mannequin preview.
- Product gallery/defects, selected-size measurements, rental panel, lazy existing 3D preview.
- Try-on fit/size panels and Studio measurement panel; existing 15-item wardrobe and renderer retained.
- Saved card markup retained separately to avoid changing an unrelated route.

## Evidence
- npm test: 99 passed, 0 failed.
- node --check: app.js, studio-ui.js, renter-shell.js passed; git diff --check passed.
- Browser: product size M and Oct 20–22 selection reached rental bag as M, 3 inclusive days, 4,230 THB. QA bag item removed afterwards; no payment made.
- Product to Try-on retained requested variant; changing size updated selected-size label.
- Studio male/female checked; 15 garments and one canvas observed. Renderer, garment assets, catalog and domain/repository files have no changes.
- Desktop screenshots inspected at 1280; Marketplace/Product mobile 390 and Try-on/Studio 360, Try-on tablet 768 had no horizontal document overflow. No broken loaded images in final checks.

## Deliberate differences / remaining parity work
This is not a claim of 100% pixel parity across every Figma frame.
- Real catalog photos, names, sellers, availability, prices and calculated fit replace static Figma sample content.
- Reviews, chat, cleaning/verification claims and additional category-specific body fields have no supporting existing system; no fabricated records or functional-looking controls added.
- Existing native date inputs and real filters retained instead of the design's expanded inline calendar.
- Existing Studio camera, wardrobe and garment adjustment controls retained; they extend beyond the static frame.
- Footer policy/help copy is noninteractive where no real destination exists.
- Home/lender/My Rentals UI was not reworked in this renter-frame pass.

## Handoff
renter-shell.js owns shared renter UI; body.renter-design scopes new CSS. Preserve original SVG geometry. Do not change studio-renderer.js, studio-domain.js or clothing assets for visual-only alignment.
