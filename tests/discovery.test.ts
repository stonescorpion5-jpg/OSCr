import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { encode, decode } from '../src/mixer/osc';
import { autoConnectCandidate, parseDiscoveryReply, scanMixerNetwork } from '../src/mixer/discovery';
const reply=(model='XR18')=>encode('/xinfo',[{type:'s',value:'10.0.0.99'},{type:'s',value:'Stage'},{type:'s',value:model},{type:'s',value:'1.22'}]);
class FakeSocket extends EventEmitter {
  closed=false; broadcast=false; probes=0;
  onProbe:()=>void=()=>{};
  bind(_port:number, callback:()=>void) { callback(); }
  setBroadcast(flag:boolean){this.broadcast=flag;}
  send(bytes:Uint8Array,_offset:number,_length:number,port:number,host:string,callback:(error?:Error)=>void){
    assert.equal(port,10024);assert.equal(host,'255.255.255.255');assert.deepEqual(decode(bytes),{address:'/xinfo',args:[]});this.probes++;this.onProbe();callback();
  }
  close(){this.closed=true;}
}
test('discovery uses the reply source IP and accepts only XR18 identity replies',()=>{
  assert.equal(parseDiscoveryReply(reply(),{address:'192.168.1.40',port:10024})?.host,'192.168.1.40');
  assert.equal(parseDiscoveryReply(reply('X32'),{address:'192.168.1.40',port:10024}),undefined);
  assert.equal(parseDiscoveryReply(reply(),{address:'192.168.1.40',port:10023}),undefined);
  assert.equal(parseDiscoveryReply(encode('/ch/01/mix/fader'),{address:'192.168.1.40',port:10024}),undefined);
});
test('network scan broadcasts read-only queries, deduplicates replies and closes its socket',async()=>{
  const socket=new FakeSocket();socket.onProbe=()=>{for(let n=0;n<2;n++)socket.emit('message',reply(),{address:'192.168.1.40',port:10024});};
  const devices=await scanMixerNetwork(()=>socket,undefined,20);
  assert.equal(devices.length,1);assert.equal(socket.broadcast,true);assert.equal(socket.probes,1);assert.equal(socket.closed,true);
});
test('only a unique result may be selected automatically',()=>{
  const a=parseDiscoveryReply(reply(),{address:'192.168.1.40',port:10024})!,b={...a,host:'192.168.1.41'};
  assert.equal(autoConnectCandidate([]),undefined);assert.equal(autoConnectCandidate([a]),a);assert.equal(autoConnectCandidate([a,b]),undefined);
});
test('scan cancellation closes the socket and prevents late callbacks from completing',async()=>{
  const socket=new FakeSocket(), controller=new AbortController();const scanning=scanMixerNetwork(()=>socket,controller.signal,1000);controller.abort();
  await assert.rejects(scanning,/cancelled/);assert.equal(socket.closed,true);
});
test('socket errors reject a scan and clean up',async()=>{
  const socket=new FakeSocket();socket.onProbe=()=>socket.emit('error',new Error('Local network denied'));
  await assert.rejects(scanMixerNetwork(()=>socket,undefined,1000),/Local network denied/);assert.equal(socket.closed,true);
});
