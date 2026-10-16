import {GemPhysics} from './physics.mjs';
import {PotionScore} from './scoring.mjs';
import {PotionRules} from './rules.mjs';
export function validateRun(board,events){
 if(!Array.isArray(events)||events.length>board.total*3+board.bottleCount||events.length<board.bottleCount)throw Error('Invalid action count');
 const queue=structuredClone(board.queue),shelf=Array(board.slots).fill(null),world=new GemPhysics(),score=PotionScore.fresh(),pending=new Map(),original=new Map(board.columns.flat().map(g=>[g.id,g])),claimed=new Set();let brewed=0,placed=0,drawn=0;
 world.reset(structuredClone(board.columns));world.settle(3600);
 for(const [index,event] of events.entries()){
  if(event.type==='place'){
   const slot=shelf.indexOf(null),tile=queue.find(t=>t.id===event.tile);
   if(slot<0||!tile||!PotionRules.exposed(queue,tile))throw Error('Blocked flask');
   tile.taken=true;shelf[slot]={...tile,fill:0};placed++;PotionScore.place(score);
  }else if(event.type==='draw'){
   if(!Array.isArray(event.drops)||!event.drops.length||event.drops.length>shelf.length)throw Error('Invalid parallel draw');
   const slots=new Set([...pending.values()]),batchIds=new Set(),unresolved=[];
   for(const drop of event.drops){
    const bottle=shelf[drop.slot],clientGem=original.get(drop.gem);
    if(!bottle||slots.has(drop.slot)||claimed.has(drop.gem)||batchIds.has(drop.gem)||!clientGem||clientGem.color!==bottle.color)throw Error('Invalid floor reservation');
    slots.add(drop.slot);batchIds.add(drop.gem);unresolved.push({...drop,color:bottle.color});
   }
   PotionScore.burst(score,pending.size+event.drops.length);
   // Numerical drift can change the final contact order of a chaotic tumble.
   // Accept equivalent colors and the causal floor cascade of this same batch;
   // every removal must reach the real floor before its color can be consumed.
   while(unresolved.length){
    const floor=world.bottom(),usedBodies=new Set(),ready=[];
    for(const drop of unresolved){const eligible=floor.filter(g=>g.color===drop.color&&!usedBodies.has(g.id)),gem=eligible.find(g=>g.id===drop.gem)||eligible[0];if(gem){ready.push({...drop,body:gem.id});usedBodies.add(gem.id);}}
    if(!ready.length)throw Error('Blocked floor color at '+index);
    for(const drop of ready){claimed.add(drop.gem);pending.set(drop.gem,drop.slot);world.remove(drop.body);unresolved.splice(unresolved.findIndex(d=>d.gem===drop.gem),1);drawn++;}world.settle(3600);
   }
  }else if(event.type==='finish'){
   if(!pending.has(event.gem))throw Error('Unreserved liquid');const slot=pending.get(event.gem),bottle=shelf[slot];pending.delete(event.gem);PotionScore.gem(score);bottle.fill++;
   if(bottle.fill===bottle.capacity){PotionScore.clear(score,bottle.capacity,bottle.color,board.level);shelf[slot]=null;brewed++;}
  }else throw Error('Invalid action');
 }
 if(world.bodies.size||pending.size||drawn!==board.total||placed!==board.bottleCount||brewed!==board.bottleCount)throw Error('Incomplete run');
 PotionScore.finish(score,board.level);return score;
}
