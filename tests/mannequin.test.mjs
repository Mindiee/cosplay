import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS,BODY_LIMITS,validateBody,calculateFit,calculateFitMatch,bodyGeometry,garmentGeometry} from '../mannequin.js';

test('every body field validates finite numeric limits including boundaries',()=>{
  for(const [key,[min,max]]of Object.entries(BODY_LIMITS)){
    for(const value of [min,max])assert.deepEqual(validateBody({...PRESETS.Regular,[key]:value}),[]);
    for(const value of [min-.1,max+.1,NaN,Infinity,'90',null,undefined])assert.equal(validateBody({...PRESETS.Regular,[key]:value}).length,1,key);
  }
  for(const body of Object.values(PRESETS))assert.deepEqual(validateBody(body),[]);
});
test('fit uses the exact shoulder and circumference ease thresholds',()=>{
  for(const key of ['shoulder','chest','waist','hip']){
    const first=key==='shoulder'?2:6,second=key==='shoulder'?4:12;
    for(const [delta,status]of [[-.01,'tight'],[0,'good'],[first,'good'],[first+.01,'slightly_loose'],[second,'slightly_loose'],[second+.01,'loose']]){
      const row=calculateFit(PRESETS.Regular,{[key]:PRESETS.Regular[key]+delta},'knee').find(r=>r.key===key);
      assert.equal(row.status,status,`${key} ${delta}`);assert.equal(row.delta,delta);
    }
  }
});
test('length is shoulder to target; missing values do not produce fit claims',()=>{
  for(const [target,ratio]of Object.entries({waist:.22,knee:.52,ankle:.76}))for(const [delta,status]of [[-5.01,'short'],[-5,'good'],[5,'good'],[5.01,'long']])assert.equal(calculateFit(PRESETS.Regular,{length:165*ratio+delta},target)[4].status,status);
  for(const value of [undefined,null,0,-1,Infinity,NaN,'92'])assert.ok(calculateFit(PRESETS.Regular,{chest:value}).every(r=>r.status==='unknown'&&r.delta===null&&r.explanation));
  assert.equal(calculateFit(PRESETS.Regular,{length:100},'other')[4].status,'unknown');
});
test('each circumference and shoulder changes only its own body width',()=>{
  const baseline=bodyGeometry(PRESETS.Regular);
  assert.deepEqual([baseline.shoulderY,baseline.chestY,baseline.waistY,baseline.hipY,baseline.kneeY,baseline.ankleY],[130,185,260,305,410,550]);
  for(const key of ['shoulder','chest','waist','hip']){
    const result=bodyGeometry({...PRESETS.Regular,[key]:PRESETS.Regular[key]+10});
    assert.ok(result[key]>baseline[key]);
    for(const other of Object.keys(baseline).filter(k=>k!==key))assert.equal(result[other],baseline[other]);
  }
  const tall=bodyGeometry({...PRESETS.Regular,height:220});
  assert.ok(tall.head>0&&tall.head<baseline.head);assert.ok(tall.shoulderY<baseline.shoulderY);assert.equal(tall.waist,baseline.waist);
});
test('garment widths and length scale independently, without body input',()=>{
  const reference={shoulder:40,chest:90,waist:72,hip:96,length:165*.76};
  assert.deepEqual(garmentGeometry(reference),{shoulder:1,chest:1,waist:1,hip:1,length:1});
  for(const key of Object.keys(reference)){
    const result=garmentGeometry({...reference,[key]:reference[key]*1.2});
    assert.equal(result[key],1.2);
    for(const other of Object.keys(reference).filter(k=>k!==key))assert.equal(result[other],1);
  }
});

test('Fit Match uses required measurements, status weights, and the Tight score cap',()=>{
  const top={category:'top',lengthTarget:'waist'},bottom={category:'bottom',lengthTarget:'ankle'},set={lengthTarget:'knee'};
  const perfect={measurements:{shoulder:40,chest:90,waist:72,hip:96,length:165*.52}};
  assert.equal(calculateFitMatch(PRESETS.Regular,top,perfect).score,100);
  assert.equal(calculateFitMatch(PRESETS.Regular,bottom,{measurements:{waist:78,hip:108,length:165*.76}}).score,92);
  assert.equal(calculateFitMatch(PRESETS.Regular,set,{measurements:{shoulder:39,chest:89,waist:71,hip:95,length:165*.52}}).score,36);
  assert.equal(calculateFitMatch(PRESETS.Regular,top,{measurements:{shoulder:39,chest:102,waist:84}}).score,49);
});

test('Fit Match is unavailable for unsaved or incomplete measurements and accessories',()=>{
  assert.equal(calculateFitMatch(null,{category:'top'},{measurements:{shoulder:40,chest:90,waist:72}}),null);
  assert.equal(calculateFitMatch(PRESETS.Regular,{category:'top'},{measurements:{shoulder:40,chest:90}}),null);
  assert.equal(calculateFitMatch(PRESETS.Regular,{category:'wig'},{measurements:{shoulder:40,chest:90,waist:72}}),null);
});
