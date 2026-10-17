'use strict';
globalThis.PotionRules={
 exposed(queue,tile){return !tile.taken&&tile.blockers.every(id=>queue.find(t=>t.id===id)?.cleared);},
 color(b){return b.recipe?.[b.fill||0]??b.color;},
 plan(shelf,floor,pending=[]){const used=new Set(),occupied=new Set(pending.map(e=>e.slot)),drops=[];shelf.forEach((b,slot)=>{if(!b||occupied.has(slot))return;const gem=floor.find(g=>g.color===this.color(b)&&!used.has(g.id));if(gem){used.add(gem.id);drops.push({slot,gem:gem.id});}});return drops;}
};
