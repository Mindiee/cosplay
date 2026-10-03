import test from 'node:test';
import assert from 'node:assert/strict';
import {addPreviewPiece,removePreviewPiece} from '../market-preview.js';

const piece=(id,slot)=>({id,attachmentSlot:slot,model:{url:`${id}.glb`},sizeVariants:[{id:`${id}-S`,size:'S'}]});

test('market preview combines different clothing slots and replaces only the selected slot',()=>{
  const top=piece('top','top'),bottom=piece('bottom','bottom'),otherTop=piece('other-top','top');
  const first=addPreviewPiece({},top,top.sizeVariants[0]);
  const second=addPreviewPiece(first,bottom,bottom.sizeVariants[0]);
  const third=addPreviewPiece(second,otherTop,otherTop.sizeVariants[0]);
  assert.deepEqual(Object.keys(second),['top','bottom']);
  assert.equal(third.top.listingId,'other-top');
  assert.equal(third.bottom.listingId,'bottom');
  assert.deepEqual(removePreviewPiece(third,'top'),{bottom:third.bottom});
  assert.equal(first.top.listingId,'top');
});

test('market preview rejects products without a matching 3D piece and valid size',()=>{
  assert.throws(()=>addPreviewPiece({}, {id:'photo',attachmentSlot:'top'}, {id:'x'}),/โมเดล/);
  assert.throws(()=>addPreviewPiece({},piece('top','top'),{id:'other'}),/ไซซ์/);
});
