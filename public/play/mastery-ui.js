(()=>{
 const $=id=>document.getElementById(id);let storage;
 try{storage=localStorage;}catch{}
 const profile=PotionMastery.create(storage);let returnFocus,attempt=0;
 function requirement(s){return !s.next?'Highest title earned':`${Math.max(0,s.next.xp-s.xp).toLocaleString()} mastery to ${s.next.name}`+(s.level<s.next.level?` · Clear level ${s.next.level} without undo`:'');}
 function render(){
  const s=profile.status();$('titleName').textContent=s.rank.name;$('titleRune').textContent=s.rank.rune;
  $('titleXP').textContent=s.xp.toLocaleString()+' MP';$('titleMeter').value=s.progress;
  $('titleMeter').setAttribute('aria-label',requirement(s));$('titleButton').setAttribute('aria-label',s.rank.name+', '+s.xp+' mastery. View title ladder');
  $('masterySummary').textContent=requirement(s);
  $('masteryStorage').textContent=s.persisted?'Titles saved on this device.':'Storage unavailable · titles last for this session.';
  $('titleLadder').replaceChildren(...PotionMastery.ranks.map((rank,i)=>{
   const li=document.createElement('li'),rune=document.createElement('span'),copy=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small'),mark=document.createElement('span');
   li.className=i<s.index?'earned':i===s.index?'current':'future';if(i===s.index)li.setAttribute('aria-current','step');
   rune.className='ladder-rune';rune.textContent=rank.rune;name.textContent=rank.name;
   detail.textContent=rank.xp.toLocaleString()+' MP'+(rank.level?' · Clear level '+rank.level+' without undo':' · Your story begins');
   mark.textContent=i<s.index?'✓':i===s.index?'YOU':'⌑';mark.className='ladder-mark';copy.append(name,detail);li.append(rune,copy,mark);return li;
  }));
 }
 function close(){$('masteryPanel').classList.add('hidden');returnFocus?.focus();}
 $('titleButton').onclick=()=>{render();returnFocus=document.activeElement;$('masteryPanel').classList.remove('hidden');$('closeMastery').focus();};
 $('closeMastery').onclick=close;$('masteryPanel').addEventListener('click',e=>{if(e.target===$('masteryPanel'))close();});
 document.addEventListener('keydown',e=>{
  if($('masteryPanel').classList.contains('hidden'))return;
  if(e.key==='Escape'){e.preventDefault();close();}
  if(e.key==='Tab'){e.preventDefault();$('closeMastery').focus();}
 });
 globalThis.PotionTitles={
  finish(won,run){
   const result=won?profile.award(run):null,s=profile.status();
   $('resultGreeting').textContent=PotionMastery.message(won,s.rank.name,attempt++);
   $('resultMastery').classList.toggle('promotion',!!result?.promoted);
   $('resultMastery').textContent=result?.promoted?`${s.rank.rune} Promoted to ${s.rank.name}!`:
    won?(result.earned?`+${result.earned} mastery`:'Best brew already recorded'):'No mastery lost';
   $('resultMasteryDetail').textContent=won?`${run.rescued?'Undo used · half mastery; title challenges require a clear without undo. ':''}${requirement(s)}`:'Try a different flask order. Your earned titles stay with you.';
   render();return result;
  }
 };
 render();
})();
