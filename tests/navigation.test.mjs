import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const lender = await readFile(new URL('lender-ui.js', root), 'utf8');

test('standalone My Mannequin navigation is removed while 3D Studio stays available', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('app.js', root), 'utf8'),
  ]);

  assert.doesNotMatch(html, /href=["']#mannequin["']/);
  assert.doesNotMatch(html, />My Mannequin</);
  assert.doesNotMatch(app, /route\s*===\s*["']mannequin["']/);
  assert.doesNotMatch(app, /mannequin\s*:\s*["']My Mannequin["']/);

  assert.match(html, /href=["']#studio["']/);
  assert.match(app, /createStudioUI\(/);
  assert.match(app, /route\s*===\s*["']studio["']/);
});

test('TooSueaPha Figma navigation keeps marketplace, rentals and lender actions reachable',async()=>{
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
  assert.match(html,/<title>TooSueaPha — Rental Marketplace<\/title>/);
  assert.match(html,/class="brand" href="#home"[^>]*>Too<span>SueaPha<\/span>/);
  assert.match(html,/class="figma-nav-links"/);
  assert.match(html,/href="#shop"[^>]*>Marketplace<\/a>/);
  assert.match(html,/href="#rentals"[^>]*>My Rentals<\/a>/);
  assert.match(html,/href="#saved"[^>]*>Saved<\/a>/);
  assert.match(html,/href="#closet\/listings"[^>]*>My Closet<\/a>/);
  assert.match(html,/id="accountBtn"[^>]*>เข้าสู่ระบบเช่าชุด<\/button>/);
  assert.match(app,/route==='rentals'\?rentalsPage\(\)/);
  assert.match(app,/route==='saved'\?savedPage\(\)/);
  assert.match(app,/href:'#rentals'/);
  assert.match(lender,/href:`#closet\/\$\{key\}`/);
  assert.match(lender,/nav\('listings'/);
  assert.match(lender,/nav\('requests','การเช่า'/);
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

test('Home matches the supplied Figma sections and reuses the existing 3D hero renderer',async()=>{
  const [app,styles]=await Promise.all([
    readFile(new URL('app.js',root),'utf8'),
    readFile(new URL('toosuepha.css',root),'utf8'),
  ]);
  assert.match(app,/function homePage\(\)/);
  assert.match(app,/Find what fits\./);
  assert.match(app,/Rent what you need\./);
  assert.match(app,/ตู้เสื้อผ้า/);
  assert.match(app,/สำหรับทุกโอกาส เช็กความพอดีและลองก่อนเช่า/);
  assert.match(app,/ปัดเพื่อดูรูปถัดไป/);
  assert.match(app,/onpointerup:e=>/);
  assert.match(app,/class:'home-hero-copy'/);
  assert.match(app,/class:'home-hero-actions'/);
  assert.match(app,/href:'#shop'/);
  assert.match(app,/href:'#studio'/);
  assert.match(app,/mountHeroStudio\(heroHost,heroStatus\)/);
  assert.match(app,/เสื้อผ้าสำหรับทุกโอกาสของคุณ/);
  assert.match(app,/ชุดนี้จะพอดีกับเราไหม/);
  assert.match(app,/TooSueaPha ช่วยให้คุณตัดสินใจได้ก่อนเช่า/);
  assert.match(app,/จากสัดส่วนสู่ชุดที่เหมาะกับคุณ ช่วยให้ตัดสินใจเช่าได้ง่ายขึ้น/);
  assert.match(app,/พร้อมสร้างหุ่นจำลอง 3D ของคุณแล้วหรือยัง/);
  assert.match(styles,/\.home-hero-title/);
  assert.match(styles,/\.home-hero \.studio-hero/);
  assert.match(styles,/\.figma-nav-links/);
  assert.match(styles,/\.home-hero-description/);
  assert.match(styles,/\.home-hero-actions/);
  assert.match(app,/select\('type','ประเภทเสื้อผ้า'/);
  assert.match(app,/select\('occasion','หมวดหมู่หลัก'/);
  assert.doesNotMatch(app,/market-advanced-filters/);
  assert.match(app,/class:'market-date-range'/);
  assert.match(app,/class:'marketplace-filters'/);
});

test('Home uses the Figma icon language, centered search, and one explicit type system',async()=>{
  const [html,app,styles]=await Promise.all([
    readFile(new URL('index.html',root),'utf8'),
    readFile(new URL('app.js',root),'utf8'),
    readFile(new URL('toosuepha.css',root),'utf8'),
  ]);
  const homeSource=app.slice(app.indexOf('function homePage()'),app.indexOf('function marketplace()'));
  assert.match(app,/function uiIcon\(name/);
  for(const icon of ['search','mannequin','userPlus','arrowRight'])assert.match(homeSource,new RegExp(`uiIcon\\('${icon}'`));
  for(const icon of ['scanCube','ruler','bag'])assert.match(homeSource,new RegExp(`'${icon}'`));
  assert.match(homeSource,/uiIcon\(icon,'ui-icon step-icon'\)/);
  assert.doesNotMatch(homeSource,/[◇▤♙⌕←→]/);
  assert.match(html,/class="ui-icon nav-search-icon"/);
  assert.match(html,/class="ui-icon nav-plus-icon"/);
  assert.match(html,/class="ui-icon footer-shield-icon"/);
  assert.doesNotMatch(html,/[＋◉]/);
  assert.match(styles,/--ui-font:"Inter","Anuphan",sans-serif/);
  assert.match(styles,/\.topbar \.global-search\{position:absolute;left:50%;transform:translateX\(-50%\)/);
  assert.match(styles,/font-family:var\(--ui-font\)/);
});

test('My Rentals has overview history and one booking detail route for receive and return',async()=>{
  const [app,styles]=await Promise.all([
    readFile(new URL('app.js',root),'utf8'),
    readFile(new URL('toosuepha.css',root),'utf8'),
  ]);
  assert.match(app,/function rentalDetailPage\(/);
  assert.match(app,/route==='rental'\?rentalDetailPage\(id\)/);
  assert.match(app,/class:'rental-feature'/);
  assert.match(app,/class:'rental-tabs'/);
  assert.match(app,/class:'rental-table-row'/);
  assert.match(app,/ขั้นตอนรับชุด/);
  assert.match(app,/ขั้นตอนคืนชุด/);
  assert.match(app,/Mock Payment/);
  assert.match(app,/Mock Escrow/);
  assert.doesNotMatch(app,/#(?:receive|return)\//);
  assert.match(styles,/\.rental-feature/);
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
  assert.match(lender,/function overview\(/);
  assert.match(lender,/function listings\(/);
  assert.match(lender,/function orders\(/);
  assert.match(lender,/ส่งชุดเข้าคลังกลาง/);
  assert.match(lender,/คำสั่งเช่า/);
  assert.match(lender,/รับชุดคืน/);
  assert.match(lender,/ดูรายได้และ Escrow จำลอง/);
  assert.match(app,/function lenderBookingCard\(/);
  assert.match(app,/function lenderListingCard\(/);
  assert.match(styles,/\.lender-summary-grid/);
  assert.match(styles,/\.lender-booking-card/);
  assert.match(styles,/\.lender-listing-card/);
  assert.match(styles,/\.lender-ledger/);
  assert.match(styles,/\.partner-header/);
  assert.match(styles,/\.partner-sidebar/);
  assert.match(styles,/\.partner-table/);
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
