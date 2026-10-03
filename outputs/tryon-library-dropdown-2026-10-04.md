# Clothing Library and dropdown UI

Reference: user-supplied `Virtual Try-On.svg` and `Virtual Try-On-1.svg`.

- Split Fit and Clothing Library into separate cards; compact the selected piece, sizes, measurements, actions and real-photo grid.
- Keep the existing multi-slot outfit, saved sizes, renderer, models and rental actions. The library's former preset strip is no longer displayed; pieces remain individually selectable.
- Add shared in-page dropdown styling for Marketplace and Library, including current selection, actual item counts, keyboard focus and Escape. Remaining form selects retain native interaction with consistent closed-control styling.
- Library categories use existing occasion data. Costume reveals the existing Academy/Fantasy/Gothic theme filter. Zero counts are real: the 15 current modeled demo pieces belong to Costume.
- Replace decorative heart/preview/close/zoom text glyphs in changed surfaces with SVG icons.
- Remove Marketplace advanced controls and clear their hidden state. Keep category, type, rental dates, sort and search.

Verification:

- `npm test`: 106 passed; syntax checks and `git diff --check` passed.
- Browser: multiple pieces can be worn together and survive reload; one canvas remains mounted. Studio has five body fields, one canvas and no Clothing Library.
- Category and theme selection, Marketplace type filtering, Escape/focus checked.
- Desktop 1280, tablet 1024/768 and mobile 390/360 checked without horizontal overflow.
- Try-On axe audit: zero violations. One incomplete contrast check concerns existing camera controls over the canvas; visually inspected.
- No changes to data persistence, rental domain rules, model assets or photo assets.
