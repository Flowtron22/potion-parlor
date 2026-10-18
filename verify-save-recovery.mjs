import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {boards,winningEvents,clientHarness} from './verify-blocked.mjs';
import {losingEvents,testDatabase} from './verify-survival.mjs';
import {createLeaderboardAPI} from './server/leaderboard-api.mjs';
import {validateRun,validateScore} from './server/validate-blocked.mjs';
import {GemPhysics} from './server/physics.mjs';
const win=winningEvents(boards[0]),loss=[...losingEvents(boards[1]),{type:'end'}],expected=validateRun(boards[0],win).score+validateRun(boards[1],loss,'defeat').score;
// Reproduce contact divergence between Node and the production Worker.
const bottom=GemPhysics.prototype.bottom;GemPhysics.prototype.bottom=()=>[];
try{
 assert.throws(()=>validateRun(boards[0],win),/Blocked floor/);
 assert.equal(validateScore(boards[0],win).score,validateRun(boards[0],win,'win',{floor:false}).score);
 const missing=structuredClone(win);missing.find(e=>e.type==='draw').drops[0].gem=9999;assert.throws(()=>validateScore(boards[0],missing),/reservation/);
 const duplicate=structuredClone(win),draws=duplicate.filter(e=>e.type==='draw');draws[1].drops[0].gem=draws[0].drops[0].gem;assert.throws(()=>validateScore(boards[0],duplicate),/reservation/);
 assert.throws(()=>validateScore(boards[0],[{type:'place',tile:boards[0].queue.find(t=>t.blockers.length).id},...win]),/Blocked flask/);
}finally{GemPhysics.prototype.bottom=bottom;}
const {db,DB}=testDatabase(),api=createLeaderboardAPI(DB,boards),values=new Map();let cookie='',failStart=true,failSave=true,runs=0;
const fetcher=async(path,options)=>{
 if(path==='/api/runs'){runs++;if(failStart){failStart=false;throw Error('temporarily offline');}}
 if(path==='/api/scores'&&failSave)throw Error('temporarily offline');
 const handler={'/api/runs':api.start,'/api/scores':api.submit}[path],request=new Request('https://game.test'+path,{...options,headers:{...options.headers,Cookie:cookie}}),response=await handler(request);
 if(response.headers.get('Set-Cookie'))cookie=response.headers.get('Set-Cookie').split(';')[0];return response;
};
function context(){
 const elements=new Map(),c=vm.createContext({console,fetch:fetcher,PotionChallenge:{ruleset:()=> 'survival-v9'},localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,{classList:{add(){},remove(){}},setAttribute(){},focus(){}});return elements.get(id);},addEventListener(){}},window:{addEventListener(){}}});
 vm.runInContext(fs.readFileSync('public/play/online.js','utf8'),c);return c;
}
const c=context();assert.equal(await c.window.PotionOnline.start(1),null);
const recovery={id:'recovery-regression',stages:[{level:1,events:win}],level:2,daily:false};
await assert.rejects(c.window.PotionOnline.submit(null,'Recovery Brewer',loss,'Apprentice',recovery));
assert.equal(db.prepare('SELECT COUNT(*) n FROM scores').get().n,0);
assert.equal(JSON.parse(values.get('potion-final-scores-v1'))[0].ticket,recovery.ticket);
assert.equal(runs,3);
failSave=false;context();for(let i=0;i<15&&JSON.parse(values.get('potion-final-scores-v1')).length;i++)await new Promise(setImmediate);
assert.equal(JSON.parse(values.get('potion-final-scores-v1')).length,0);
const saved=db.prepare('SELECT * FROM scores').get();assert.equal(saved.score,expected);assert.equal(saved.name,'Recovery Brewer');assert.equal(saved.title,'Apprentice');assert.equal(runs,3);
await c.window.PotionOnline.submit(null,'Renamed Brewer',loss,'Squire',recovery);
assert.equal(db.prepare('SELECT COUNT(*) n FROM scores').get().n,1);assert.equal(db.prepare('SELECT title FROM scores').get().title,'Apprentice');
const list=await(await api.leaderboard(new Request('https://game.test/api/leaderboard',{headers:{Cookie:cookie}}))).json();assert.equal(list.rows[0].score,expected);assert.equal(list.rows[0].name,'Renamed Brewer');assert.equal(list.rows[0].you,true);db.close();
const game=clientHarness();vm.runInContext('runLog.push({type:"place",tile:1});newGame(2,initial,false,true);state.over=true;showEnd(false)',game);
assert.equal(vm.runInContext('finalRun.recovery.stages.length',game),1);assert.equal(vm.runInContext('finalRun.recovery.stages[0].events[0].tile',game),1);
console.log('PASS: contact drift tolerance; invalid supply and locks rejected; missing ticket rebuilt across wins; pending final save survives reload; cumulative leaderboard points and idempotent rename.');
