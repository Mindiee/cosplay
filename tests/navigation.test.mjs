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
