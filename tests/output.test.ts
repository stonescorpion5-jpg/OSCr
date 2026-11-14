import test from 'node:test';
import assert from 'node:assert/strict';
import { outputPaths, toggleGroup, weightFromWire } from '../src/mixer/output';
import { queryPaths } from '../src/mixer/model';
test('group membership toggles preserve other assignments', () => {
  assert.equal(toggleGroup(5, 1), 7);
  assert.equal(toggleGroup(7, 0), 6);
});
test('output readback respects strip capabilities', () => {
  assert.ok(outputPaths('/ch/01').includes('/ch/01/automix/weight'));
  assert.ok(outputPaths('/rtn/1').includes('/rtn/1/mix/lr'));
  assert.ok(!outputPaths('/rtn/1').some(p => p.includes('automix')));
  assert.ok(!outputPaths('/fxsend/1').includes('/fxsend/1/mix/lr'));
  assert.deepEqual(outputPaths('/lr'), []);
  assert.ok(queryPaths().includes('/bus/1/grp/mute'));
});
test('automix weight spans minus twelve to plus twelve dB', () => {
  assert.equal(weightFromWire(0), -12);
  assert.equal(weightFromWire(.5), 0);
  assert.equal(weightFromWire(1), 12);
});
test('send tap readback covers inputs and returns only', () => {
  const paths = queryPaths();
  assert.ok(paths.includes('/ch/01/mix/10/tap'));
  assert.ok(paths.includes('/rtn/1/mix/06/tap'));
  assert.ok(!paths.includes('/rtn/1/mix/07/tap'));
  assert.ok(!paths.includes('/bus/1/mix/01/tap'));
});
