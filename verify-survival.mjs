import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {createLeaderboardAPI} from './server/leaderboard-api.mjs';
import {validateRun} from './server/validate.mjs';
import {GemPhysics} from './server/physics.mjs';
import {PotionRules} from './server/rules.mjs';
import {boards,winningEvents,clientHarness} from './verify-blocked.mjs';
export function losingEvents(board){
 for(let attempt=0;attempt<60;attempt++){
  let seed=37+attempt*271;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const queue=structuredClone(board.queue),shelf=Array(board.slots).fill(null),world=new GemPhysics(),events=[];world.reset(structuredClone(board.columns));world.settle(3600);
  for(let turn=0;turn<200;turn++){
   const drops=PotionRules.plan(shelf,world.bottom());
   if(drops.length){events.push({type:'draw',drops});for(const d of drops){world.remove(d.gem);events.push({type:'finish',gem:d.gem});const b=shelf[d.slot];if(++b.fill===b.capacity){queue.find(t=>t.id===b.id).cleared=true;shelf[d.slot]=null;}}world.settle(3600);continue;}
   const open=queue.filter(t=>PotionRules.exposed(queue,t)),slot=shelf.indexOf(null);
   if(slot<0||!open.length){if(queue.some(t=>!t.cleared)){validateRun(board,events,'defeat');return events;}break;}
   const b=open[Math.floor(random()*open.length)];b.taken=true;shelf[slot]={...b,fill:0};events.push({type:'place',tile:b.id});
  }
 }
 throw Error('No defeat fixture');
}
export function testDatabase(){
 const db=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+f,'utf8'));
 const DB={prepare(sql){return{bind(...args){return{first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>db.prepare(sql).run(...args)};}};},async batch(items){db.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};
 return {db,DB};
}
export async function checks(){
 const {db,DB}=testDatabase(),api=createLeaderboardAPI(DB,boards);let cookie='';
 async function post(path,data,as=cookie){const r=await api[path](new Request('https://game.test/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Cookie:as},body:JSON.stringify(data)}));if(r.headers.get('Set-Cookie'))cookie=r.headers.get('Set-Cookie').split(';')[0];return{status:r.status,data:await r.json()};}
 const win=winningEvents(boards[0]),loss=losingEvents(boards[1]),partial=validateRun(boards[1],loss,'defeat'),won=validateRun(boards[0],win);
 assert.throws(()=>validateRun(boards[0],win,'defeat'),/not defeated/);assert.throws(()=>validateRun(boards[1],loss.slice(0,1),'defeat'),/not defeated/);
 const first=(await post('start',{level:1})).data;
 assert.equal((await post('submit',{ticket:first.id,name:'Test Brewer',title:'Mage',events:win})).status,400);
 assert.equal((await post('start',{level:3,previous:{ticket:first.id,events:win}})).status,400);
 assert.equal((await post('start',{level:2,previous:{ticket:first.id,events:[]}})).status,400);
 const next=await post('start',{level:2,previous:{ticket:first.id,events:win}});assert.equal(next.status,200);assert.equal(next.data.points,won.score);
 const retry=await post('start',{level:2,previous:{ticket:first.id,events:win}});assert.equal(retry.data.id,next.data.id);assert.equal(db.prepare('SELECT COUNT(*) n FROM runs WHERE parent=?').get(first.id).n,1);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM scores').get().n,0,'Wins must never publish scores');
 assert.equal((await post('submit',{ticket:next.data.id,name:'X',events:loss})).status,400);
 const posted=await post('submit',{ticket:next.data.id,name:'Test Brewer',title:'Mage',events:loss});assert.equal(posted.status,200);assert.equal(posted.data.score,won.score+partial.score);
 assert.equal((await post('submit',{ticket:next.data.id,name:'Test Brewer',events:loss})).status,409);
 const rows=await (await api.leaderboard(new Request('https://game.test/api/leaderboard',{headers:{Cookie:cookie}}))).json();assert.deepEqual(rows.rows,[{name:'Test Brewer',title:'Mage',score:won.score+partial.score,position:1,you:true}]);
 const foreign=await post('submit',{ticket:next.data.id,name:'Other Brewer',events:loss},'potion_player=11111111-2222-3333-4444-555555555555');assert.equal(foreign.status,400);
 const fresh=(await post('start',{level:2})).data;assert.equal(fresh.points,0);await post('submit',{ticket:fresh.id,name:'Test Brewer',title:'Archmage',events:loss});const best=await (await api.leaderboard(new Request('https://game.test/api/leaderboard'))).json();assert.equal(best.rows.length,1);assert.equal(best.rows[0].score,posted.data.score);
 const daily=await (await api.leaderboard(new Request('https://game.test/api/leaderboard?daily=1'))).json();assert.equal(daily.rows.length,0);
 const dailyTicket=(await post('start',{level:1,daily:true})).data;const dailyWin=winningEvents(boards[dailyTicket.level-1]);const dailyNext=await post('start',{level:dailyTicket.level%30+1,daily:true,previous:{ticket:dailyTicket.id,events:dailyWin}});assert.equal(dailyNext.status,200);assert(dailyNext.data.points>0);
 const c=clientHarness();c.structuredClone=structuredClone;vm.runInContext("document.getElementById('submitScore').classList.toggle=(name,hidden)=>{globalThis.submissionHidden=hidden;}",c);vm.runInContext('runPoints=500;state.scoring.score=100;showEnd(true)',c);assert.equal(vm.runInContext("document.getElementById('resultScore').textContent",c),'1,900');
 assert.equal(c.submissionHidden,true);vm.runInContext('showEnd(false)',c);assert.equal(c.submissionHidden,false);vm.runInContext('newGame(2,initial,false,true)',c);assert.equal(vm.runInContext('runPoints',c),1900);assert.equal(vm.runInContext('state.scoring.score',c),0);
 vm.runInContext('newGame(1,initial)',c);assert.equal(vm.runInContext('runPoints',c),0);
 db.close();console.log('PASS: defeat-only submission, win checkpoints, cumulative server-verified points, safe retry, consumed-ticket rejection, identity checks, title/name/points rows, personal bests, Daily separation and client carry/reset.');
}
if(process.argv[1]?.endsWith('verify-survival.mjs'))await checks();
