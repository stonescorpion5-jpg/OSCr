import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soloPath } from '../src/mixer/solo';
import { queryPaths, strips, master } from '../src/mixer/model';
test('XR18 solo mapping accounts for the USB solo slots',()=>{
  for(const [id, index] of [['/ch/01','01'],['/ch/16','16'],['/rtn/aux','17'],['/rtn/1','18'],['/rtn/4','21'],['/bus/1','40'],['/bus/6','45'],['/fxsend/1','46'],['/fxsend/4','49'],['/lr','50']]) assert.equal(soloPath(id),`/-stat/solosw/${index}`);
  assert.equal(soloPath('/ch/17'),undefined);assert.equal(soloPath('/bus/7'),undefined);
});
test('all displayed strips read back solo state without duplicate queries',()=>{
  const paths=queryPaths(); for(const strip of [...strips,master]) assert.ok(paths.includes(soloPath(strip.id)!));
  assert.equal(new Set(paths).size,paths.length);
});
