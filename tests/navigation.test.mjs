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

test('Closet branch opens Marketplace and removes Home and lender routes',async()=>{
  const [html,app,shell,styles]=await Promise.all([
    readFile(new URL('index.html',root),'utf8'),
    readFile(new URL('app.js',root),'utf8'),
    readFile(new URL('renter-shell.js',root),'utf8'),
    readFile(new URL('toosuepha.css',root),'utf8'),
  ]);
  assert.match(html,/class="brand" href="#shop"/);
  assert.match(html,/href="#shop"[^>]*>Marketplace<\/a>/);
  assert.match(html,/href="#rentals"[^>]*>My Rentals<\/a>/);
  assert.match(html,/href="#saved"[^>]*>Saved<\/a>/);
  assert.doesNotMatch(html,/#home|#closet\/|id="sellBtn"|My Closet/);
  assert.doesNotMatch(shell,/#home|#closet\/|ปล่อยเช่า/);
  assert.doesNotMatch(app,/function homePage\(|function closetPage\(|createLenderPortal|route==='closet'/);
  assert.match(app,/location\.replace\(`/);
  for(const route of ['shop','product','tryon','rentals','saved','rental','studio'])assert.match(app,new RegExp("'"+route+"'"));
  assert.match(app,/createStudioUI\(/);
  assert.match(app,/mountHeroStudio\(previewCanvas,previewStatus\)/);
  assert.match(app,/function openRental\(/);
  assert.match(app,/rentalBag\.add/);
  assert.match(app,/rental\.checkout/);
  assert.match(styles,/@media\(max-width:760px\)/);
});

test('My Rentals has overview history and one booking detail route for receive and return',async()=>{
  const [app,styles]=await Promise.all([
    readFile(new URL('app.js',root),'utf8'),
    readFile(new URL('toosuepha.css',root),'utf8'),
  ]);
  assert.match(app,/function rentalDetailPage\(/);
  assert.match(app,/rentalDetailPage\(id\)/);
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
