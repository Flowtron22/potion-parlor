globalThis.PotionRemix={
 shuffle(columns,rng=Math.random){
  const gems=columns.flat().sort((a,b)=>a.id-b.id);for(let i=gems.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[gems[i],gems[j]]=[gems[j],gems[i]];}GemPhysics.arrange(gems,rng);
  return columns;
 },
 restart(board,rng=Math.random){
  // A physical removal path determines colors, preserving the bottle supply
  // and branch locks while guaranteeing a solution for the fresh arrangement.
  for(let attempt=0;attempt<40;attempt++){
   const result=JSON.parse(JSON.stringify(board));this.shuffle(result.columns,rng);const initial=JSON.parse(JSON.stringify(result.columns));
   const world=new GemPhysics();world.reset(result.columns);world.settle(3600);
   if(!world.settled||world.bottom().length<4||world.bottom().length>6)continue;
   const queue=JSON.parse(JSON.stringify(result.queue)),colors=new Map(),path=[];let valid=true;
   while(queue.some(t=>!t.cleared)){
    const available=queue.filter(t=>PotionRules.exposed(queue,t));if(!available.length){valid=false;break;}
    const bottle=available[Math.floor(rng()*available.length)];path.push(bottle.id);
    for(let fill=0;fill<bottle.capacity;fill++){
     const gem=world.bottom()[0];if(!gem){valid=false;break;}
     colors.set(gem.id,bottle.recipe?.[fill]??bottle.color);world.remove(gem.id);world.settle(3600);
    }
    if(!valid)break;bottle.taken=true;bottle.cleared=true;
   }
   if(!valid||world.bodies.size)continue;
   for(const gem of initial.flat())gem.color=colors.get(gem.id);
   world.reset(JSON.parse(JSON.stringify(initial)));world.settle(3600);
   for(const id of path){const bottle=result.queue.find(t=>t.id===id);for(let fill=0;fill<bottle.capacity;fill++){const gem=world.bottom(bottle.recipe?.[fill]??bottle.color)[0];if(!gem){valid=false;break;}world.remove(gem.id);world.settle(3600);}if(!valid)break;}
   if(valid&&!world.bodies.size){result.columns=initial;result.remixPath=path;return result;}
  }
  throw Error('Could not prepare a fresh board. Tap restart to try again.');
 }
};
