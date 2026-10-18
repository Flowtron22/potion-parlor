// Device-local titles and spell wallet; neither grants competitive scores.
globalThis.PotionMastery=(()=>{
 const KEY='potion-mastery-v1',prices={dispel:35,sweep:100,shuffle:15};
 const ranks=[
  {name:'Squire',xp:0,wins:0,level:0,rune:'◇'},
  {name:'Apprentice',xp:400,wins:4,level:0,rune:'✧'},
  {name:'Herbalist',xp:900,wins:8,level:0,rune:'❧'},
  {name:'Potion Brewer',xp:1500,wins:12,level:0,rune:'⚗'},
  {name:'Alchemist',xp:2600,wins:16,level:0,rune:'⚝'},
  {name:'Rune Caster',xp:4000,wins:22,level:0,rune:'ᛟ'},
  {name:'Mage',xp:6000,wins:30,level:0,rune:'✦'},
  {name:'Archmage',xp:9000,wins:40,level:0,rune:'✴'},
  {name:'Oracle',xp:13000,wins:55,level:0,rune:'☽'},
  {name:'Arcane Sage',xp:18000,wins:75,level:0,rune:'✺'},
  {name:'Immortal Alchemist',xp:26000,wins:100,level:0,rune:'∞'}
 ];
 const integer=(n,max)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
 function create(storage){
  let records={},mana=50,free=1,persisted=!!storage;
  try{const saved=JSON.parse(storage?.getItem(KEY)||'{}');if([1,2].includes(saved.version)&&saved.records&&typeof saved.records==='object'){
   for(const [key,r] of Object.entries(saved.records))if(/^(journey:\d{1,2}|daily:\d{4}-\d{2}-\d{2}:\d{1,2})$/.test(key)&&r&&typeof r==='object')records[key]={xp:integer(r.xp,2000),cleanLevel:integer(r.cleanLevel,30),won:saved.version===1?r.xp>0:!!r.won,manaPaid:integer(r.manaPaid,100)};
   if(saved.version===2){mana=integer(saved.mana,1500);free=integer(saved.free,20);}
  }}catch{persisted=false;}
  function save(){try{if(!storage)throw Error('Storage unavailable');storage.setItem(KEY,JSON.stringify({version:2,records,mana,free}));persisted=true;}catch{persisted=false;}}
  function status(){
   const values=Object.values(records),xp=values.reduce((n,r)=>n+r.xp,0),level=Math.max(0,...values.map(r=>r.cleanLevel)),wins=values.filter(r=>r.won).length;
   let index=0;for(let i=1;i<ranks.length;i++)if(xp>=ranks[i].xp&&wins>=ranks[i].wins)index=i;
   const rank=ranks[index],next=ranks[index+1]||null;
   const progress=next?Math.min(1,Math.max(0,(xp-rank.xp)/(next.xp-rank.xp)),Math.max(0,(wins-rank.wins)/(next.wins-rank.wins))):1;
   return {xp,level,wins,index,rank,next,progress,persisted,mana,free,income:20+index*4};
  }
  function record(run,won){
   let {level,medal=1,combo=1,daily=false,day='',rescued=false,brewed=0}=run;level=integer(level,30);
   if(!level)return {earned:0,manaEarned:0,promoted:false,before:status(),after:status()};
   if(daily&&!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Daily mastery needs its starting date');
   const before=status(),key=daily?`daily:${day}:${level}`:`journey:${level}`,previous=records[key]||{xp:0,cleanLevel:0,won:false,manaPaid:0};
   // Partial rewards are a per-board high-water mark, never per retry.
   const value=won?100+level*5+(rescued?0:integer(medal,3)*10+integer(combo,8)*5)+(daily?20:0):Math.min(60,integer(brewed,60)*3);
   const earned=Math.max(0,value-previous.xp),payout=won?(previous.won?previous.manaPaid:before.income+Math.floor(level/5)*2+(daily?5:0)):Math.min(10,Math.floor(integer(brewed,60)/2));
   let manaEarned=Math.max(0,payout-previous.manaPaid);
   records[key]={xp:Math.max(value,previous.xp),cleanLevel:Math.max(previous.cleanLevel,won&&!rescued?level:0),won:previous.won||won,manaPaid:Math.max(payout,previous.manaPaid)};
   const promoted=status().index>before.index;
   if(promoted){const count=status().index-before.index;manaEarned+=count*25+10*(status().index+before.index+1)*count/2;free=Math.min(20,free+count);}
   const oldMana=mana;mana=Math.min(1500,mana+manaEarned);manaEarned=mana-oldMana;save();
   return {earned,manaEarned,promoted,before,after:status(),rescued,firstWin:won&&!previous.won};
  }
  function spend(type){if(!Object.hasOwn(prices,type))return false;if(type==='dispel'&&free>0){free--;save();return true;}if(mana<prices[type])return false;mana-=prices[type];save();return true;}
  function resetRank(){for(const r of Object.values(records)){r.xp=0;r.cleanLevel=0;r.won=false;}save();return status();}
  return {status,resetRank,award:run=>record(run,true),consolation:run=>record(run,false),spend};
 }
 function message(won,title,attempt=0){
  const wins=[`Well brewed, ${title}.`,`A fine bit of magic, ${title}.`,`Beautiful brew, ${title}.`];
  const losses=[`Get good, ${title}. The shelf wins this round.`,`Even a ${title} spills a potion. Try another order.`,`Not your finest brew, ${title}. Your title is safe.`];
  return (won?wins:losses)[Math.abs(attempt)%3];
 }
 return {ranks,prices,create,message};
})();
