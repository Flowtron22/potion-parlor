// Removed gems keep their potion value, so a help cannot starve later recipes.
globalThis.PotionSpells={
 dissolve(state,id,type){
  if(!['dispel','sweep'].includes(type))return [];
  const target=state.columns.flat().find(g=>g.id===id);if(!target)return [];
  const removed=[];state.columns=state.columns.map(column=>column.filter(g=>{
   const take=type==='sweep'?g.color===target.color:g.id===id;if(take)removed.push(g);return !take;
  }));state.essence??=[];state.essence.push(...removed);return removed;
 },
 plan(state,floor,pending){return PotionRules.plan(state.shelf,[...(state.essence||[]),...floor],pending);}
};
