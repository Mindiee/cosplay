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

  assert.match(html, /href=["']#studio["']>3D Studio</);
  assert.match(app, /createStudioUI\(/);
  assert.match(app, /route\s*===\s*["']studio["']/);
});

test('active commerce navigation uses rental wording and routes',async()=>{
  const [html,app,studio,seller,styles]=await Promise.all([
    readFile(new URL('index.html',root),'utf8'),
    readFile(new URL('app.js',root),'utf8'),
    readFile(new URL('studio-ui.js',root),'utf8'),
    readFile(new URL('cosplay-seller.js',root),'utf8'),
    readFile(new URL('styles.css',root),'utf8'),
  ]);
  assert.match(app,/function openRental\(/);
  assert.match(app,/rental\.create/);
  assert.match(html,/<nav aria-label="เมนูหลัก"><a href="#studio">3D Studio<\/a><a href="#shop">Marketplace<\/a><a href="#rentals">My Rentals<\/a><a href="#saved">Saved<\/a><a href="#closet\/listings">My Closet<\/a><\/nav>/);
  assert.match(app,/route==='rentals'\?rentalsPage\(\)/);
  assert.match(app,/route==='saved'\?savedPage\(\)/);
  assert.match(app,/href:'#rentals'/);
  assert.match(app,/const tabs=\{listings:'My Listings',requests:'Rental Requests'\}/);
  assert.match(app,/requests:'Rental Requests'/);
  assert.doesNotMatch(app,/tab==='rentals'|tab==='saved'/);
  assert.doesNotMatch(html,/#closet\/(?:rentals|saved)/);
  assert.match(app,/rental\.confirm/);
  assert.match(app,/rental\.complete/);
  assert.match(app,/completed:'เสร็จสิ้น'/);
  assert.match(app,/ปิดงานเช่า/);
  assert.doesNotMatch(app,/button\('Buy Now'/);
  assert.doesNotMatch(app,/purchases:'Purchases'/);
  assert.doesNotMatch(app,/sold:'Sold'/);
  assert.doesNotMatch(app,/พร้อมซื้อ|ขายหมดแล้ว|พร้อมขาย/);
  assert.match(studio,/ctx\.rental\(item\.id,variant\.id\)/);
  assert.match(studio,/เช่าชิ้นนี้/);
  assert.doesNotMatch(studio,/ctx\.purchase|ซื้อชิ้นนี้/);
  assert.match(seller,/ราคาเช่าต่อวัน/);
  assert.match(html,/ลงชุดให้เช่า/);
  assert.match(styles,/\.topbar nav\{display:flex;order:3;width:100%;flex:0 0 100%;[^}]*overflow-x:auto/);
});
