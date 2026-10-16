'use strict';
(()=>{const COLORS=Array(6).fill(null),levelCache=new Map();
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function generate(level,attempt=0){
 if(!attempt&&levelCache.has(level))return JSON.parse(levelCache.get(level));
 const rng=random(9173+level*1231+attempt*7919),colorCount=level<4?4:level<9?5:6,slots=level<4?5:level<13?4:3,total=28+level%5,columns=Array.from({length:7},()=>[]);
 for(let id=0;id<total;id++){const col=id%7,row=Math.floor(id/7),shape=Math.floor(rng()*6),radius=23+rng()*5;
  columns[col].push({id,color:Math.floor(rng()*colorCount),shape,radius,drawRadius:radius,aspect:.9+rng()*.2,seed:rng()*10,x:49+col*43.5,y:217-row*43,angle:(rng()-.5)*.2});}
 const world=new window.GemPhysics();world.reset(columns);world.settle();
 const initial=JSON.parse(JSON.stringify(columns)),floorCount=world.bottom().length;
 if(floorCount<6||floorCount>8)return generate(level,attempt+1);
 const solution=[];
 // Derive bottles from a real floor-contact removal sequence, then replay it.
 // The same selector and settling policy are used during play; upper gems cannot bypass them.
 while(world.bodies.size){
  const bottom=world.bottom();if(!bottom.length)return generate(level,attempt+1);
  const counts=COLORS.map((_,color)=>({color,count:bottom.filter(d=>d.color===color).length})).filter(c=>c.count);
  counts.sort((a,b)=>b.count-a.count||a.color-b.color);
  const color=counts[0].color,target=2+Math.floor(rng()*4);let capacity=0;
  for(let i=0;i<target;i++){const d=world.bottom(color)[0];if(!d)break;world.remove(d.id);world.settle();capacity++;}
  solution.push({id:solution.length,color,capacity,shape:Math.floor(rng()*6)});
 }
 const replay=JSON.parse(JSON.stringify(initial));world.reset(replay);world.settle();
 for(const b of solution)for(let i=0;i<b.capacity;i++){const d=world.bottom(b.color)[0];if(!d)return generate(level,attempt+1);world.remove(d.id);world.settle();}
 const lanes=Array.from({length:4},()=>[]);solution.forEach((b,i)=>{const lane=level<3?i%4:Math.floor(rng()*4);b.lane=lane;lanes[lane].push({...b});});
 const result={level,columns:initial,lanes,slots,colorCount,shelf:Array(slots).fill(null),brewed:0,moves:0,over:false,solution,total,bottleCount:solution.length};
 levelCache.set(level,JSON.stringify(result));if(levelCache.size>3)levelCache.delete(levelCache.keys().next().value);return result;
}
globalThis.PotionLevels={generate};})();
