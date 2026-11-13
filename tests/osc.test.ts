import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'buffer';
import { encode, decode, faderDb } from '../src/mixer/osc';
import { queryPaths, strips } from '../src/mixer/model';
test('XR18 fader command uses padded OSC strings and a big-endian float', () => {
  const packet = encode('/ch/01/mix/fader', [{ type: 'f', value: .75 }]);
  assert.equal(packet.toString('hex'), '2f63682f30312f6d69782f6661646572000000002c6600003f400000');
  assert.deepEqual(decode(packet), { address: '/ch/01/mix/fader', args: [.75] });
});
test('queries carry no value and mute booleans use integer tags', () => {
  assert.deepEqual(decode(encode('/xinfo')), { address: '/xinfo', args: [] });
  const packet = encode('/lr/mix/on', [{ type: 'i', value: 0 }]);
  assert.equal(Buffer.from(packet.subarray(-8)).toString('hex'), '2c69000000000000');
});
test('decodes mixer identity and UTF-8 names', () => {
  const args = ['192.168.1.1', 'Stage', 'XR18', '1.22'];
  assert.deepEqual(decode(encode('/xinfo', args.map(value => ({type:'s',value})))), {address:'/xinfo',args});
  assert.deepEqual(decode(encode('/ch/01/config/name', [{type:'s',value:'Voz 🎤'}])).args, ['Voz 🎤']);
});
test('rejects truncated, unterminated, and unsupported packets', () => {
  assert.throws(() => decode(Buffer.from('/missing-null')));
  assert.throws(() => decode(encode('/a', [{type:'f',value:.5}]).subarray(0, 10)));
  assert.throws(() => decode(Buffer.from('#bundle\0')));
});
test('fader taper maps XR18 landmarks to dB', () => {
  for (const [v, db] of [[0,-Infinity],[.0625,-60],[.25,-30],[.5,-10],[.75,0],[1,10]]) assert.equal(faderDb(v), db);
});
test('XR18 addresses cover 16 inputs, stereo aux, 4 returns, 6 buses, 4 FX sends and LR', () => {
  assert.equal(strips.length, 31);
  const paths = queryPaths();
  for (const path of ['/ch/16/mix/fader','/rtn/aux/mix/on','/rtn/4/mix/fader','/bus/6/mix/fader','/fxsend/4/mix/fader','/lr/mix/fader','/ch/01/mix/10/level']) assert.ok(paths.includes(path));
  assert.equal(new Set(paths).size, paths.length);
});

test('return levels are synchronized for all six bus mixes', () => {
  const paths = queryPaths();
  for (const root of ['/rtn/aux', '/rtn/1', '/rtn/2', '/rtn/3', '/rtn/4']) {
    for (let bus = 1; bus <= 6; bus++) assert.ok(paths.includes(`${root}/mix/${String(bus).padStart(2, '0')}/level`));
    assert.ok(!paths.includes(`${root}/mix/07/level`));
  }
});
