import test from 'node:test';
import assert from 'node:assert/strict';
import { gainFromWire, headampRoot, hpfFromWire, inputPaths, linkPath } from '../src/mixer/input';
import { queryPaths } from '../src/mixer/model';
test('preamp follows assigned analog source and excludes aux/off', () => {
  assert.equal(headampRoot(0), '/headamp/01');
  assert.equal(headampRoot(15), '/headamp/16');
  for (const source of [16, 17, 18, undefined, -1, .5]) assert.equal(headampRoot(source), undefined);
  assert.equal(gainFromWire(0), -12);
  assert.equal(gainFromWire(1), 60);
});
test('stereo links use fixed odd/even channel pairs', () => {
  assert.equal(linkPath('/ch/01'), '/config/chlink/1-2');
  assert.equal(linkPath('/ch/02'), '/config/chlink/1-2');
  assert.equal(linkPath('/ch/16'), '/config/chlink/15-16');
  assert.equal(linkPath('/rtn/1'), undefined);
});
test('input reads respect processing capability and cover all headamps', () => {
  assert.equal(hpfFromWire(0), 20);
  assert.equal(hpfFromWire(1), 400);
  assert.ok(inputPaths('/ch/01').includes('/ch/01/preamp/hpf'));
  assert.deepEqual(inputPaths('/rtn/1'), ['/rtn/1/preamp/rtnsw', '/rtn/1/preamp/rtntrim']);
  assert.deepEqual(inputPaths('/bus/1'), []);
  assert.ok(queryPaths().includes('/headamp/16/phantom'));
});
