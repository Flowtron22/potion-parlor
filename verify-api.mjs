import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GemPhysics} from './server/physics.mjs';
const base=process.env.POTION_API_TEST_URL||'http://127.0.0.1:4174';
if(!new URL(base).hostname.match(/^(127\.0\.0\.1|localhost)$/))throw Error('API tests only write to a local preview');
const post=async(path,data,cookie='',origin=base)=>{const response=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:origin},body:JSON.stringify(data)});return new Response(await response.text(),{status:response.status,headers:response.headers});};
const {boards,winningEvents}=await import('./verify-blocked.mjs');const events=winningEvents(boards[0]);
const start=await post('runs',{level:1});assert.equal(start.status,200,await start.clone().text());const cookie=start.headers.get('set-cookie').split(';')[0],ticket=(await start.json()).id;
const forged=structuredClone(events);forged.find(e=>e.type==='draw').drops[0].gem=99999;assert.equal((await post('scores',{ticket,name:'Local QA',events:forged},cookie)).status,400);
const save=await post('scores',{ticket,name:'Local QA',events},cookie);assert.equal(save.status,200,await save.clone().text());const result=await save.json();assert(result.score>0);assert(result.rank>=1);
assert.equal((await post('scores',{ticket,name:'Local QA',events},cookie)).status,409);
const invalidLevel=await post('runs',{level:0},cookie);assert.equal(invalidLevel.status,400,await invalidLevel.clone().text());
const publicRows=await(await fetch(base+'/api/leaderboard?level=1')).json();assert(publicRows.rows.some(row=>row.name==='Local QA'&&row.score===result.score));
console.log('PASS: local D1 score submission, independent visitor ranking, replay protection, forged-event rejection, origin checks and level bounds.');
const dailyStart=await post('runs',{level:1,daily:true});assert.equal(dailyStart.status,200);const dailyTicket=await dailyStart.json(),dailyCookie=dailyStart.headers.get('set-cookie').split(';')[0];assert(/^cascade-v4-daily-\d{4}-\d{2}-\d{2}$/.test(dailyTicket.ruleset));
const dailySave=await post('scores',{ticket:dailyTicket.id,name:'Daily QA',events:winningEvents(boards[dailyTicket.level-1])},dailyCookie);assert.equal(dailySave.status,200,await dailySave.clone().text());
const dailyRows=await(await fetch(base+'/api/leaderboard?daily=1')).json();assert(dailyRows.rows.some(r=>r.name==='Daily QA'));
const journeyRows=await(await fetch(base+'/api/leaderboard?level='+dailyTicket.level)).json();assert(!journeyRows.rows.some(r=>r.name==='Daily QA'));
console.log('PASS: server selects the shared UTC daily board; daily score submission works; daily and journey rankings stay separate.');

// Keep the cross-origin probe last: Miniflare closes this local connection afterward.
assert.equal((await post('runs',{level:1},cookie,'https://unrelated.example')).status,403);
