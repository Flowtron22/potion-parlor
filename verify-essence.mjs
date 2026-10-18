import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {clientHarness} from './verify-blocked.mjs';
import {soulPose} from './public/play/soul-motion.mjs';
const nodes=[],rect=(left,top,width,height)=>({left,top,width,height,bottom:top+height});
const game={getBoundingClientRect:()=>rect(10,20,400,650),append:n=>nodes.push(n)};
const svg={dataset:{mouthY:'17'}},slot={getBoundingClientRect:()=>rect(30,440,70,80),querySelector:()=>svg};
const c={Map,Set,Math,window:{potionSoulPose:soulPose},getComputedStyle:el=>el===svg?{width:'50',height:'60'}:{paddingBottom:'13'},document:{querySelector:()=>game,querySelectorAll:()=>[slot],getElementById:()=>({getBoundingClientRect:()=>rect(20,100,360,290)}),createElement:()=>({dataset:{},setAttribute(){},style:{setProperty(){}},remove(){this.removed=true;}})}};
vm.createContext(c);vm.runInContext(fs.readFileSync('public/play/essence-fx.js','utf8'),c);
const fx=c.PotionEssenceFX,e={gemId:42,stored:true,color:0,slot:0,start:0,duration:1100,from:{x:180,y:320}};
const colors=[{hex:'#f17b91'}];fx.update(100,[e],colors);assert.equal(nodes.length,1);assert.equal(nodes[0].dataset.essenceGem,42);const start=nodes[0].style.transform;
fx.update(550,[e],colors);assert.notEqual(nodes[0].style.transform,start);assert(!nodes[0].style.transform.includes('NaN'));assert(Number(nodes[0].style.opacity)>0);
fx.update(858,[e],colors);assert(nodes[0].style.transform.startsWith('translate(55px,439.439')); // Exact mouth, before merging.
fx.update(1000,[e],colors);assert(Number(nodes[0].style.opacity)<1);fx.update(1100,[],colors);assert(nodes[0].removed);assert.equal(fx.flights.size,0);
fx.update(100,[e],colors);fx.reset();assert.equal(fx.flights.size,0);assert(nodes.at(-1).removed);

// Full Sweep: no physical gems remain, but exactly two visible charges can fill a two-dose bottle.
const gameClient=clientHarness();vm.runInContext(fs.readFileSync('public/play/spells.js','utf8'),gameClient);
gameClient.PotionMastery={prices:{sweep:100}};gameClient.PotionTitles={status:()=>({mana:500,free:0}),spend:()=>true,finish(){}};
gameClient.fixture={level:1,slots:1,shelf:[null],columns:[[0,1].map(id=>({id,color:0,x:80+id*90,y:218,shape:0,radius:25,drawRadius:25,aspect:1,seed:1}))],queue:[{id:0,color:0,capacity:2,shape:0,x:1,row:0,blockers:[]}],bottleCount:1,total:2,brewed:0,moves:0,over:false};
let resets=0;gameClient.PotionEssenceFX={reset(){resets++;}};
const bank=gameClient.document.getElementById('essenceBank');bank.querySelector=()=>({getBoundingClientRect:()=>rect(50,300,60,20)});gameClient.document.getElementById('game').getBoundingClientRect=()=>rect(0,0,360,290);
vm.runInContext("newGame(1,fixture);physics.settle(3600);beginSpell('sweep');castSpell(0);physics.settle(3600);choose(0);tick(1000);renderSpells()",gameClient);
assert.equal(vm.runInContext('state.columns.flat().length',gameClient),0);assert.equal(vm.runInContext('effects.length',gameClient),1);assert.equal(vm.runInContext('effects[0].from.x',gameClient),80);assert.equal(vm.runInContext('effects[0].from.y',gameClient),310);assert(bank.innerHTML.includes('×2'));
vm.runInContext('let dose=effects.shift();completePour(dose);physics.settle(3600);tick(2300);renderSpells()',gameClient);assert(bank.innerHTML.includes('×1'));assert.equal(vm.runInContext('state.shelf[0].fill',gameClient),1);
vm.runInContext('dose=effects.shift();completePour(dose);physics.settle(3600);tick(3600);renderSpells()',gameClient);assert.equal(vm.runInContext('state.brewed',gameClient),1);assert.equal(vm.runInContext('state.essence.length+effects.length',gameClient),0);assert.equal(bank.innerHTML,'');
vm.runInContext('undo()',gameClient);assert.equal(resets,2,'New board and Undo both clear flight visuals');
console.log('PASS: visible stored-essence flight, exact mouth arrival, cleanup, and all-gems Sweep consumes exactly two counted charges with no phantom fills.');
