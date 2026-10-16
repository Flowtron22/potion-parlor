'use strict';
export const PotionRules={
 exposed(queue,tile){return !tile.taken&&tile.blockers.every(id=>queue.find(t=>t.id===id)?.taken);},
 plan(shelf,floor,pending=[]){const used=new Set(),occupied=new Set(pending.map(e=>e.slot)),drops=[];shelf.forEach((b,slot)=>{if(!b||occupied.has(slot))return;const gem=floor.find(g=>g.color===b.color&&!used.has(g.id));if(gem){used.add(gem.id);drops.push({slot,gem:gem.id});}});return drops;}
};
