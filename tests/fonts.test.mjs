import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile,stat} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
test('Thai Anuphan and English Inter are self-hosted with consistent weights',async()=>{
  const css=await readFile(new URL('toosuepha.css',root),'utf8');
  for(const file of ['anuphan-thai.woff2','inter-latin.woff2']){
    const path=new URL(`assets/fonts/${file}`,root);
    await access(path);
    assert.ok((await stat(path)).size>10_000,`${file} must be a real font file`);
  }
  await access(new URL('assets/fonts/OFL.txt',root));
  assert.match(css,/font-family:"Anuphan"/);
  assert.match(css,/font-family:"Inter"/);
  assert.match(css,/unicode-range:U\+0E00-0E7F/);
  assert.match(css,/unicode-range:U\+0000-024F/);
  assert.equal((css.match(/font-weight:300 700/g)||[]).length,2);
  assert.match(css,/--ui-font:"Anuphan","Inter",sans-serif/);
  assert.match(css,/body,button,input,select,textarea\{font-family:var\(--ui-font\)!important/);
});
