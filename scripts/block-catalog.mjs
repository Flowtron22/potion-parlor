import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GemPhysics} from '../server/physics.mjs';
import {PotionRules as rules} from '../server/rules.mjs';
const clone=structuredClone;
export const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
export function simulate(board,random,solution=false){
 const world=new GemPhysics();world.reset(clone(board.columns));world.settle(3600);const queue=clone(board.queue),shelf=Array(board.slots).fill(null);let clears=0,turns=0;
 while(clears<queue.length&&turns++<200){
  if(solution){const tile=queue.find(t=>t.id===board.solution[clears]);if(!tile||!rules.exposed(queue,tile))return false;tile.taken=true;shelf[0]={...tile,fill:0};}
  else while(shelf.includes(null)){const open=queue.filter(t=>rules.exposed(queue,t));if(!open.length)break;const t=open[Math.floor(random()*open.length)];t.taken=true;shelf[shelf.indexOf(null)]={...t,fill:0};}
  let progress=false;
  for(let wave=0;wave<80;wave++){const drops=rules.plan(shelf,world.bottom());if(!drops.length)break;progress=true;for(const drop of drops)world.remove(drop.gem);world.settle(3600);for(const drop of drops){const b=shelf[drop.slot];if(++b.fill===b.capacity){queue.find(t=>t.id===b.id).cleared=true;shelf[drop.slot]=null;clears++;}}}
  if(!progress)return false;
 }
 return clears===queue.length&&world.bodies.size===0;
}
function queueFor(route,random,level){
 const positions=[],roots=level<=8?[1,3,5]:[1,5];
 for(let row=0;positions.length<route.length;row++){
  const xs=row===0?roots:row%2?[0,2,4,6]:[1,3,5];
  for(const x of xs){if(positions.length===route.length)break;
   const previous=positions.filter(t=>t.row===row-1);let parents=previous.filter(t=>Math.abs(t.x-x)<1.3);
   if(row&&(!parents.length||level<=8))parents=[previous.sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x)||a.x-b.x)[0]];
   positions.push({pos:positions.length,x,row,blockers:parents.map(t=>t.pos)});
  }
 }
 const assigned=new Map(),queue=[];
 for(const bottle of route){const open=positions.filter(p=>!assigned.has(p.pos)&&p.blockers.every(id=>assigned.has(id)));const p=open[Math.floor(random()*open.length)];assigned.set(p.pos,bottle.id);queue.push({...bottle,x:p.x,row:p.row,blockers:p.blockers.map(id=>assigned.get(id)),taken:false});}
 return queue;
}
// Derive every requirement from gems that can actually reach the floor.
// Early bottles drain short same-color groups; later bottles change ingredients.
function routeFor(columns,level,random){
 const world=new GemPhysics();world.reset(clone(columns));world.settle(3600);const route=[];
 while(world.bodies.size){
  const floor=world.bottom();if(!floor.length)throw Error('No physical floor');
  const counts=new Map();for(const g of floor)counts.set(g.color,(counts.get(g.color)||0)+1);
  const color=[...counts].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0],recipe=[];
  const mixed=level>=13&&random()<(level<=16?.28:level<=22?.48:.7),capacity=level<=4?2:level<=12?3:2+Math.floor(random()*3);
  for(let i=0;i<capacity;i++){
   const bottom=world.bottom(),previous=recipe.at(-1)??color;
   const gem=mixed?(i===1?bottom.find(g=>g.color!==previous):bottom.find(g=>g.color===previous))||bottom[0]:bottom.find(g=>g.color===color);
   if(!gem)break;recipe.push(gem.color);world.remove(gem.id);world.settle(3600);
  }
  const b={id:route.length,color:recipe[0],capacity:recipe.length,shape:(route.length*7+level)%6};
  if(recipe.some(c=>c!==recipe[0]))b.recipe=recipe;route.push(b);
 }
 return route;
}
export function buildCatalog(){
 const seeds=JSON.parse(fs.readFileSync('server/physical-seeds.json','utf8')).filter(b=>b.colorCount===6),boards=[];
 for(let level=1;level<=30;level++){
  const seed=clone(seeds[(level-1)%seeds.length]),colorCount=level<=4?3:level<=8?4:level<=12?5:6;
  for(const g of seed.columns.flat()){g.color%=colorCount;delete g.material;if(level>=23&&g.id%4===1)g.material='heavy';}
  const route=routeFor(seed.columns,level,rng(61973+level*97)),slots=level<=16?3:2;
  const base={...seed,level,version:6,ruleset:'survival-v6',colorCount,slots,shelf:Array(slots).fill(null),lanes:[],brewed:0,moves:0,over:false,bottleCount:route.length,total:seed.columns.flat().length,solution:route.map(b=>b.id)};
  // Select a fair difficulty band, rather than always selecting the hardest queue.
  const target=level<=4?.88:level<=8?.72:level<=12?.55:level<=16?.32:level<=22?.2:.1;
  let best=null,distance=Infinity;
  for(let attempt=0;attempt<16;attempt++){
   const board={...base,queue:queueFor(route,rng(level*1877+attempt*97),level)};let wins=0;
   for(let probe=0;probe<12;probe++)if(simulate(board,rng(731+level*157+probe*71)))wins++;
   const diff=Math.abs(wins/12-target);if(diff<distance){best=board;distance=diff;best.randomProbeWins=wins;}
   if(diff<=1/12)break;
  }
  if(!simulate(best,rng(1),true))throw Error('No winning route: '+level);
  boards.push(best);console.log(`Level ${level} · ${colorCount} colors · ${slots} slots · ${best.queue.length} flasks · random ${best.randomProbeWins}/12`);
 }
 fs.writeFileSync('server/levels.json',JSON.stringify(boards));return boards;
}
if(process.argv[1]===fileURLToPath(import.meta.url))buildCatalog();
