(()=>{
 const $=id=>document.getElementById(id);let storage;
 try{storage=localStorage;}catch{}
 const profile=PotionMastery.create(storage);let returnFocus,attempt=0;
 function requirement(s){if(!s.next)return 'Highest title earned';const needs=[];if(s.wins<s.next.wins)needs.push(`${s.next.wins-s.wins} new board wins`);if(s.xp<s.next.xp)needs.push(`${(s.next.xp-s.xp).toLocaleString()} XP`);return `${needs.join(' · ')} to ${s.next.name}`;}
 function render(){
  const s=profile.status();$('titleName').textContent=s.rank.name;$('titleRune').textContent=s.rank.rune;
  $('titleXP').textContent=s.xp.toLocaleString()+' XP';$('titleMeter').value=s.progress;
  $('titleMeter').setAttribute('aria-label',requirement(s));$('titleButton').setAttribute('aria-label',s.rank.name+', '+s.xp+' mastery XP. View title ladder');
  $('masterySummary').textContent=requirement(s);$('manaBalance').textContent=s.mana.toLocaleString();$('freeSpells').textContent=s.free?`${s.free} free`:35+' MP';
  $('masteryStorage').textContent=s.persisted?'Titles and Mana saved on this device.':'Storage unavailable · progress lasts for this session.';
  $('masteryIncome').textContent=`${s.wins} wins · ${s.income}+ MP / clear`;
  $('titleLadder').replaceChildren(...PotionMastery.ranks.map((rank,i)=>{
   const li=document.createElement('li'),rune=document.createElement('span'),copy=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small'),mark=document.createElement('span');
   li.className=i<s.index?'earned':i===s.index?'current':'future';if(i===s.index)li.setAttribute('aria-current','step');
   rune.className='ladder-rune';rune.textContent=rank.rune;name.textContent=rank.name;
   detail.textContent=rank.xp.toLocaleString()+' XP · '+rank.wins+' wins'+' · '+(20+i*4)+'+ Mana / clear';
   mark.textContent=i<s.index?'✓':i===s.index?'YOU':'⌑';mark.className='ladder-mark';copy.append(name,detail);li.append(rune,copy,mark);return li;
  }));
 }
 function close(){$('rankResetConfirm').classList.add('hidden');$('resetRank').classList.remove('hidden');$('masteryPanel').classList.add('hidden');returnFocus?.focus();}
 $('titleButton').onclick=()=>{render();returnFocus=document.activeElement;$('masteryPanel').classList.remove('hidden');$('closeMastery').focus();};
 $('resetRank').onclick=()=>{$('resetRank').classList.add('hidden');$('rankResetConfirm').classList.remove('hidden');$('cancelResetRank').focus();};
 $('cancelResetRank').onclick=()=>{$('rankResetConfirm').classList.add('hidden');$('resetRank').classList.remove('hidden');$('resetRank').focus();};
 $('confirmResetRank').onclick=()=>{profile.resetRank();render();close();document.dispatchEvent(new CustomEvent('potion:rank-reset'));};
 $('closeMastery').onclick=close;$('masteryPanel').addEventListener('click',e=>{if(e.target===$('masteryPanel'))close();});
 document.addEventListener('keydown',e=>{
  if($('masteryPanel').classList.contains('hidden'))return;
  if(e.key==='Escape'){e.preventDefault();close();}
  if(e.key==='Tab'){const buttons=[...$('masteryPanel').querySelectorAll('button')].filter(b=>!b.disabled&&b.getClientRects().length);const i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}
 });
 globalThis.PotionTitles={
  status:()=>profile.status(),
  spend(type){const paid=profile.spend(type);render();return paid;},
  finish(won,run){
   const result=won?profile.award(run):profile.consolation(run),s=profile.status();
   $('resultGreeting').textContent=PotionMastery.message(won,s.rank.name,attempt++);
   $('resultMastery').classList.remove('promotion');
   $('resultMastery').textContent=result.earned||result.manaEarned?`+${result.earned} XP · +${result.manaEarned} Mana`:'';
   $('resultMastery').classList.toggle('hidden',!result.earned&&!result.manaEarned);
   $('resultMasteryDetail').textContent='';
   $('rankCelebration').classList.toggle('hidden',!result.promoted);
   if(result.promoted){$('rankUpRune').textContent=s.rank.rune;$('rankUpName').textContent=s.rank.name;}
   $('rescueSpells').classList.toggle('hidden',won);
   render();return result;
  }
 };
 render();
})();
