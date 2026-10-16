import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GemPhysics} from './server/physics.mjs';
const base=process.env.POTION_API_TEST_URL||'http://127.0.0.1:4174';
if(!new URL(base).hostname.match(/^(127\.0\.0\.1|localhost)$/))throw Error('API tests only write to a local preview');
const post=(path,data,cookie='',origin=base)=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:origin},body:JSON.stringify(data)});
const board=JSON.parse(fs.readFileSync('server/levels.json','utf8'))[0],world=new GemPhysics(),events=[];world.reset(structuredClone(board.columns));world.settle();
for(const b of board.solution){events.push({type:'place',lane:b.lane});for(let i=0;i<b.capacity;i++){const gem=world.bottom(b.color)[0];events.push({type:'pour',slot:0,gem:gem.id});world.remove(gem.id);world.settle();}}
const start=await post('runs',{level:1});assert.equal(start.status,200,await start.clone().text());const cookie=start.headers.get('set-cookie').split(';')[0],ticket=(await start.json()).id;
const forged=structuredClone(events);forged.find(e=>e.type==='pour').gem=99999;assert.equal((await post('scores',{ticket,name:'Local QA',events:forged},cookie)).status,400);
const save=await post('scores',{ticket,name:'Local QA',events},cookie);assert.equal(save.status,200,await save.clone().text());const result=await save.json();assert(result.score>0);assert(result.rank>=1);
assert.equal((await post('scores',{ticket,name:'Local QA',events},cookie)).status,409);
assert.equal((await post('runs',{level:1},cookie,'https://unrelated.example')).status,403);
assert.equal((await post('runs',{level:0},cookie)).status,400);
const publicRows=await(await fetch(base+'/api/leaderboard?level=1')).json();assert(publicRows.rows.some(row=>row.name==='Local QA'&&row.score===result.score));
console.log('PASS: local D1 score submission, independent visitor ranking, replay protection, forged-event rejection, origin checks and level bounds.');
