import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {clientHarness} from './verify-blocked.mjs';
import {validateRun} from './server/validate.mjs';
const context=vm.createContext({});vm.runInContext(fs.readFileSync('public/play/mastery.js','utf8'),context);
const {PotionMastery:M}=context,values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
let profile=M.create(storage);assert.equal(profile.status().mana,50);assert.equal(profile.status().free,1);
const clear={level:1,medal:3,combo:5};
for(let level=1;level<=3;level++){profile.award({...clear,level,rescued:true});assert.equal(profile.status().rank.name,'Squire');}
const fourth=profile.award({...clear,level:4,rescued:true});assert(fourth.promoted);assert.equal(profile.status().rank.name,'Apprentice');assert.equal(profile.status().wins,4);assert.equal(profile.status().free,2);assert.equal(profile.status().income,24);
assert.equal(profile.award({...clear,level:4,rescued:true}).earned,0);assert.equal(profile.award({...clear,level:4,rescued:true}).manaEarned,0);
const assisted=M.create();for(let level=1;level<=12;level++){assisted.award({...clear,level,rescued:true});if(level===8)assert.equal(assisted.status().rank.name,'Herbalist');}assert.equal(assisted.status().rank.name,'Potion Brewer');
const before=profile.status();assert(profile.spend('dispel'));assert.equal(profile.status().mana,before.mana);assert.equal(profile.status().free,before.free-1);
assert(profile.spend('dispel'));assert(profile.spend('dispel'));assert.equal(profile.status().mana,before.mana-35);assert.equal(profile.status().xp,before.xp,'Spending must never consume title XP');assert(!profile.spend('__proto__'));
profile=M.create(storage);assert.equal(profile.status().mana,before.mana-35,'Wallet survives reload');
const partial=M.create();const failure={level:1,brewed:8};const earned=partial.consolation(failure);assert.equal(earned.earned,24);assert.equal(earned.manaEarned,4);assert.equal(partial.consolation(failure).earned,0);assert.equal(partial.consolation(failure).manaEarned,0);const win=partial.award(clear);assert.equal(win.manaEarned,16,'Partial and win payouts must not double pay');assert.equal(partial.status().mana,70);assert.equal(partial.status().wins,1);
const daily=M.create();const day={...clear,daily:true,day:'2026-10-18'};daily.award(day);assert.equal(daily.award(day).manaEarned,0);daily.award({...day,day:'2026-10-19'});assert.equal(daily.status().wins,2);
const legacy=M.create({getItem:()=>JSON.stringify({version:1,records:{'journey:1':{xp:259,cleanLevel:1}}}),setItem(){}});assert.equal(legacy.status().xp,259);assert.equal(legacy.status().wins,1);assert.equal(legacy.status().mana,50);assert.equal(legacy.award(clear).manaEarned,0,'Old clears cannot be reclaimed for Mana');
const bad=M.create({getItem:()=>'{bad',setItem:()=>{throw Error('Denied');}});assert.doesNotThrow(()=>bad.award(clear));assert.equal(bad.status().persisted,false);
const rich=M.create({getItem:()=>JSON.stringify({version:2,mana:500,free:1,records:{}}),setItem(){}});
const poor=M.create();assert.equal(poor.spend('sweep'),false);assert.equal(poor.status().mana,50);
const journey=M.create();for(let level=1;level<=30;level++){journey.award({...clear,level});if(level===8)assert.equal(journey.status().rank.name,'Herbalist');if(level===12)assert.equal(journey.status().rank.name,'Potion Brewer');if(level===16)assert.equal(journey.status().rank.name,'Alchemist');if(level===22)assert.equal(journey.status().rank.name,'Rune Caster');if(level===30)assert.equal(journey.status().rank.name,'Mage');}
for(let day=1;day<=80;day++){journey.award({...clear,level:30,daily:true,day:'2026-'+String(1+Math.floor((day-1)/28)).padStart(2,'0')+'-'+String(1+(day-1)%28).padStart(2,'0')});if(day===10)assert.equal(journey.status().rank.name,'Archmage');if(day===25)assert.equal(journey.status().rank.name,'Oracle');if(day===45)assert.equal(journey.status().rank.name,'Arcane Sage');}
assert.equal(journey.status().rank.name,'Immortal Alchemist');assert.equal(journey.status().income,60);
assert.deepEqual(Array.from(M.ranks,r=>r.name),['Squire','Apprentice','Herbalist','Potion Brewer','Alchemist','Rune Caster','Mage','Archmage','Oracle','Arcane Sage','Immortal Alchemist']);
const c=clientHarness();vm.runInContext(fs.readFileSync('public/play/spells.js','utf8'),c);c.reports=[];c.PotionTitles={status:()=>rich.status(),spend:type=>rich.spend(type),finish:(won,run)=>c.reports.push({won,run})};c.PotionMastery=M;
c.fixture={level:1,slots:3,shelf:[null,null,null],columns:[[0,0,1].map((color,id)=>({id,color,x:90+id*90,y:218,shape:0,radius:25,drawRadius:25,aspect:1,seed:1}))],queue:[{id:0,color:0,capacity:2,shape:0,x:1,row:0,blockers:[]},{id:1,color:1,capacity:1,shape:0,x:4,row:0,blockers:[]}],bottleCount:2,total:3,brewed:0,moves:0,over:false};
vm.runInContext("newGame(1,fixture);physics.settle(3600);state.over=true;modalMode='lose';beginSpell('dispel');cancelSpell();",c);assert.equal(rich.status().free,1,'Cancel is free');assert.equal(vm.runInContext('state.over',c),true,'Cancel returns to the blocked board');
vm.runInContext("beginSpell('dispel');castSpell(999);",c);assert.equal(rich.status().free,1,'Missing target is free');
assert.equal(vm.runInContext('castSpell(0)',c),true);assert.equal(rich.status().free,0);assert.equal(vm.runInContext('state.over',c),false,'A spell resumes a blocked board');assert.equal(vm.runInContext('state.essence.length',c),1);
vm.runInContext('undo();physics.settle(3600);',c);assert.equal(vm.runInContext('state.columns.flat().length',c),3);assert.equal(rich.status().free,0,'Undo must not refund a spent spell');
vm.runInContext("beginSpell('sweep');castSpell(0);physics.settle(3600);",c);assert.equal(rich.status().mana,400);assert.equal(vm.runInContext('state.essence.length',c),2);assert.equal(vm.runInContext('state.columns.flat().length',c),1);assert.equal(vm.runInContext('ranked',c),false);
vm.runInContext("beginSpell('dispel');",c);assert.equal(vm.runInContext('spellMode',c),null,'At most two spells per run');
vm.runInContext('choose(0);choose(1);tick(1000);',c);assert.equal(vm.runInContext('effects.length',c),2,'Stored essence pours beside a physical gem');
vm.runInContext('let batch=effects;effects=[];batch.forEach(completePour);physics.settle(3600);tick(3000);batch=effects;effects=[];batch.forEach(completePour);tick(5000);',c);
assert.equal(vm.runInContext('state.brewed',c),2);assert.equal(vm.runInContext('state.essence.length',c),0);assert.equal(c.reports.at(-1).won,true);assert.equal(c.reports.at(-1).run.rescued,true);
const events=JSON.parse(vm.runInContext('JSON.stringify(runLog)',c));assert.throws(()=>validateRun(c.fixture,events),'Spell runs must not pass the shared leaderboard validator');
console.log('PASS: four-win Apprentice (including assisted wins), wallet/free spells, no XP spending, partial reward caps, replay protection, daily rollover, migration, cancellation, no undo refunds, two-spell limit, essence conservation, completed spell-assisted board, ranked rejection.');
