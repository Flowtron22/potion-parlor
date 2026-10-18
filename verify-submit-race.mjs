import assert from 'node:assert/strict';
import vm from 'node:vm';
import {clientHarness} from './verify-blocked.mjs';
let finish,starts=0;const c=clientHarness({online:{start:()=>Promise.resolve({id:'ticket-'+(++starts),points:0}),submit:()=>new Promise(resolve=>{finish=resolve;})}});await new Promise(setImmediate);
vm.runInContext("state.over=true;showEnd(false);globalThis.pending=document.getElementById('postScore').onclick()",c);await new Promise(setImmediate);assert(finish,'Submit should start');
vm.runInContext('newGame(1,initial);state.over=true;showEnd(false)',c);await Promise.resolve();finish({rank:1});await c.pending;
assert.equal(vm.runInContext("document.getElementById('postScore').textContent",c),'Submit score');assert.notEqual(vm.runInContext('runTicket?.id',c),'ticket-1');
console.log('PASS: late submission responses cannot overwrite a restarted run or its ticket.');
