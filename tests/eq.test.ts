import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frequencyFromWire, frequencyToWire, gainFromWire, gainToWire, qFromWire, qToWire, bandCount, readBands, responseDb, type EqBand } from '../src/mixer/eq';
import { queryPaths } from '../src/mixer/model';
const near = (a: number,b: number) => assert.ok(Math.abs(a-b)<1e-6, `${a} != ${b}`);
test('EQ normalized frequency, gain and inverted Q round trip', () => {
  for (const f of [20, 100, 1000, 20000]) near(frequencyFromWire(frequencyToWire(f)), f);
  for (const g of [-15,0,15]) near(gainFromWire(gainToWire(g)),g);
  for (const q of [.3,1.4,10]) near(qFromWire(qToWire(q)),q);
  near(qFromWire(0),10); near(qFromWire(1),.3);
});
test('bell response has specified center gain and flat response at zero gain', () => {
  const band: EqBand = {index:1, frequency:1000,gain:6,q:1.4,type:2,ready:true};
  near(responseDb(band,1000),6);
  for (const f of [20,200,1000,10000,20000]) near(responseDb({...band,gain:0},f),0);
});
test('all filter models produce finite responses over the supported domain', () => {
  for (let type=0;type<6;type++) for (const frequency of [20,1000,20000]) for (const q of [.3,10]) for(const gain of [-15,15]) for(const f of [20,100,1000,10000,20000]) assert.ok(Number.isFinite(responseDb({index:1,frequency,q,gain,type,ready:true},f)));
});
test('EQ reads four channel/return bands, six bus/main bands, and no FX-send EQ', () => {
  assert.equal(bandCount('/ch/01'),4); assert.equal(bandCount('/rtn/1'),4); assert.equal(bandCount('/bus/6'),6); assert.equal(bandCount('/lr'),6); assert.equal(bandCount('/fxsend/1'),0);
  const paths=queryPaths();
  for (const p of ['/ch/01/eq/4/type','/rtn/4/eq/4/q','/bus/6/eq/6/f','/lr/eq/6/g','/lr/eq/mode']) assert.ok(paths.includes(p));
  assert.equal(readBands('/ch/01',{}).every(b=>b.ready),false);
  assert.equal(new Set(paths).size,paths.length);
});
