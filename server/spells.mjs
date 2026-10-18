import {GemPhysics} from './physics.mjs';
import {PotionRules} from './rules.mjs';
// Removed gems keep their potion value, so a help cannot starve later recipes.
export const PotionSpells={
 dissolve(state,id,type){
  if(!['dispel','sweep'].includes(type))return [];
  const target=state.columns.flat().find(g=>g.id===id);if(!target)return [];
  const removed=[];state.columns=state.columns.map(column=>column.filter(g=>{
   const take=type==='sweep'?g.color===target.color:g.id===id;if(take)removed.push(g);return !take;
  }));state.essence??=[];state.essence.push(...removed);return removed;
 },
 shuffle(columns,seed){
  let value=seed>>>0;const rng=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;},gems=columns.flat().sort((a,b)=>a.id-b.id),order=[...gems];
  for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  GemPhysics.arrange(order,rng);return columns;
 },
 plan(state,floor,pending){return PotionRules.plan(state.shelf,[...(state.essence||[]),...floor],pending);}
};
