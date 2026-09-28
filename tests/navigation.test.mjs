import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('standalone My Mannequin navigation is removed while 3D Studio stays available', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('app.js', root), 'utf8'),
  ]);

  assert.doesNotMatch(html, /href=["']#mannequin["']/);
  assert.doesNotMatch(html, />My Mannequin</);
  assert.doesNotMatch(app, /route\s*===\s*["']mannequin["']/);
  assert.doesNotMatch(app, /mannequin\s*:\s*["']My Mannequin["']/);

  assert.match(html, /href=["']#studio["'][^>]*>เปิด 3D Studio/);
  assert.match(app, /createStudioUI\(/);
  assert.match(app, /route\s*===\s*["']studio["']/);
});

test('TooSuePha navigation separates home, marketplace, Studio, rentals and lender space',async()=>{
  const [html,app,studio,seller,styles]=await Promise.all([
    readFile(new URL('index.html',root),'utf8'),
    readFile(new URL('app.js',root),'utf8'),
    readFile(new URL('studio-ui.js',root),'utf8'),
    readFile(new URL('cosplay-seller.js',root),'utf8'),
    readFile(new URL('toosuepha.css',root),'utf8'),
  ]);
  assert.match(app,/function openRental\(/);
  assert.match(app,/rentalBag\.add/);
  assert.match(app,/rental\.checkout/);
  assert.match(html,/<title>TooSuePha — Rental Marketplace<\/title>/);
  assert.match(html,/class="brand" href="#home"[^>]*>TooSuePha/);
  assert.match(html,/<nav class="mode-switch"[^>]*><a href="#shop">เช่า<\/a><a href="#closet\/listings">ปล่อยเช่า<\/a><\/nav>/);
  assert.match(html,/href="#rentals"[^>]*aria-label="My Rentals"/);
  assert.match(html,/href="#saved"[^>]*aria-label="Saved"/);
  assert.match(html,/href="#closet\/listings"[^>]*aria-label="My Closet"/);
  assert.match(app,/route==='rentals'\?rentalsPage\(\)/);
  assert.match(app,/route==='saved'\?savedPage\(\)/);
  assert.match(app,/href:'#rentals'/);
  assert.match(app,/const tabs=\{listings:'My Listings',requests:'Rental Requests'\}/);
  assert.match(app,/requests:'Rental Requests'/);
  assert.doesNotMatch(app,/tab==='rentals'|tab==='saved'/);
  assert.doesNotMatch(html,/#closet\/(?:rentals|saved)/);
  assert.match(html,/id="rentalBagBtn"/);
  assert.match(app,/rental\.shipOutbound/);
  assert.match(app,/rental\.shipReturn/);
  assert.match(app,/ชำระจำลองแล้ว/);
  assert.match(app,/completed:'เสร็จสิ้น'/);
  assert.doesNotMatch(app,/ผู้ให้เช่าจะตรวจสอบและยืนยันคำขอ/);
  assert.doesNotMatch(app,/button\('Buy Now'/);
  assert.doesNotMatch(app,/purchases:'Purchases'/);
  assert.doesNotMatch(app,/sold:'Sold'/);
  assert.doesNotMatch(app,/พร้อมซื้อ|ขายหมดแล้ว|พร้อมขาย/);
  assert.match(studio,/ctx\.rental\(item\.id,variant\.id\)/);
  assert.match(studio,/เช่าชิ้นนี้/);
  assert.doesNotMatch(studio,/ctx\.purchase|ซื้อชิ้นนี้/);
  assert.match(seller,/ราคาเช่าต่อวัน/);
  assert.match(html,/ลงชุดให้เช่า/);
  assert.match(html,/rel="stylesheet" href="toosuepha\.css"/);
  assert.doesNotMatch(html,/href="(?:styles|panels|cosplay|cosplay-seller|studio)\.css"/);
  assert.match(styles,/@media\(max-width:760px\)/);
});

test('Home hero reuses the Studio renderer and Marketplace exposes occasion and piece filters',async()=>{
  const [app,heroStudio]=await Promise.all([
    readFile(new URL('app.js',root),'utf8'),
    readFile(new URL('hero-studio.js',root),'utf8'),
  ]);
  assert.match(app,/import\('\.\/hero-studio\.js'\)/);
  assert.match(app,/function homePage\(\)/);
  assert.match(app,/เสื้อผ้าสำหรับทุกโอกาสของคุณ/);
  assert.match(app,/เลือกชุดที่ใช่ ส่งต่อชุดที่มี/);
  assert.match(app,/class:'cosplay-hero-art studio-hero'/);
  assert.doesNotMatch(app,/class:'cosplay-hero-art',href:`#tryon\/\$\{hero\.id\}`/);
  assert.match(app,/select\('theme','ธีม'/);
  assert.match(app,/select\('type','ชนิด'/);
  assert.match(app,/class:'occasion-chips'/);
  assert.match(app,/filters\.occasion=key/);
  assert.match(heroStudio,/from '\.\/studio-renderer\.js'/);
  assert.match(heroStudio,/profileStudio/);
  assert.doesNotMatch(heroStudio,/\.glb['"]/);
});

test('My Rentals has overview history and one booking detail route for receive and return',async()=>{
  const [app,styles]=await Promise.all([
    readFile(new URL('app.js',root),'utf8'),
    readFile(new URL('toosuepha.css',root),'utf8'),
  ]);
  assert.match(app,/function rentalDetailPage\(/);
  assert.match(app,/route==='rental'\?rentalDetailPage\(id\)/);
  assert.match(app,/กำลังเช่าและต้องดำเนินการ/);
  assert.match(app,/ประวัติการเช่า/);
  assert.match(app,/ขั้นตอนรับชุด/);
  assert.match(app,/ขั้นตอนคืนชุด/);
  assert.match(app,/Mock Payment/);
  assert.match(app,/Mock Escrow/);
  assert.doesNotMatch(app,/#(?:receive|return)\//);
  assert.match(styles,/\.rental-overview-card/);
  assert.match(styles,/\.rental-timeline/);
  assert.match(styles,/\.rental-detail-grid/);
});

test('My Closet is one lender workspace with listings requests operations and earnings',async()=>{
  const [app,styles,presenter]=await Promise.all([
    readFile(new URL('app.js',root),'utf8'),
    readFile(new URL('toosuepha.css',root),'utf8'),
    readFile(new URL('lender-presenter.js',root),'utf8'),
  ]);
  assert.match(app,/from '\.\/lender-presenter\.js'/);
  assert.match(app,/const tabs=\{listings:'My Listings',requests:'Rental Requests'\}/);
  assert.match(app,/ต้องทำตอนนี้/);
  assert.match(app,/กำลังดำเนินการ/);
  assert.match(app,/ประวัติ/);
  assert.match(app,/Pending Earnings/);
  assert.match(app,/Available Earnings/);
  assert.match(app,/function lenderBookingCard\(/);
  assert.match(app,/function lenderListingCard\(/);
  assert.match(styles,/\.lender-summary-grid/);
  assert.match(styles,/\.lender-booking-card/);
  assert.match(styles,/\.lender-listing-card/);
  assert.match(styles,/\.lender-ledger/);
  assert.match(presenter,/function lenderBookingBuckets/);
  assert.match(presenter,/function listingRentalSchedule/);
  assert.doesNotMatch(app,/#closet\/(?:dashboard|earnings)/);
});

test('Try-on surfaces use only the existing 3D renderer and never render the 2D mannequin overlay',async()=>{
  const [app,seller,styles]=await Promise.all([
    readFile(new URL('app.js',root),'utf8'),
    readFile(new URL('cosplay-seller.js',root),'utf8'),
    readFile(new URL('toosuepha.css',root),'utf8'),
  ]);
  assert.doesNotMatch(app,/renderMannequin/);
  assert.doesNotMatch(seller,/renderMannequin|seller-mannequin/);
  assert.doesNotMatch(app,/แสดงภาพจริงคู่หุ่น/);
  assert.match(app,/พรีวิว 3D ไม่พร้อมสำหรับสินค้านี้/);
  assert.doesNotMatch(styles,/\.tryon-stage svg|\.no-overlay|\.seller-mannequin/);
  assert.match(app,/mountPreviewStudio\(/);
});
