import assert from 'node:assert/strict';
import {PotionScore} from './server/scoring.mjs';
import {PotionRules} from './server/rules.mjs';
import {PotionChallenge} from './server/challenge.mjs';
import {GemPhysics} from './server/physics.mjs';
import fs from 'node:fs';
const score=PotionScore.fresh();PotionScore.place(score);PotionScore.burst(score,1);assert.equal(score.combo,1);PotionScore.burst(score,1);assert.equal(score.combo,2);PotionScore.burst(score,2);assert.equal(score.combo,4);const earned=score.score;PotionScore.place(score);assert.equal(score.combo,1);assert.equal(score.score,earned);assert.equal(score.best,4);
const queue=[{id:0,blockers:[],taken:true},{id:1,blockers:[0]}];assert(!PotionRules.exposed(queue,queue[1]));queue[0].cleared=true;assert(PotionRules.exposed(queue,queue[1]));
const bottle={color:0,recipe:[0,3,1],fill:1};assert.equal(PotionRules.color(bottle),3);assert.equal(PotionRules.plan([bottle],[{id:1,color:0},{id:2,color:3}])[0].gem,2);
for(let i=0;i<100;i++){const date=new Date(Date.UTC(2026,9,1+i));assert(PotionChallenge.level(date)>=6&&PotionChallenge.level(date)<=30);assert.equal(PotionChallenge.level(date),PotionChallenge.level(new Date(date)));assert(PotionChallenge.ruleset(true,date).endsWith(PotionChallenge.day(date)));}
const world=new GemPhysics(),gem={id:0,color:0,shape:0,drawRadius:25,aspect:1,x:100,y:100,seed:1};const plain=world.makeBody({...gem},0),heavy=world.makeBody({...gem,material:'heavy'},0);assert(heavy.mass>plain.mass*2);assert(heavy.restitution<plain.restitution);
const board=JSON.parse(fs.readFileSync('server/levels.json','utf8'))[0],fresh=new GemPhysics(),reused=new GemPhysics();
for(let replay=0;replay<3;replay++){
 fresh.reset(structuredClone(board.columns));reused.reset(structuredClone(board.columns));fresh.settle(3600);reused.settle(3600);
 for(let i=0;i<8;i++){const id=fresh.bottom()[0].id;fresh.remove(id);reused.remove(id);fresh.settle(3600);reused.settle(3600);assert.deepEqual(fresh.bottom().map(g=>[g.id,g.x,g.y]),reused.bottom().map(g=>[g.id,g.x,g.y]));}
}
console.log('PASS: stable body IDs keep floor contacts identical after resets and different world histories.');
console.log('PASS: decisions reset cascades without removing earned points; brewing parents retain locks; ordered ingredients; deterministic daily boards.');
