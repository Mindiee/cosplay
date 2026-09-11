# Frontend Rental Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the active cosplay purchase journey with a complete browser-persisted rental request and seller confirmation journey while preserving Marketplace, search/filter, listing tools, and the entire 3D Studio.

**Architecture:** Add rental calculations and state transitions to the existing pure cosplay domain, persist a new `rentals` array through the existing IndexedDB whole-state transaction, and replace purchase-facing views with one shared rental dialog and rental-card renderer. Keep historical `orders` untouched for compatibility, keep `sizeVariants[].price` as the stored daily price, and route both Product Detail and 3D Studio into the same rental flow.

**Tech Stack:** Plain HTML/CSS, JavaScript ES modules, IndexedDB, BroadcastChannel, Node.js 20 built-in test runner, existing Three.js 3D Studio.

**Spec:** `docs/superpowers/specs/2026-09-11-rental-flow-design.md`

## Global Constraints

- Frontend-only: do not add a backend, remote database, API, payment, tracking, chat, review, or admin system.
- Preserve Marketplace, search/filter, favorites, defect images, account switching, listing management, and all 3D Studio models and controls.
- Do not reintroduce the removed standalone My Mannequin page.
- Use the existing IndexedDB cosplay state and BroadcastChannel; do not introduce a second localStorage source of truth.
- Keep existing `orders` data without converting or deleting it.
- Interpret `sizeVariants[].price` as rental price per day in the active UI.
- Count rental days inclusively and represent dates as local calendar strings in `YYYY-MM-DD` form.
- Support only `pending` and `confirmed` booking states, displayed as `รอยืนยัน` and `ยืนยันแล้ว`.
- Run `npm test` and JavaScript syntax checks before final delivery.
- Push tested commits to `https://github.com/Mindiee/cosplay.git` on `main` without force-pushing.

---

## File Structure

- Create `tests/rental-domain.test.mjs`: focused tests for calendar arithmetic, overlap, rental creation, authorization, confirmation, and state normalization.
- Modify `cosplay-domain.js`: export rental calculation helpers, normalize old state, and implement `rental.create` and `rental.confirm`.
- Modify `cosplay-seed.js`: seed an empty `rentals` collection while retaining `orders`.
- Modify `repository.js`: normalize existing `cosplay-v1` state during initialization, read, and dispatch.
- Modify `app.js`: replace purchase dialog/confirmation/history with the rental dialog, confirmation route, My Rentals, and Rental Requests.
- Modify `studio-ui.js`: rename the injected commerce callback and send the selected item/variant into the shared rental dialog without altering renderer or outfit logic.
- Modify `cosplay-seller.js`: change selling, stock, and pricing copy to rental wording while preserving the listing schema and validation.
- Modify `index.html`: change global navigation/button copy from selling to renting where applicable.
- Modify `cosplay.css` and `studio.css`: style rental date/price summaries, booking statuses, and narrow-screen booking cards.
- Modify `tests/navigation.test.mjs`: assert active rental routes/copy and continued 3D Studio presence.
- Modify `tests/studio.test.mjs`: replace purchase-specific regression wording/action with rental availability coverage while leaving 3D persistence assertions intact.
- Modify `README.md`, `AGENTS.md`, and `IMPLEMENTATION-REPORT.md`: document the rental demo path, state rules, tests, and handoff constraints.

---

### Task 1: Rental Domain, Calendar Rules, and State Compatibility

**Files:**
- Create: `tests/rental-domain.test.mjs`
- Modify: `cosplay-domain.js:1-82`
- Modify: `cosplay-seed.js:3-16`
- Modify: `repository.js:86-106`
- Modify: `tests/cosplay-domain.test.mjs:1-18`
- Modify: `tests/studio.test.mjs:18-35`

**Interfaces:**
- Produces: `rentalDays(pickupDate: string, returnDate: string): number`
- Produces: `rentalRangesOverlap(aPickup: string, aReturn: string, bPickup: string, bReturn: string): boolean`
- Produces: `normalizeCosplayState(state: object): object`
- Produces: domain action `rental.create` with `{listingId, variantId, pickupDate, returnDate}` returning `{id}`.
- Produces: domain action `rental.confirm` with `{id}` returning `{id, status: 'confirmed'}`.
- Consumes: existing `transitionCosplay`, listing schema, active actor guard, event log, and repository transaction.

- [ ] **Step 1: Write failing calendar and overlap tests**

Create `tests/rental-domain.test.mjs` with fixed local calendar values and direct helper imports:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCosplaySeed} from '../cosplay-seed.js';
import {
  normalizeCosplayState,
  rentalDays,
  rentalRangesOverlap,
  transitionCosplay,
} from '../cosplay-domain.js';

test('rental days are inclusive local calendar days', () => {
  assert.equal(rentalDays('2026-09-11', '2026-09-11'), 1);
  assert.equal(rentalDays('2026-09-11', '2026-09-13'), 3);
  assert.throws(() => rentalDays('2026-09-13', '2026-09-11'), /วันคืน/);
  assert.throws(() => rentalDays('2026-02-30', '2026-03-01'), /วันที่/);
});

test('inclusive rental ranges treat touching dates as overlap', () => {
  assert.equal(rentalRangesOverlap('2026-09-11','2026-09-13','2026-09-13','2026-09-15'), true);
  assert.equal(rentalRangesOverlap('2026-09-11','2026-09-13','2026-09-14','2026-09-15'), false);
});
```

- [ ] **Step 2: Run the new tests and verify the helpers are missing**

Run: `node --test tests/rental-domain.test.mjs`

Expected: FAIL because the three new exports do not exist.

- [ ] **Step 3: Implement strict calendar helpers and state normalization**

Add pure helpers near the top of `cosplay-domain.js`:

```js
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function calendarDay(value) {
  const match = DATE_PATTERN.exec(value ?? '');
  if (!match) fail('กรอกวันที่ให้ถูกต้อง');
  const [year, month, day] = match.slice(1).map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    fail('กรอกวันที่ให้ถูกต้อง');
  }
  return utc / 86400000;
}

export function rentalDays(pickupDate, returnDate) {
  const pickup = calendarDay(pickupDate);
  const returned = calendarDay(returnDate);
  if (returned < pickup) fail('วันคืนต้องไม่ก่อนวันรับชุด');
  return returned - pickup + 1;
}

export function rentalRangesOverlap(aPickup, aReturn, bPickup, bReturn) {
  return calendarDay(aPickup) <= calendarDay(bReturn)
    && calendarDay(bPickup) <= calendarDay(aReturn);
}

export function normalizeCosplayState(state) {
  if (!state || typeof state !== 'object') fail('ข้อมูลระบบไม่ถูกต้อง');
  if (!Array.isArray(state.rentals)) state.rentals = [];
  if (!Array.isArray(state.orders)) state.orders = [];
  return state;
}
```

Call `normalizeCosplayState(state)` at the start of `transitionCosplay` before reading `state.settings`.

- [ ] **Step 4: Run helper tests and verify they pass**

Run: `node --test tests/rental-domain.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 5: Add failing rental creation and confirmation tests**

Append tests that use a fixed noon timestamp to avoid a date boundary:

```js
const NOW = Date.UTC(2026, 8, 11, 12);
const act = (state, action, payload, actorId = state.settings.currentUserId) =>
  transitionCosplay(state, action, payload, NOW, actorId);

test('rental creation snapshots daily rate and inclusive total without consuming stock', () => {
  const state = makeCosplaySeed(NOW);
  const item = state.listings[0];
  const variant = item.sizeVariants[0];
  const result = act(state, 'rental.create', {
    listingId: item.id,
    variantId: variant.id,
    pickupDate: '2026-09-11',
    returnDate: '2026-09-13',
  });
  const booking = state.rentals.find(row => row.id === result.id);
  assert.equal(booking.status, 'pending');
  assert.equal(booking.dailyPrice, variant.price);
  assert.equal(booking.rentalDays, 3);
  assert.equal(booking.totalPrice, variant.price * 3);
  assert.equal(variant.stock, 1);
  item.title = 'edited later';
  assert.notEqual(booking.listingSnapshot.title, item.title);
});

test('only the seller confirms and a confirmed date range blocks overlap', () => {
  const state = makeCosplaySeed(NOW);
  const item = state.listings[0];
  const variant = item.sizeVariants[0];
  const first = act(state, 'rental.create', {listingId:item.id, variantId:variant.id, pickupDate:'2026-09-11', returnDate:'2026-09-13'});
  assert.throws(() => act(state, 'rental.confirm', {id:first.id}), /ผู้ขาย/);
  act(state, 'profile.switch', {id:item.sellerId});
  assert.equal(act(state, 'rental.confirm', {id:first.id}).status, 'confirmed');
  act(state, 'profile.switch', {id:'u1'});
  assert.throws(() => act(state, 'rental.create', {listingId:item.id, variantId:variant.id, pickupDate:'2026-09-13', returnDate:'2026-09-15'}), /ไม่ว่าง/);
  assert.doesNotThrow(() => act(state, 'rental.create', {listingId:item.id, variantId:variant.id, pickupDate:'2026-09-14', returnDate:'2026-09-15'}));
});

test('pending requests coexist but confirmation rechecks a new conflict', () => {
  const state=makeCosplaySeed(NOW), item=state.listings[0], variant=item.sizeVariants[0];
  const first=act(state,'rental.create',{listingId:item.id,variantId:variant.id,pickupDate:'2026-09-20',returnDate:'2026-09-22'});
  act(state,'profile.switch',{id:'u3'});
  const second=act(state,'rental.create',{listingId:item.id,variantId:variant.id,pickupDate:'2026-09-21',returnDate:'2026-09-23'});
  act(state,'profile.switch',{id:item.sellerId});
  act(state,'rental.confirm',{id:first.id});
  const before=structuredClone(state);
  assert.throws(() => act(state,'rental.confirm',{id:second.id}), /วันเดียวกัน/);
  assert.deepEqual(state,before);
});

test('invalid actor listing variant stock and dates do not mutate state', () => {
  for (const arrange of [
    state => ({listingId:state.listings[2].id,variantId:state.listings[2].sizeVariants[0].id,pickupDate:'2026-09-11',returnDate:'2026-09-11'}),
    state => {state.listings[0].status='paused';return {listingId:state.listings[0].id,variantId:state.listings[0].sizeVariants[0].id,pickupDate:'2026-09-11',returnDate:'2026-09-11'};},
    state => ({listingId:state.listings[0].id,variantId:'missing',pickupDate:'2026-09-11',returnDate:'2026-09-11'}),
    state => {state.listings[0].sizeVariants[0].stock=0;return {listingId:state.listings[0].id,variantId:state.listings[0].sizeVariants[0].id,pickupDate:'2026-09-11',returnDate:'2026-09-11'};},
    state => ({listingId:state.listings[0].id,variantId:state.listings[0].sizeVariants[0].id,pickupDate:'2026-09-10',returnDate:'2026-09-11'}),
  ]) {
    const state=makeCosplaySeed(NOW),payload=arrange(state),before=structuredClone(state);
    assert.throws(() => act(state,'rental.create',payload));
    assert.deepEqual(state,before);
  }
});
```

Add this repeated-confirmation assertion after the first successful confirmation:

```js
const confirmedAt=state.rentals.find(row=>row.id===first.id).confirmedAt;
assert.throws(() => act(state,'rental.confirm',{id:first.id}), /ดำเนินการแล้ว/);
assert.equal(state.rentals.find(row=>row.id===first.id).confirmedAt,confirmedAt);
```

- [ ] **Step 6: Run rental action tests and verify the unknown-action failure**

Run: `node --test tests/rental-domain.test.mjs`

Expected: helper tests PASS and action tests FAIL with `ไม่รู้จักรายการที่ต้องการทำ`.

- [ ] **Step 7: Implement `rental.create` and `rental.confirm`**

Add these branches before the legacy `purchase.create` branch in `transitionCosplay`:

```js
if (action === 'rental.create') {
  const item = find(payload.listingId);
  const variant = item.sizeVariants.find(row => row.id === payload.variantId);
  if (item.sellerId === actor.id) fail('เช่าชุดของตัวเองไม่ได้');
  if (item.status !== 'active' || !variant || variant.stock < 1) fail('ไซซ์นี้ไม่พร้อมให้เช่า');
  if (validateCosplayListing(item).length || !state.profiles.some(p => p.id === item.sellerId)) fail('ข้อมูลสินค้าไม่ถูกต้อง');
  const days = rentalDays(payload.pickupDate, payload.returnDate);
  const today = new Date(now);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  if (calendarDay(payload.pickupDate) < calendarDay(todayKey)) fail('วันรับชุดต้องเป็นวันนี้หรือวันถัดไป');
  const conflict = state.rentals.some(row => row.status === 'confirmed'
    && row.listingId === item.id
    && row.variantId === variant.id
    && rentalRangesOverlap(payload.pickupDate, payload.returnDate, row.pickupDate, row.returnDate));
  if (conflict) fail('ไซซ์นี้ไม่ว่างในวันที่เลือก');
  const id = uid('rental', now);
  state.rentals.push({
    id,
    listingId:item.id,
    variantId:variant.id,
    renterId:actor.id,
    sellerId:item.sellerId,
    size:variant.size,
    pickupDate:payload.pickupDate,
    returnDate:payload.returnDate,
    dailyPrice:variant.price,
    rentalDays:days,
    totalPrice:variant.price * days,
    status:'pending',
    createdAt:now,
    confirmedAt:null,
    listingSnapshot:{title:item.title, character:item.character, image:structuredClone(item.photos.find(p=>p.id===item.coverId)), sellerName:state.profiles.find(p=>p.id===item.sellerId).name},
  });
  event(action,{rentalId:id,userId:actor.id});
  return {id};
}

if (action === 'rental.confirm') {
  const booking = state.rentals.find(row => row.id === payload.id) ?? fail('ไม่พบคำขอเช่า');
  if (booking.sellerId !== actor.id) fail('เฉพาะผู้ขายเท่านั้นที่ยืนยันคำขอเช่าได้');
  if (booking.status !== 'pending') fail('คำขอเช่านี้ถูกดำเนินการแล้ว');
  const item = find(booking.listingId);
  if (item.sellerId !== actor.id) fail('เจ้าของประกาศไม่ตรงกับคำขอเช่า');
  const conflict = state.rentals.some(row => row.id !== booking.id
    && row.status === 'confirmed'
    && row.listingId === booking.listingId
    && row.variantId === booking.variantId
    && rentalRangesOverlap(booking.pickupDate, booking.returnDate, row.pickupDate, row.returnDate));
  if (conflict) fail('มีการยืนยันการเช่าที่ใช้วันเดียวกันแล้ว');
  booking.status = 'confirmed';
  booking.confirmedAt = now;
  event(action,{rentalId:booking.id,userId:actor.id});
  return {id:booking.id,status:booking.status};
}
```

Keep `purchase.create` temporarily for old tests and stored-order compatibility; active UI removal happens in later tasks.

- [ ] **Step 8: Seed and normalize persisted state**

Change `makeCosplaySeed` to return both arrays:

```js
return {
  version:3,
  profiles,
  settings:{currentUserId},
  listings,
  orders:[],
  rentals:[],
  favorites:Object.fromEntries(profiles.map(profile=>[profile.id,[]])),
  mannequins:{},
  events:[],
};
```

In `createCosplayRepository`, wrap seeded, existing, read, and dispatch states with `normalizeCosplayState`. The initialization branch must call:

```js
import {normalizeCosplayState, transitionCosplay} from './cosplay-domain.js';

const initial = normalizeCosplayState(mergeStudioCatalog(makeCosplaySeed(Date.now(), legacy), catalog));
```

The existing-state branch must normalize before `mergeStudioCatalog`, and `read()` must normalize before returning so state written by older deployments gains `rentals` immediately.

- [ ] **Step 9: Update legacy regression assertions without deleting order coverage**

In `tests/cosplay-domain.test.mjs`, retain legacy purchase tests as compatibility tests but add `assert.deepEqual(makeCosplaySeed(100).rentals, [])`.

In `tests/studio.test.mjs`, update the catalog merge test to assert both `orders` and `rentals` survive merging:

```js
assert.deepEqual(s.orders, old.orders);
assert.deepEqual(s.rentals, old.rentals);
```

- [ ] **Step 10: Run focused and full domain tests**

Run:

```powershell
node --test tests/rental-domain.test.mjs tests/cosplay-domain.test.mjs tests/studio.test.mjs
npm test
```

Expected: all tests PASS and legacy purchase compatibility remains intact.

- [ ] **Step 11: Commit the rental domain**

```powershell
git add cosplay-domain.js cosplay-seed.js repository.js tests/rental-domain.test.mjs tests/cosplay-domain.test.mjs tests/studio.test.mjs
git commit -m "feat: add frontend rental booking domain"
```

---

### Task 2: Shared Rental Dialog and Buyer Journey

**Files:**
- Modify: `app.js:17-121`
- Modify: `cosplay.css:7-14`
- Modify: `tests/navigation.test.mjs`

**Interfaces:**
- Consumes: `rentalDays`, `rental.create`, `state.rentals`, existing `modal`, `run`, `go`, `money`, `photoUrl`.
- Produces: `openRental(listingId: string, variantId: string): void` for Product Detail, 2D Try On, and 3D Studio.
- Produces: `rentalLine(booking: object, {sellerView?: boolean}): HTMLElement` for buyer and later seller history.
- Produces: route `#rental/:id` and link `#closet/rentals`.

- [ ] **Step 1: Add failing static navigation assertions**

Extend `tests/navigation.test.mjs`:

```js
test('active commerce navigation uses rental flow', async () => {
  const [html, app, studio] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('app.js', root), 'utf8'),
    readFile(new URL('studio-ui.js', root), 'utf8'),
  ]);
  assert.match(app, /function openRental\(/);
  assert.match(app, /rental\.create/);
  assert.match(app, /#closet\/rentals/);
  assert.doesNotMatch(app, /button\('Buy Now'/);
  assert.doesNotMatch(studio, /ซื้อชิ้นนี้/);
  assert.match(html, /ลงชุดให้เช่า/);
});
```

- [ ] **Step 2: Run the navigation test and verify rental UI is missing**

Run: `node --test tests/navigation.test.mjs`

Expected: FAIL on `openRental`, rental route, and rental copy.

- [ ] **Step 3: Import the date helper and replace purchase entry points**

In `app.js`, import `rentalDays` from `cosplay-domain.js`, change the route branch from `order` to `rental`, pass `rental:openRental` into `createStudioUI`, and replace Product Detail and 2D Try On buttons with:

```js
button('เช่าชุดนี้', () => openRental(l.id, variant.id), 'secondary', {
  disabled:l.status !== 'active' || !variant.stock || l.sellerId === me(),
})
```

Display listing and try-on prices as `${money(variant.price)} / วัน`, and change unavailable wording to `ไซซ์นี้ยังไม่พร้อมให้เช่า`.

- [ ] **Step 4: Implement a reusable rental date form**

Replace `openPurchase` with `openRental`. Use native date inputs, default pickup to today's local `YYYY-MM-DD`, default return to pickup, recalculate the summary on either input change, and preserve values when repository validation rejects submission:

```js
function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function openRental(listingId, variantId) {
  if (!requireUser()) return;
  const actor = me();
  const item = listing(listingId);
  if (!item || item.status !== 'active') { toast('ชุดนี้ยังไม่พร้อมให้เช่า'); return; }
  let chosenVariantId = item.sizeVariants.some(row => row.id === variantId && row.stock > 0)
    ? variantId
    : item.sizeVariants.find(row => row.stock > 0)?.id;
  if (!chosenVariantId || item.sellerId === actor) { toast('ไซซ์นี้ยังไม่พร้อมให้เช่า'); return; }
  let pickupDate = localDateKey();
  let returnDate = pickupDate;
  let error = '';

  const build = () => {
    const variant = item.sizeVariants.find(row => row.id === chosenVariantId);
    let days = 0;
    try { days = rentalDays(pickupDate, returnDate); } catch (cause) { error = cause.message; }
    const submit = button('ส่งคำขอเช่าชุดนี้', async () => {
      try {
        if (actor !== me()) throw Error('บัญชีเปลี่ยนแล้ว กรุณาเริ่มเช่าใหม่');
        const result = await run('rental.create',{listingId,variantId:chosenVariantId,pickupDate,returnDate});
        go(`#rental/${result.id}`);
      } catch (cause) {
        error = cause.message;
        document.getElementById('modalBody').replaceChildren(build());
      }
    }, 'dark', {disabled:!days});
    return h('div',{class:'rental-review stack'},
      h('img',{src:photoUrl(cover(item)),alt:item.title}),
      h('h2',{},item.character), note(item.title),
      h('p',{},`ไซซ์ ${variant.size} · ${CONDITIONS[item.condition]}`),
      sizePicker(item,chosenVariantId,id=>{chosenVariantId=id;error='';document.getElementById('modalBody').replaceChildren(build())}),
      h('div',{class:'rental-dates'},
        field('วันรับชุด',h('input',{type:'date',min:localDateKey(),value:pickupDate,onchange:event=>{pickupDate=event.target.value;error='';document.getElementById('modalBody').replaceChildren(build())}})),
        field('วันคืนชุด',h('input',{type:'date',min:pickupDate,value:returnDate,onchange:event=>{returnDate=event.target.value;error='';document.getElementById('modalBody').replaceChildren(build())}}))),
      h('div',{class:'rental-total'},note(`${money(variant.price)} / วัน × ${days || 0} วัน`),h('strong',{},money(variant.price * days))),
      note('ส่งคำขอแล้วรอผู้ให้เช่ายืนยัน ไม่มีการชำระเงินจริง'),
      error && h('p',{class:'form-error',role:'alert'},error), submit);
  };
  modal('ตรวจทานคำขอเช่า',build);
}
```

Change `sizePicker` so a stock-zero size is disabled for selection while its measurements remain viewable on Product Detail. The rental dialog's `sizePicker` callback therefore receives only an available variant ID.

- [ ] **Step 5: Replace purchase confirmation with rental confirmation**

Add status mapping and snapshot image handling:

```js
const RENTAL_STATUS = {pending:'รอยืนยัน', confirmed:'ยืนยันแล้ว'};
const rentalPhoto = booking => booking.listingSnapshot.image;

function rentalLine(booking, {sellerView=false}={}) {
  return h('article',{class:'cosplay-order rental-card'},
    h('img',{src:photoUrl(rentalPhoto(booking)),alt:booking.listingSnapshot.title}),
    h('div',{},
      h('small',{},`#${booking.id.slice(-8)} · ${dt(booking.createdAt)}`),
      h('h3',{},`${booking.listingSnapshot.character} — ${booking.listingSnapshot.title}`),
      note(`ไซซ์ ${booking.size} · ${booking.pickupDate} ถึง ${booking.returnDate}`),
      note(`${money(booking.dailyPrice)} / วัน × ${booking.rentalDays} วัน · รวม ${money(booking.totalPrice)}`)),
    h('span',{class:`rental-status ${booking.status}`},RENTAL_STATUS[booking.status]));
}
```

Replace `confirmationPage` with a buyer-authorized rental lookup and `Rental Request Created` content linking to `#closet/rentals`.

- [ ] **Step 6: Style the form, total, and statuses**

In `cosplay.css`, replace `.purchase-review` selectors and add:

```css
.rental-review>img{width:100%;max-height:280px;object-fit:contain;background:var(--cream)}
.rental-dates{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.rental-dates input{width:100%;padding:11px;border:1px solid var(--line);background:var(--white)}
.rental-total{display:flex;align-items:end;justify-content:space-between;padding:16px;background:var(--cream)}
.rental-total strong{font:28px Georgia,serif}
.rental-status{justify-self:end;padding:7px 10px;border:1px solid var(--line);white-space:nowrap}
.rental-status.pending{color:var(--rust);background:#f7eadd}
.rental-status.confirmed{color:var(--green);background:#e6eee8}
@media(max-width:760px){.rental-dates{grid-template-columns:1fr}.rental-card>.rental-status{grid-column:1/-1;justify-self:start}}
```

- [ ] **Step 7: Run navigation and syntax checks**

Run:

```powershell
node --test tests/navigation.test.mjs
node --check app.js
```

Expected: PASS with no syntax output.

- [ ] **Step 8: Commit the buyer rental journey**

```powershell
git add app.js cosplay.css tests/navigation.test.mjs
git commit -m "feat: replace purchase flow with rental requests"
```

---

### Task 3: Seller Confirmation and My Closet Rental Views

**Files:**
- Modify: `app.js:120-132`
- Modify: `cosplay.css:10-14`
- Modify: `tests/navigation.test.mjs`

**Interfaces:**
- Consumes: `state.rentals`, `rentalLine`, domain action `rental.confirm`, active account switching.
- Produces: tab `#closet/requests` for seller-owned requests.
- Produces: tab `#closet/rentals` for renter-owned requests.

- [ ] **Step 1: Strengthen failing navigation assertions for My Closet**

Add these expectations to the rental navigation test:

```js
assert.match(app, /requests:'Rental Requests'/);
assert.match(app, /rentals:'My Rentals'/);
assert.match(app, /rental\.confirm/);
assert.doesNotMatch(app, /purchases:'Purchases'/);
assert.doesNotMatch(app, /sold:'Sold'/);
```

- [ ] **Step 2: Run the navigation test and verify old tabs fail it**

Run: `node --test tests/navigation.test.mjs`

Expected: FAIL while `Purchases`, `Sold`, and `Earnings` remain in `closetPage`.

- [ ] **Step 3: Replace active My Closet commerce tabs**

Change the tab map to:

```js
const tabs = {
  listings:'My Listings',
  requests:'Rental Requests',
  rentals:'My Rentals',
  saved:'Saved',
};
```

Build buyer content from `state.rentals.filter(row => row.renterId === me())`, newest first. Build seller content from `state.rentals.filter(row => row.sellerId === me())`, newest first.

```js
if(tab==='rentals') {
  content=state.rentals.filter(row=>row.renterId===me()).sort((a,b)=>b.createdAt-a.createdAt).map(row=>rentalLine(row));
} else if(tab==='requests') {
  content=state.rentals.filter(row=>row.sellerId===me()).sort((a,b)=>b.createdAt-a.createdAt).map(row=>rentalLine(row,{sellerView:true}));
}
```

- [ ] **Step 4: Add seller confirmation action to shared rental cards**

Extend `rentalLine` so `sellerView && booking.status === 'pending'` appends:

```js
button('ยืนยันการเช่า', async () => {
  await run('rental.confirm',{id:booking.id});
  toast('ยืนยันคำขอเช่าแล้ว');
}, 'dark')
```

Keep the status visible beside the action. Domain authorization remains authoritative; the renderer only controls presentation.

- [ ] **Step 5: Update listing availability copy and deletion confirmation**

Render size stock as `พร้อมให้เช่า` / `ปิดรับเช่า` and listing state as `กำลังแสดงใน Marketplace` / `พักการให้เช่า`. Rename management actions to `เปิดให้เช่า`, `พักให้เช่า`, and update deletion copy to say rental history remains stored.

```js
note(l.sizeVariants.map(v=>`${v.size}: ${v.stock?'พร้อมให้เช่า':'ปิดรับเช่า'}`).join(' · '))
button(l.status==='paused'?'เปิดให้เช่า':'พักให้เช่า',()=>run('listing.status',{id:l.id,status:l.status==='paused'?'active':'paused'}),'text-btn')
note(`นำ ${l.title} ออกจาก Marketplace? ประวัติการเช่ายังอยู่`)
```

- [ ] **Step 6: Run focused tests and syntax check**

Run:

```powershell
node --test tests/navigation.test.mjs tests/rental-domain.test.mjs
node --check app.js
```

Expected: all tests PASS and no syntax output.

- [ ] **Step 7: Commit seller confirmation views**

```powershell
git add app.js cosplay.css tests/navigation.test.mjs
git commit -m "feat: add rental requests to My Closet"
```

---

### Task 4: Rental Copy in Marketplace, Listing Form, and 3D Studio

**Files:**
- Modify: `app.js:47-112`
- Modify: `studio-ui.js:1-44`
- Modify: `cosplay-seller.js:33-65`
- Modify: `index.html`
- Modify: `studio.css:1-end`
- Modify: `tests/navigation.test.mjs`
- Modify: `tests/studio.test.mjs`

**Interfaces:**
- Consumes: `ctx.rental(item.id, variant.id)` supplied by `app.js`.
- Produces: rental wording across all active commerce surfaces.
- Preserves: `createStudioRenderer`, mannequin profile, outfit slots/transforms, camera controls, model loading, and fit calculations.

- [ ] **Step 1: Add failing copy regression checks**

Extend `tests/navigation.test.mjs` to assert:

```js
assert.match(studio, /ctx\.rental\(item\.id,variant\.id\)/);
assert.match(studio, /เช่าชิ้นนี้/);
assert.doesNotMatch(studio, /ctx\.purchase/);
assert.doesNotMatch(studio, /ซื้อชิ้นนี้/);
assert.doesNotMatch(app, /พร้อมซื้อ|ขายหมดแล้ว|พร้อมขาย/);
```

- [ ] **Step 2: Run navigation tests and confirm current copy fails**

Run: `node --test tests/navigation.test.mjs`

Expected: FAIL on purchase callback and selling copy.

- [ ] **Step 3: Update Marketplace and Product Detail price language**

Append ` / วัน` to card, detail, and 2D Try On prices. Change Marketplace result copy to `ชุดที่พร้อมให้เช่า`, hero copy to renting language, asset note to `ประกาศให้เช่าเป็นข้อมูลเดโม`, size-picker titles to `พร้อมให้เช่า` / `ยังไม่พร้อมให้เช่า`, and empty-state action to `ลงชุดให้เช่าชุดแรกของคุณ`.

Use the same daily-price shape on each surface:

```js
h('b',{},`${money(minPrice(l))} / วัน`)
h('p',{class:'detail-price'},`${money(variant.price)} / วัน`)
price.textContent=`${money(variant.price)} / วัน`;
count.textContent=`${list.length} ชุดที่พร้อมให้เช่า`;
```

- [ ] **Step 4: Change the 3D Studio callback and visible commerce copy only**

In `app.js`, construct Studio with:

```js
createStudioUI({...ctx, get state(){return state}, rental:openRental, accounts:()=>openAccounts(ctx)}, ...)
```

In `studio-ui.js`, change only commerce presentation:

```js
h('strong',{class:'studio-detail-price'},`${money(variant.price)} / วัน`)
btn('เช่าชิ้นนี้',()=>ctx.rental(item.id,variant.id),'dark',{disabled:item.status!=='active'||!variant.stock||item.sellerId===actor})
```

Update the footnote to say `ไม่มีการชำระเงินจริง`. Do not edit `studio-renderer.js`, GLB assets, outfit transforms, camera actions, `profileStudio`, body measurements, fit calls, or slot replacement behavior.

- [ ] **Step 5: Convert listing form copy to rental language**

In `cosplay-seller.js`, change:

- unauthenticated prompt to `กรุณาเลือกบัญชีก่อนลงชุดให้เช่า`;
- modal title to `ลงชุดให้เช่า` / `แก้ไขชุดให้เช่า`;
- size state to `พร้อมให้เช่า 1 ชิ้น`;
- price field to `ราคาเช่าต่อวัน ไซซ์ X (บาท)`;
- comparator note to `ราคาเช่าต่อวันในข้อมูลเบราว์เซอร์นี้`;
- final note to `แต่ละไซซ์พร้อมให้เช่า 1 ชิ้น ไม่มีการรับเงินจริง`;
- publish button to `เผยแพร่ชุดให้เช่า`.

Do not rename the stored `price` or `stock` fields.

The resulting price and final review nodes must be:

```js
field(`ราคาเช่าต่อวัน ไซซ์ ${v.size} (บาท)`,input(v.price,n=>v.price=n===''?'':Number(n),{type:'number',min:1,max:1000000,step:1,disabled:v.stock===0}))
note('เผยแพร่ในตลาดสาธิตของเบราว์เซอร์นี้ แต่ละไซซ์พร้อมให้เช่า 1 ชิ้น ไม่มีการรับเงินจริง')
```

- [ ] **Step 6: Update top-level navigation copy**

In `index.html`, replace the seller CTA text with `ลงชุดให้เช่า`. Keep IDs, hashes, script imports, and 3D Studio navigation unchanged.

```html
<button id="sellBtn" class="dark" type="button">＋ ลงชุดให้เช่า</button>
```

- [ ] **Step 7: Update the 3D domain regression test**

Rename the last phrase of the test `saved outfit references ... purchases reject unavailable` to refer to legacy purchase compatibility, then add:

```js
test('studio listing can create a rental without consuming stock or changing outfit',()=>{
 const s=ready(),l=s.listings[0],v=l.sizeVariants[0],beforeOutfit=structuredClone(s.studioProfiles);
 transitionCosplay(s,'rental.create',{listingId:l.id,variantId:v.id,pickupDate:'2026-09-11',returnDate:'2026-09-12'},Date.UTC(2026,8,11,12),'u1');
 assert.equal(s.rentals.length,1);
 assert.equal(v.stock,1);
 assert.deepEqual(s.studioProfiles,beforeOutfit);
});
```

- [ ] **Step 8: Run full tests and syntax checks**

Run:

```powershell
npm test
node --check app.js
node --check cosplay-domain.js
node --check cosplay-seller.js
node --check repository.js
node --check studio-ui.js
```

Expected: full suite PASS and no syntax output.

- [ ] **Step 9: Commit rental language and Studio integration**

```powershell
git add app.js studio-ui.js cosplay-seller.js index.html studio.css tests/navigation.test.mjs tests/studio.test.mjs
git commit -m "feat: connect 3D studio and listings to rentals"
```

---

### Task 5: Browser Acceptance, Documentation, Push, and Deployment Verification

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `IMPLEMENTATION-REPORT.md`
- Modify if browser QA exposes defects: `app.js`, `cosplay.css`, `cosplay-seller.js`, `studio-ui.js`, and directly related tests.

**Interfaces:**
- Consumes: completed domain and UI tasks, `npm start`, current IndexedDB state, account switcher, Vercel-linked `main` branch.
- Produces: verified end-to-end rental demo, updated agent handoff, pushed commits, and checked public URL.

- [ ] **Step 1: Update user and agent documentation**

Change `README.md` demo steps to:

```text
Marketplace → Product Detail → เลือกไซซ์และวัน → ส่งคำขอเช่า
My Closet → My Rentals → รอยืนยัน
สลับเป็นผู้ให้เช่า → Rental Requests → ยืนยันการเช่า
สลับกลับผู้เช่า → My Rentals → ยืนยันแล้ว
```

Document inclusive daily pricing, `rentals` persistence, confirmed overlap rules, and the lack of real payment. Remove active instructions for Purchases, Sold, Earnings, and buying from the 3D Studio.

In `AGENTS.md`, replace purchase rules with:

```text
- Rental price is stored in sizeVariants[].price and displayed per day.
- Rental bookings live in state.rentals; preserve state.orders as legacy history.
- Only confirmed inclusive date ranges block the same listing and variant.
- Keep rental creation and seller confirmation inside existing IndexedDB transactions.
```

Update `IMPLEMENTATION-REPORT.md` with the final files changed, test count, browser scenarios, current Git commit, and Vercel URL.

- [ ] **Step 2: Start the local server**

Run: `npm start`

Expected: server reports `http://127.0.0.1:4173` and stays running in a session.

- [ ] **Step 3: Verify the buyer journey in a real browser**

Using the browser verification tool, perform these exact actions:

1. Open `http://127.0.0.1:4173/#shop`.
2. Confirm cards show `/ วัน`, search and filters still update the catalog.
3. Open an item not owned by the active account.
4. Select an available size and dates spanning three inclusive days.
5. Confirm the summary equals daily price multiplied by three.
6. Submit and confirm the `Rental Request Created` view shows `รอยืนยัน`.
7. Reload `#closet/rentals` and confirm the booking persists.

- [ ] **Step 4: Verify the seller journey and cross-account status**

Continue in the same browser storage:

1. Record the seller name from the booking.
2. Switch to that seller profile.
3. Open `#closet/requests` and confirm the booking details match.
4. Click `ยืนยันการเช่า` and confirm status becomes `ยืนยันแล้ว`.
5. Switch back to the renter.
6. Open `#closet/rentals` and confirm status is `ยืนยันแล้ว`.
7. Attempt the same size with overlapping dates and confirm the UI preserves dates while showing an availability error.
8. Create a request beginning the day after the first return date and confirm it succeeds.

- [ ] **Step 5: Verify 3D Studio and listing regressions**

In the same run:

1. Open `#studio`; verify the mannequin renders and rotates.
2. Switch female/male bodies and use front/left/back/right camera buttons.
3. Mix top, bottom, wig, and accessory from separate items.
4. Change a size and an item transform; verify the mannequin stays visible.
5. Click `เช่าชิ้นนี้`; verify the same rental dialog opens with the selected variant.
6. Open the listing form; confirm rental copy, multi-size inputs, defect photo flow, and per-day price labels.
7. Check a viewport at or below 430px: rental dates stack, booking status remains visible, Marketplace and Studio stay usable.

- [ ] **Step 6: Fix only defects found by acceptance checks and add regression coverage**

For each observed defect, first add the smallest automated test that reproduces it in `tests/rental-domain.test.mjs` or `tests/navigation.test.mjs`, run that test to see it fail, make the focused source/CSS correction, and rerun the focused test. Do not refactor the 3D renderer while correcting rental UI.

- [ ] **Step 7: Run final verification from a clean working tree candidate**

Run:

```powershell
npm test
node --check app.js
node --check cosplay-domain.js
node --check cosplay-seed.js
node --check cosplay-seller.js
node --check repository.js
node --check studio-ui.js
git diff --check
git status --short
```

Expected: all tests PASS, syntax checks and `git diff --check` print no errors, and status contains only intended documentation or QA fixes.

- [ ] **Step 8: Commit final QA and documentation**

```powershell
git add README.md AGENTS.md IMPLEMENTATION-REPORT.md app.js cosplay.css cosplay-seller.js studio-ui.js tests/rental-domain.test.mjs tests/navigation.test.mjs
git commit -m "docs: document and verify rental marketplace demo"
```

If some listed source files have no QA changes, Git simply stages the files that differ.

- [ ] **Step 9: Push and verify the remote commit**

```powershell
git push origin main
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
```

Expected: push succeeds and the two revision hashes are identical. Never use `--force`.

- [ ] **Step 10: Verify the deployed rental demo**

Open `https://closet-flax-one.vercel.app/#shop`, wait for the deployment tied to the pushed commit, and repeat the short path Product Detail → rental dialog → My Rentals plus a 3D Studio load. Record the deployed URL and verified commit in `IMPLEMENTATION-REPORT.md`; if this final documentation change creates a new commit, push it and recheck `origin/main` once.
