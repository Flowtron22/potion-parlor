(()=>{
 const $=id=>document.getElementById(id);let storage;
 try{storage=localStorage;}catch{}
 const profile=PotionMastery.create(storage);let returnFocus,attempt=0;
 function requirement(s){if(!s.next)return 'Highest title earned';const needs=[];if(s.wins<s.next.wins)needs.push(`${s.next.wins-s.wins} new board wins`);if(s.xp<s.next.xp)needs.push(`${(s.next.xp-s.xp).toLocaleString()} XP`);if(s.level<s.next.level)needs.push(`Clear level ${s.next.level} without help`);return `${needs.join(' · ')} to ${s.next.name}`;}
 function render(){
  const s=profile.status();$('titleName').textContent=s.rank.name;$('titleRune').textContent=s.rank.rune;
  $('titleXP').textContent=s.xp.toLocaleString()+' XP';$('titleMeter').value=s.progress;
  $('titleMeter').setAttribute('aria-label',requirement(s));$('titleButton').setAttribute('aria-label',s.rank.name+', '+s.xp+' mastery XP. View title ladder');
  $('masterySummary').textContent=requirement(s);$('manaBalance').textContent=s.mana.toLocaleString();$('freeSpells').textContent=s.free?`${s.free} free`:35+' MP';
  $('masteryStorage').textContent=s.persisted?'Titles and Mana saved on this device.':'Storage unavailable · progress lasts for this session.';
  $('masteryIncome').textContent=`${s.wins} board wins · ${s.income}+ Mana per first clear · Promotion: bonus Mana + a free Dispel`;
  $('titleLadder').replaceChildren(...PotionMastery.ranks.map((rank,i)=>{
   const li=document.createElement('li'),rune=document.createElement('span'),copy=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small'),mark=document.createElement('span');
   li.className=i<s.index?'earned':i===s.index?'current':'future';if(i===s.index)li.setAttribute('aria-current','step');
   rune.className='ladder-rune';rune.textContent=rank.rune;name.textContent=rank.name;
   detail.textContent=rank.xp.toLocaleString()+' XP · '+rank.wins+' wins'+(rank.level?' · Level '+rank.level+' without help':'')+' · '+(20+i*4)+'+ Mana / clear';
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
  status:()=>profile.status(),
  spend(type){const paid=profile.spend(type);render();return paid;},
  finish(won,run){
   const result=won?profile.award(run):profile.consolation(run),s=profile.status();
   $('resultGreeting').textContent=PotionMastery.message(won,s.rank.name,attempt++);
   $('resultMastery').classList.toggle('promotion',!!result.promoted);
   $('resultMastery').textContent=result.promoted?`${s.rank.rune} Promoted to ${s.rank.name}!`:
    result.earned||result.manaEarned?`+${result.earned} XP · +${result.manaEarned} Mana`:won?'Best brew already recorded':'Your title is safe';
   $('resultMasteryDetail').textContent=(result.promoted?`+${result.earned} XP · +${result.manaEarned} Mana · +1 free Dispel. `:'')+(won?(run.rescued?'Assisted clear counts toward your title. ':'')+requirement(s):'Progress rewards count only new bests. Try magic or another flask order.');
   $('rescueSpells').classList.toggle('hidden',won);
   render();return result;
  }
 };
 render();
})();
