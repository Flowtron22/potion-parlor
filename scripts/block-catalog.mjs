import fs from 'node:fs';
import {GemPhysics} from '../server/physics.mjs';
import '../public/play/rules.js';
const rules=globalThis.PotionRules;
const seedsPath='server/physical-seeds.json';
if(!fs.existsSync(seedsPath))fs.copyFileSync('server/levels.json',seedsPath);
const seeds=JSON.parse(fs.readFileSync(seedsPath,'utf8')).filter(b=>b.colorCount===6);
const clone=structuredClone;
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
function queueFor(solution,random){
 const positions=[];for(let row=0;positions.length<solution.length;row++){const xs=row===0?[1,5]:row%2?[0,2,4,6]:[1,3,5];for(const x of xs){if(positions.length===solution.length)break;const blockers=positions.filter(t=>t.row===row-1&&Math.abs(t.x-x)<1.3).map(t=>t.pos);positions.push({pos:positions.length,x,row,blockers});}}
 const assigned=new Map(),queue=[];
 for(const bottle of solution){const open=positions.filter(p=>!assigned.has(p.pos)&&p.blockers.every(id=>assigned.has(id)));const p=open[Math.floor(random()*open.length)];assigned.set(p.pos,bottle.id);queue.push({...bottle,x:p.x,row:p.row,blockers:p.blockers.map(id=>assigned.get(id)),taken:false});}
 return queue;
}
export function simulate(board,random,solution=false){
 const world=new GemPhysics();world.reset(clone(board.columns));world.settle(3600);const queue=clone(board.queue),shelf=Array(board.slots).fill(null);let clears=0,turns=0;
 while(clears<queue.length&&turns++<200){
  if(solution){const tile=queue[clears];if(!rules.exposed(queue,tile))return false;tile.taken=true;shelf[0]={...tile,fill:0};}
  else{while(shelf.includes(null)){const open=queue.filter(t=>rules.exposed(queue,t));if(!open.length)break;const t=open[Math.floor(random()*open.length)];t.taken=true;shelf[shelf.indexOf(null)]={...t,fill:0};}}
  let progress=false;
  for(let wave=0;wave<80;wave++){const drops=rules.plan(shelf,world.bottom());if(!drops.length)break;progress=true;for(const drop of drops)world.remove(drop.gem);world.settle(3600);for(const drop of drops){const b=shelf[drop.slot];b.fill++;if(b.fill===b.capacity){queue.find(t=>t.id===b.id).cleared=true;shelf[drop.slot]=null;clears++;}}}
  if(!progress)return false;
 }
 return clears===queue.length&&world.bodies.size===0;
}
const boards=[];
function layeredRoute(seed,level){
 const world=new GemPhysics();world.reset(clone(seed.columns));world.settle(3600);
 const route=[];
 for(const original of seed.solution){const recipe=[];
  for(let i=0;i<original.capacity;i++){
   const floor=world.bottom();if(!floor.length)throw Error('Unstable recipe floor');
   const previous=recipe.at(-1)??original.color;
   const gem=(i===1?floor.find(g=>g.color!==previous):floor.find(g=>g.color===previous))||floor[0];
   recipe.push(gem.color);world.remove(gem.id);world.settle(3600);
  }
  route.push({...original,color:recipe[0],recipe});
 }
 if(world.bodies.size)throw Error('Recipe inventory mismatch');
 return route;
}
function simpleRoute(seed){
 const world=new GemPhysics();world.reset(clone(seed.columns));world.settle(3600);const route=[];
 while(world.bodies.size){const floor=world.bottom();if(!floor.length)throw Error('No physical floor');
  const counts=new Map();for(const g of floor)counts.set(g.color,(counts.get(g.color)||0)+1);
  const color=[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];let capacity=0;
  while(capacity<4){const gem=world.bottom(color)[0];if(!gem)break;world.remove(gem.id);world.settle(3600);capacity++;}
  route.push({id:route.length,color,capacity,shape:(route.length*7+seed.level)%6});
 }
 return route;
}
for(let level=1;level<=30;level++){
 const seed=clone(seeds[(level-1)%seeds.length]);
 if(level>=16)for(const gem of seed.columns.flat())if(gem.id%4===1)gem.material='heavy';
 const route=level>=11?layeredRoute(seed,level):simpleRoute(seed);
 const base={...seed,bottleCount:route.length,level,version:4,ruleset:'cascade-v4',slots:level<6?3:2,shelf:Array(level<6?3:2).fill(null),lanes:[],brewed:0,moves:0,over:false};
 let best=null,bestWins=Infinity;
 for(let attempt=0;attempt<20;attempt++){const board={...base,queue:queueFor(route,rng(level*1877+attempt*97)),solution:route.map(b=>b.id)};let wins=0;for(let probe=0;probe<12;probe++)if(simulate(board,rng(731+level*157+probe*71)))wins++;if(wins<bestWins){best=board;bestWins=wins;}if(wins<=1)break;}
 if(!simulate(best,rng(1),true))throw Error('No winning route: '+level);
 best.randomProbeWins=bestWins;boards.push(best);console.log('Level '+level+' · '+best.queue.length+' flasks · '+best.slots+' slots · random '+bestWins+'/12');
}
for(let i=0;i<boards.length;i++)if(boards[i].randomProbeWins>2){const tier=b=>b.level<6?0:b.level<11?1:b.level<16?2:3;const pool=boards.filter(b=>tier(b)===tier(boards[i])&&b.randomProbeWins<=2);if(!pool.length)throw Error('No challenging board in tier '+tier(boards[i]));boards[i]={...clone(pool[i%pool.length]),level:i+1};}
fs.writeFileSync('server/levels.json',JSON.stringify(boards));
