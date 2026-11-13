import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dynamicsValue, dynamicsWire, ratios, transferDb, type Transfer } from '../src/mixer/dynamics';
import { queryPaths } from '../src/mixer/model';
test('dynamics normalized ranges and time curves round trip',()=>{
  for(const kind of ['gate','dyn'] as const) for(const [field,values] of Object.entries({thr:kind==='gate'?[-80,-40,0]:[-60,-18,0],attack:[0,30,120],hold:[.02,80,2000],release:[5,220,4000],range:[3,45,60],mgain:[0,12,24]})) for(const value of values) assert.ok(Math.abs(dynamicsValue(kind,field,dynamicsWire(kind,field,value))-value)<1e-6);
});
const base:Transfer={kind:'dyn',threshold:-20,mode:0,range:40,ratio:4,makeup:0};
test('compression model has unity below threshold and ratio above it',()=>{assert.equal(transferDb(-30,base),-30);assert.equal(transferDb(0,base),-15);assert.equal(transferDb(-20,base),-20);});
test('gate, expander and duck models use the expected side of the threshold',()=>{
  assert.equal(transferDb(-30,{...base,kind:'gate',mode:3}),-70);
  assert.equal(transferDb(-10,{...base,kind:'gate',mode:3}),-10);
  assert.equal(transferDb(-10,{...base,kind:'gate',mode:4}),-50);
  assert.equal(transferDb(-30,{...base,kind:'gate',mode:0}),-40);
});
test('sync paths respect XR18 dynamics availability and ratio enumeration',()=>{
  const paths=queryPaths();for(const p of ['/ch/01/gate/thr','/ch/16/gate/release','/ch/01/dyn/ratio','/bus/6/dyn/mgain','/lr/dyn/hold']) assert.ok(paths.includes(p));
  assert.ok(!paths.includes('/rtn/1/gate/thr'));assert.ok(!paths.includes('/fxsend/1/dyn/thr'));assert.equal(ratios[6],4);assert.equal(ratios[11],100);assert.equal(new Set(paths).size,paths.length);
});
