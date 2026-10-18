// Personal progression is independent of competitive leaderboard scores.
globalThis.PotionMastery=(()=>{
 const KEY='potion-mastery-v1';
 const ranks=[
  {name:'Squire',xp:0,level:0,rune:'◇'},
  {name:'Apprentice',xp:200,level:1,rune:'✧'},
  {name:'Alchemist',xp:1200,level:5,rune:'⚗'},
  {name:'Wizard',xp:3000,level:11,rune:'✦'},
  {name:'Archwizard',xp:6000,level:16,rune:'✴'},
  {name:'Grand Archwizard',xp:10000,level:25,rune:'♜'}
 ];
 const integer=(n,max)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
 function create(storage){
  let records={},persisted=!!storage;
  try{const saved=JSON.parse(storage?.getItem(KEY)||'{}');if(saved.version===1&&saved.records&&typeof saved.records==='object'){
   for(const [key,r] of Object.entries(saved.records))if(/^(journey:\d{1,2}|daily:\d{4}-\d{2}-\d{2}:\d{1,2})$/.test(key)&&r&&typeof r==='object')records[key]={xp:integer(r.xp,1000),cleanLevel:integer(r.cleanLevel,30)};
  }}catch{persisted=false;}
  function status(){
   const values=Object.values(records),xp=values.reduce((n,r)=>n+r.xp,0),level=Math.max(0,...values.map(r=>r.cleanLevel));
   let index=0;for(let i=1;i<ranks.length;i++)if(xp>=ranks[i].xp&&level>=ranks[i].level)index=i;
   const rank=ranks[index],next=ranks[index+1]||null;
   const progress=next?Math.min(1,(xp-rank.xp)/(next.xp-rank.xp),level/next.level):1;
   return {xp,level,index,rank,next,progress,persisted};
  }
  function award({level,medal=1,combo=1,daily=false,day='',rescued=false}){
   level=integer(level,30);if(!level)return {earned:0,promoted:false,before:status(),after:status()};
   if(daily&&!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Daily mastery needs its starting date');
   const before=status(),key=daily?`daily:${day}:${level}`:`journey:${level}`;
   const previous=records[key]||{xp:0,cleanLevel:0};
   const value=Math.round((100+level*12+Math.max(1,integer(medal,3))*25+Math.max(1,integer(combo,8))*15+(daily?60:0))*(rescued?.5:1));
   const earned=Math.max(0,value-previous.xp);
   records[key]={xp:Math.max(value,previous.xp),cleanLevel:Math.max(previous.cleanLevel,rescued?0:level)};
   try{if(!storage)throw Error('Storage unavailable');storage.setItem(KEY,JSON.stringify({version:1,records}));persisted=true;}catch{persisted=false;}
   const after=status();return {earned,promoted:after.index>before.index,before,after,rescued};
  }
  return {status,award};
 }
 function message(won,title,attempt=0){
  const wins=[`Well brewed, ${title}.`,`A fine bit of magic, ${title}.`,`Beautiful cascade, ${title}.`];
  const losses=[`Get good, ${title}. The shelf wins this round.`,`Even a ${title} spills a potion. Try another order.`,`Not your finest brew, ${title}. Your title is safe.`];
  return (won?wins:losses)[Math.abs(attempt)%3];
 }
 return {ranks,create,message};
})();
