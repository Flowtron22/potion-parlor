import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {boards,clientHarness,winningEvents} from './verify-blocked.mjs';
import {validateRun} from './server/validate.mjs';
const c=clientHarness();vm.runInContext(fs.readFileSync('public/play/remix.js','utf8'),c);
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const counts=columns=>Array.from({length:6},(_,color)=>columns.flat().filter(g=>g.color===color).length);
for(const original of boards){
 const board=c.PotionRemix.restart(structuredClone(original),rng(981+original.level));
 assert.deepEqual(counts(board.columns),counts(original.columns),'A restart preserves the original bottle supply');
 assert.notEqual(JSON.stringify(board.columns),JSON.stringify(original.columns));
 assert.deepEqual(JSON.parse(JSON.stringify(board.queue)),original.queue);
 board.solution=Array.from(board.remixPath);const result=validateRun(board,winningEvents(board));assert(result.score>0);
 console.log('PASS fresh solvable restart · level '+board.level);
}
const original=structuredClone(boards[0]);const shuffled=c.PotionRemix.shuffle(structuredClone(original.columns),rng(412));
assert.deepEqual(shuffled.flat().map(g=>[g.id,g.color,g.shape,g.drawRadius]),original.columns.flat().map(g=>[g.id,g.color,g.shape,g.drawRadius]));
assert.notEqual(JSON.stringify(shuffled),JSON.stringify(original.columns));
vm.runInContext(fs.readFileSync('public/play/mastery.js','utf8'),c);const profile=c.PotionMastery.create();assert(profile.spend('shuffle'));assert.equal(profile.status().mana,35);assert.equal(profile.status().free,1);
vm.runInContext('physics.settle(3600);',c);c.PotionTitles={status:()=>profile.status(),spend:type=>profile.spend(type)};const before=vm.runInContext('state.columns.flat().length',c);
assert.equal(vm.runInContext('shuffleCurrent()',c),true);assert.equal(profile.status().mana,20);assert.equal(vm.runInContext('state.columns.flat().length',c),before);assert.equal(vm.runInContext('ranked',c),false);
console.log('PASS: shuffle keeps gem identities, costs 15 Mana, preserves bottles and progress, resumes physics and excludes assisted scores.');
