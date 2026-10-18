import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {clientHarness,boards,winningEvents} from './verify-blocked.mjs';
import {createLeaderboardAPI} from './server/leaderboard-api.mjs';
import {testDatabase} from './verify-survival.mjs';
import {validateRun} from './server/validate.mjs';
const turn=()=>new Promise(setImmediate);
let finish,starts=0,calls=[];
const c=clientHarness({online:{start:()=>Promise.resolve({id:'ticket-'+(++starts),points:0}),submit:(...args)=>{calls.push(args);return new Promise(resolve=>{finish=resolve;});}}});await turn();
vm.runInContext(fs.readFileSync('public/play/mastery.js','utf8'),c);
vm.runInContext('globalThis.profile=PotionMastery.create();for(let stage=1;stage<=4;stage++)profile.award({level:stage,stage,rescued:true});',c);
c.PotionTitles={status:()=>c.profile.status(),finish(){},endRun:()=>c.profile.resetRank(),startRun:()=>c.profile.resetRank()};
vm.runInContext("history.push(snapshot());state.over=true;showEnd(false)",c);
assert.equal(vm.runInContext('finalRun',c),null);assert.equal(c.profile.status().rank.name,'Apprentice');assert.equal(calls.length,0);
vm.runInContext('undo()',c);assert.equal(vm.runInContext('ranked',c),true);assert.equal(c.profile.status().rank.name,'Apprentice');
vm.runInContext('state.over=true;showEnd(false);endRun()',c);await turn();
assert.equal(calls.length,1);assert.equal(calls[0][1],'Brewer');assert.equal(calls[0][3],'Apprentice');assert.equal(calls[0][2].at(-1).type,'end');assert.equal(c.profile.status().rank.name,'Squire');
assert.equal(vm.runInContext('endRun()',c),false);vm.runInContext('undo()',c);assert.equal(vm.runInContext('finalRun.events.at(-1).type',c),'end');
vm.runInContext('newGame(1,initial)',c);await turn();finish({rank:1});await turn();
assert.notEqual(vm.runInContext('runTicket?.id',c),'ticket-1');assert.equal(vm.runInContext("document.getElementById('postScore').textContent",c),'Save score');assert.equal(c.profile.status().rank.name,'Squire');
// A finalized run must still save when its start-ticket response arrives after Restart.
let ready;const delayedCalls=[];let count=0;
const slow=clientHarness({online:{start:()=>++count===1?new Promise(r=>ready=r):Promise.resolve({id:'new',points:0}),submit:async(...args)=>{delayedCalls.push(args);return{rank:2};}}});
vm.runInContext('state.over=true;showEnd(false);newGame(1,initial)',slow);ready({id:'old',points:0});await turn();assert.equal(delayedCalls.length,1);assert.equal(delayedCalls[0][0].id,'old');assert.equal(vm.runInContext('runTicket.id',slow),'new');
const board=boards[0],end=[{type:'end'}];assert.equal(validateRun(board,end,'defeat').score,0);
assert.throws(()=>validateRun(board,end,'win'));assert.throws(()=>validateRun(board,[...end,{type:'place',tile:0}],'defeat'));
const won=winningEvents(board);assert.throws(()=>validateRun(board,[...won,...end],'defeat'));
const {db,DB}=testDatabase(),api=createLeaderboardAPI(DB,boards);let cookie='';
async function post(action,data){const response=await api[action](new Request('https://game.test/api/'+action,{method:'POST',headers:{Cookie:cookie},body:JSON.stringify(data)}));if(response.headers.get('Set-Cookie'))cookie=response.headers.get('Set-Cookie').split(';')[0];return{status:response.status,data:await response.json()};}
const ticket=(await post('start',{level:1})).data;
const first=await post('submit',{ticket:ticket.id,name:'Brewer',title:'Apprentice',events:end});assert.equal(first.status,200);assert.equal(db.prepare('SELECT used FROM runs WHERE id=?').get(ticket.id).used,2);
const retry=await post('submit',{ticket:ticket.id,name:'Juniper',title:'Immortal Alchemist',events:[...won,...end]});assert.equal(retry.status,200);assert.equal(retry.data.score,0);
const row=db.prepare('SELECT name,title,score FROM scores WHERE run=?').get(ticket.id);assert.equal(row.name,'Juniper');assert.equal(row.title,'Apprentice');assert.equal(row.score,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM scores').get().n,1);
assert.equal((await post('start',{level:2,previous:{ticket:ticket.id,events:won}})).status,409);db.close();
// Failed final saves remain in an outbox and retry after reload/reconnect.
const values=new Map(),listeners={},elements=new Map();let offline=true,requests=0;
function onlineContext(){const context=vm.createContext({console,localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},fetch:async()=>{requests++;if(offline)throw Error('offline');return{ok:true,json:async()=>({rank:1})};},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,{classList:{add(){},remove(){}},setAttribute(){},focus(){}});return elements.get(id);},addEventListener(){}},window:{addEventListener:(name,fn)=>listeners[name]=fn}});vm.runInContext(fs.readFileSync('public/play/online.js','utf8'),context);return context;}
const network=onlineContext();await assert.rejects(network.window.PotionOnline.submit({id:'outbox'},'Brewer',end,'Apprentice'));assert.equal(JSON.parse(values.get('potion-final-scores-v1')).length,1);offline=false;onlineContext();await turn();assert.equal(JSON.parse(values.get('potion-final-scores-v1')).length,0);assert.equal(requests,2);
console.log('PASS: rescue and ranked Undo preserve run rank; End captures rank and resets to Squire; automatic final save, restart races, sealed/idempotent scores, rename, continuation rejection and offline outbox recovery.');
