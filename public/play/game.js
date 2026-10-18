'use strict';
const COLORS=[{name:'Rose',hex:'#f17b91',symbol:'♡'},{name:'Amber',hex:'#efb74e',symbol:'☀'},{name:'Mint',hex:'#7dcfa4',symbol:'✿'},{name:'Azure',hex:'#69c4e5',symbol:'☾'},{name:'Lilac',hex:'#b89ae6',symbol:'✧'},{name:'Peach',hex:'#ef9f72',symbol:'◇'}];
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let dailyMode=false,runDay="",remixedRun=false,spellMode=null,spellUses=0,helpUsed=false,spellWasBlocked=false,spellUIKey='';
let runLog=[],ranked=true,runTicket=null,runTicketReady=Promise.resolve(null),runPoints=0,runSerial=0,rankConnection='Connecting';
let state,history=[],effects=[],busy=false,lastTick=0,nextDrawAt=0,time=0,audio,sound=true,modalMode='win',bottleSerial=0,physics=null;
try{sound=localStorage.getItem('potion-sound')!=='off';}catch{}
let brewQueue=[],brewTimer=null;
const bottleMotion=Array.from({length:5},()=>({angle:0,velocity:0,lift:0}));let motionTime=0;
let slotNodes=[],slotSVGs=[],laneNodes=[],viewDirty=true;const rackMeta=Array(5).fill(null),queueMeta=Array(4).fill(null);
let savedLevel=1;try{savedLevel=Math.max(1,Math.min(30,Number(localStorage.getItem('potion-cascade-level'))||1));}catch{}
const shuffle=(a,rng=Math.random)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const levelCache=new Map();
let levelWorker=null,loadId=0;
function makeFreshBoard(board){return new Promise((resolve,reject)=>{const worker=new Worker('remix-worker.js?v=4');const timer=setTimeout(()=>{worker.terminate();reject(Error('Shuffle took too long. Tap restart to retry.'));},15000);worker.onmessage=event=>{clearTimeout(timer);worker.terminate();event.data.error?reject(Error(event.data.error)):resolve(event.data.board);};worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('Shuffle unavailable. Tap restart to retry.'));};worker.postMessage(board);});}
async function loadLevel(level,remixed=false,continuing=false){
 const id=++loadId;document.documentElement.classList.add('loading');document.querySelector('.app').setAttribute('aria-busy','true');$('restart').disabled=true;$('shake').disabled=true;
 try{
  let data;if(levelCache.has(level))data=JSON.parse(levelCache.get(level));else{const response=await fetch('boards/'+level+'.json?v=7');if(!response.ok)throw Error('Board unavailable');data=await response.json();levelCache.set(level,JSON.stringify(data));if(levelCache.size>3)levelCache.delete(levelCache.keys().next().value);}
  if(remixed)data=await makeFreshBoard(data);if(id!==loadId)return;newGame(level,data,remixed,continuing);
 }catch(error){if(id!==loadId)return;$('rankMode').textContent='Tap ↻ to retry';$('restart').disabled=false;$('restart').onclick=()=>loadLevel(level,remixed,continuing);}
 finally{if(id===loadId){document.documentElement.classList.remove('loading');document.querySelector('.app').setAttribute('aria-busy','false');}}
}
function restartGame(){if(!document.documentElement?.classList.contains('loading'))loadLevel(state.level,true);}
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function generate(level){return window.PotionLevels.generate(level);}

const BOTTLE_PATHS=[
 'M19 10H41V23Q41 26 45 29V65Q45 74 30 74Q15 74 15 65V29Q19 26 19 23Z',
 'M19 10H41V25C41 31 54 34 54 52C54 68 44 76 30 76C16 76 6 68 6 52C6 34 19 31 19 25Z',
 'M19 10H41V25L54 65Q58 75 46 75H14Q2 75 6 65L19 25Z',
 'M18 10H42V25Q51 26 51 36V67Q51 75 41 75H19Q9 75 9 67V36Q9 26 18 25Z',
 'M20 10H40V23C40 38 51 41 51 57C51 69 41 76 30 76C19 76 9 69 9 57C9 41 20 38 20 23Z',
 'M18 10H42V22Q50 24 50 34L47 65Q45 75 30 75Q15 75 13 65L10 34Q10 24 18 22Z'];
function liquidLayers(b,clip,y){
 const colors=b.recipe||[b.color],unit=46.44/b.capacity;
 return `<g clip-path="url(#${clip}-volume)"><rect x="4" y="0" width="52" height="82" fill="${COLORS[colors[0]].hex}"/>${b.recipe?colors.map((color,i)=>`<rect x="4" y="${70.68-(i+1)*unit}" width="52" height="${unit+.5}" fill="${COLORS[color].hex}"/>`).join(''):''}</g>`;
}
function bottle(b,fill=65,hidden=false){
 const c=COLORS[PotionRules.color(b)],clip='bottle-'+bottleSerial++,path=BOTTLE_PATHS[b.shape],h=40+b.capacity*5,w=[48,51,49,46,45,48][b.shape]*(.78+b.capacity*.06),y=75-fill*.54;
 return `<svg class="bottle shape-${b.shape}" viewBox="0 0 60 82" preserveAspectRatio="none" aria-hidden="true" data-fill="${fill}" data-capacity="${b.capacity}" data-mouth-y="17" style="--potion:${c.hex};--bw:${w}px;--bh:${h}px"><defs><clipPath id="${clip}"><path d="${path}"/></clipPath><clipPath id="${clip}-volume"><path class="liquid-body" d="M4 ${y}H56V82H4Z"/></clipPath><linearGradient id="${clip}-shine"><stop stop-color="#fff" stop-opacity=".3"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient></defs><path d="${path}" fill="#bbebdc0b"/>${hidden?'':`<g clip-path="url(#${clip})" class="potion-fill">${liquidLayers(b,clip,y)}<path class="meniscus" d="M4 ${y}H56" fill="none" stroke="#ecfff5aa" stroke-width=".8"/><circle class="bubble" cx="29" cy="65" r="1.3" fill="#ffffff88"/></g>`}<path d="${path}" fill="url(#${clip}-shine)" stroke="#d0f0ddaa" stroke-width="1.5"/><path d="M23 15V24M18 44V59" fill="none" stroke="#ffffff66" stroke-width="2.3" stroke-linecap="round"/><path d="M18 11H42M19 14H41" fill="none" stroke="#d0f0ddaa" stroke-width="1.5" stroke-linecap="round"/><rect class="cork" x="16" y="3" width="28" height="8" rx="2" fill="#c5a36b"/><path class="cork" d="M19 4H41" stroke="#eed399"/><text x="30" y="56" text-anchor="middle" fill="${hidden?'#8da897':'#fff'}" font-size="${hidden?19:15}" font-family="Georgia">${hidden?'?':c.symbol}</text></svg>`;
}
function recipeMarks(b){return b.recipe?'<span class="recipe-bands" aria-hidden="true">'+b.recipe.map((color,i)=>`<i class="${i<(b.fill||0)?'done':i===(b.fill||0)?'next':''}" style="--ingredient:${COLORS[color].hex}">${COLORS[color].symbol}</i>`).join('')+'</span>':'';}
const brewName=n=>['BREW','BREW','DOUBLE BUBBLE','TRIPLE TROUBLE','BREWSTORM','CAULDRON CHAOS','ARCANE OVERLOAD','POTION PANDEMONIUM','MAGNUM OPUS'][Math.min(8,n)]||'BREW';
function render(){
 if($('daily')){$('daily').classList.toggle('selected',dailyMode);$('daily').textContent=dailyMode?'Journey':'Daily';}
 if($('score')){$('score').textContent=(runPoints+(state.scoring?.score||0)).toLocaleString();$('combo').textContent='×'+(state.scoring?.combo||1);$('combo').classList.toggle('combo-live',state.scoring?.combo>1);$('rankMode').textContent=ranked?(helpUsed?'Ranked · spells':rankConnection):remixedRun?'Shuffled':helpUsed?'Spell-assisted':'Practice';}$('level').textContent=(dailyMode?'Daily · ':'')+String(state.level).padStart(2,'0');if($('medals')){let medal=0;try{medal=Number(localStorage.getItem('potion-medal-'+state.level))||0;}catch{}$('medals').textContent=medal?'✦'.repeat(medal):'';}$('count').textContent=`${state.brewed} / ${state.bottleCount}`;$('progress').style.width=state.brewed/state.bottleCount*100+'%';$('gems').textContent=state.columns.reduce((n,c)=>n+c.length,0);
 $('undo').disabled=!history.length||busy;$('restart').disabled=false;$('shake').disabled=false;viewDirty=true;
 if(!$('rack').children)return;
 let structural=false;
 if(!slotNodes.length){$('rack').innerHTML=Array(5).fill('<div class="slot"></div>').join('');slotNodes=Array.from($('rack').children);structural=true;}
 for(let i=0;i<5;i++){slotNodes[i].classList.toggle('locked',i>=state.shelf.length);slotNodes[i].setAttribute('aria-label',i>=state.shelf.length?'Locked shelf slot':'Empty shelf slot');if(i>=state.shelf.length){slotNodes[i].innerHTML='';slotSVGs[i]=null;rackMeta[i]=null;}}
 state.shelf.forEach((b,i)=>{const slot=slotNodes[i],key=b?state.level+':'+b.id:'empty';
  if(rackMeta[i]?.key!==key){slot.innerHTML=b?bottle(b,8+b.fill/b.capacity*86)+`<span class="fill-label">${b.fill}/${b.capacity}</span>`+recipeMarks(b):'';slotSVGs[i]=slot.querySelector('.bottle');rackMeta[i]={key,fill:b?.fill};structural=true;}
  else if(b&&rackMeta[i].fill!==b.fill){const svg=slotSVGs[i],fill=8+b.fill/b.capacity*86,c=COLORS[PotionRules.color(b)];svg.dataset.fill=fill;svg.style.setProperty('--potion',c.hex);svg.querySelector('.liquid-body').setAttribute('fill',c.hex);if(!window.potionFluid?.available){const y=75-fill*.54;svg.querySelector('.liquid-body').setAttribute('d',`M4 ${y}H56V82H4Z`);}slot.querySelector('.fill-label').textContent=`${b.fill}/${b.capacity}`;slot.querySelector('.recipe-bands')?.remove();slot.insertAdjacentHTML?.('beforeend',recipeMarks(b));rackMeta[i].fill=b.fill;}
  slot.setAttribute('aria-label',b?COLORS[PotionRules.color(b)].name+' next, '+b.fill+' of '+b.capacity:'Empty shelf slot '+(i+1));
 });
 renderSpells();renderQueue();
 window.potionFluid?.invalidate(slotNodes,structural);
}
function snapshot(){return JSON.stringify({logLength:runLog.length,state,effects:effects.map(e=>({...e,start:0})),physics:{settled:physics?.settled||false,quietSteps:physics?.quietSteps||0}});}
function resetPhysics(){if(state.columns.flat().some(d=>!Number.isFinite(d.drawRadius)||!Number.isFinite(d.y)))layoutGems(state.columns);if(window.GemPhysics){physics??=new window.GemPhysics();physics.reset(state.columns);}for(const m of bottleMotion){m.angle=0;m.velocity=0;m.lift=0;}for(let i=0;i<slotSVGs.length;i++)if(slotSVGs[i]){slotSVGs[i].style.transform='';slotNodes[i].style.setProperty('--slosh','0deg');}}
function newGame(level=1,prepared,remixed=false,continuing=false){
 if(brewTimer)clearTimeout(brewTimer);brewTimer=null;brewQueue=[];
 const mode=dailyMode,previous=continuing?{ready:runTicketReady,events:structuredClone(runLog),eligible:ranked}:null;
 runPoints=continuing?runPoints+(state?.scoring?.score||0):0;
 $('scoreFlash')?.getAnimations?.().forEach(a=>a.cancel());if($('scoreFlash'))$('scoreFlash').textContent='';
 window.potionFluid?.reset();state=prepared||generate(level);state.essence=[];spellMode=null;spellUses=0;helpUsed=remixed;remixedRun=remixed;state.scoring=PotionScore.fresh();
 runLog=remixed?[{type:'remix'}]:[];ranked=!remixed&&(!previous||previous.eligible);runTicket=null;rankConnection='Connecting';const serial=++runSerial;
 runTicketReady=ranked&&window.PotionOnline?(previous?previous.ready.then(ticket=>ticket?window.PotionOnline.start(level,mode,{ticket:ticket.id,events:previous.events}):null):window.PotionOnline.start(level,mode)):Promise.resolve(null);
 runTicketReady.then(ticket=>{if(serial!==runSerial)return;runTicket=ticket;rankConnection=ticket?'Ranked':'Offline';if(ticket)runPoints=ticket.points||0;render();});
 runDay=PotionChallenge.day();history=[];effects=[];busy=false;lastTick=performance.now();nextDrawAt=0;resetPhysics();$('modal').classList.add('hidden');$('restart').onclick=restartGame;render();
}
function renderSpells(){
 const wallet=globalThis.PotionTitles?.status?.(),selecting=!!spellMode,waiting=busy||effects.length>0||!physics?.settled,done=state.brewed===state.bottleCount;
 const key=[state.level,selecting,waiting,done,spellUses,history.length,wallet?.mana,wallet?.free,(state.essence||[]).map(g=>g.color).join(',')].join('|');if(key===spellUIKey)return;spellUIKey=key;
 for(const type of ['dispel','sweep','shuffle']){const button=$(type);if(!button)continue;const price=globalThis.PotionMastery?.prices[type]||Infinity;button.disabled=!wallet||waiting||done||selecting||(type==='dispel'&&wallet.free>0?false:wallet.mana<price);button.title=waiting?'Wait for the gems to settle':(type==='dispel'&&wallet?.free>0?'Free Dispel':`${price} Mana`);}
 $('undo').disabled=!history.length||busy||selecting;
 $('spellPrompt')?.classList.toggle('hidden',!selecting);const colorPicker=$('sweepColors');if(colorPicker){colorPicker.classList.toggle('hidden',spellMode!=='sweep');if(spellMode==='sweep'){const gems=state.columns.flat();colorPicker.innerHTML=COLORS.map((c,color)=>{const count=gems.filter(g=>g.color===color).length;return count?'<button data-sweep-color="'+color+'" style="--seal:'+c.hex+'" aria-label="Sweep '+c.name+', '+count+' gems">'+c.symbol+' '+c.name+' ×'+count+'</button>':'';}).join('');}}
canvas.classList.toggle('spell-targeting',selecting);
 const bank=$('essenceBank');if(bank){const counts=COLORS.map((c,i)=>(state.essence||[]).filter(g=>g.color===i).length);bank.classList.toggle('hidden',!counts.some(Boolean));bank.innerHTML=counts.map((n,i)=>n?`<span style="--seal:${COLORS[i].hex}" title="${COLORS[i].name} essence">${COLORS[i].symbol} ${COLORS[i].name} ×${n}</span>`:'').join('');}
 const shuffleButton=$('modalShuffle');if(shuffleButton)shuffleButton.disabled=waiting||done||!wallet||wallet.mana<15||!state.columns.flat().length;
 const rescue=$('rescueSpells');if(rescue){rescue.disabled=waiting||!wallet||(!wallet.free&&wallet.mana<35);rescue.textContent=wallet&&!wallet.free&&wallet.mana<35?'Need 35 Mana for a spell':'Try a spell';}
}
function beginSpell(type){
 if(!state||effects.length||!physics?.settled||state.brewed===state.bottleCount)return;
 const wallet=globalThis.PotionTitles?.status?.();if(!wallet||(type==='dispel'&&wallet.free>0?false:wallet.mana<PotionMastery.prices[type]))return;
 spellMode=type;spellWasBlocked=state.over;$('modal').classList.add('hidden');
 $('spellText').textContent=(type==='sweep'?'Choose a color, or tap a gem.':'Tap one gem to dissolve it.')+' Essence saved';renderSpells();canvas.scrollIntoView?.({block:'center'});
}
function cancelSpell(){spellMode=null;if(spellWasBlocked)$('modal').classList.remove('hidden');renderSpells();}
function castSpell(id){
 if(!spellMode||effects.length||!state.columns.flat().some(g=>g.id===id))return false;
 const type=spellMode;if(!globalThis.PotionTitles?.spend(type))return false;
 history.push(snapshot());const removed=PotionSpells.dissolve(state,id,type);for(const gem of removed)physics.remove(gem.id);window.potionFluid?.dissolve?.(removed,COLORS[removed[0].color].hex);
 spellUses++;helpUsed=true;state.over=false;spellMode=null;PotionScore.breakChain(state.scoring);runLog.push({type:'spell',spell:type,gem:id});
 flashScore(type==='sweep'?COLORS[removed[0].color].name.toUpperCase()+' SWEPT · '+removed.length+' GEMS':'GEM DISPEL!');$('essenceBank')?.animate?.([{boxShadow:'0 0 22px '+COLORS[removed[0].color].hex},{boxShadow:'0 0 0px transparent'}],{duration:650});tone(type==='sweep'?880:660,.15);render();return true;
}
function renderQueue(){
 const queue=state.queue||[],signature=state.level+':'+queue.filter(t=>t.taken).map(t=>t.id+':'+!!t.cleared).join(',')+':'+state.over;
 if(queueMeta[0]===signature)return;queueMeta[0]=signature;
 const step=51,rows=Math.max(...queue.map(t=>t.row),0)+1;$('queues').style.setProperty('--rows',rows);
 const connectors=queue.flatMap(t=>t.blockers.map(id=>{const p=queue.find(a=>a.id===id);return !p||p.cleared||t.cleared?'':`<path d="M${(p.x+.5)/7*350} ${p.row*step+33}V${p.row*step+47}H${(t.x+.5)/7*350}V${t.row*step+10}"/>`;})).join('');
 const walls=Array.from({length:rows},(_,row)=>Array.from({length:7},(_,x)=>queue.some(t=>t.row===row&&Math.abs(t.x-x)<.6)?'':`<span class="queue-stone" style="left:${x/7*100}%;top:${row*step}px"></span>`).join('')).join('');
 $('queues').innerHTML=walls+`<svg class="queue-links" viewBox="0 0 350 ${rows*step}" preserveAspectRatio="none" aria-hidden="true">${connectors}</svg>`+queue.map(t=>{
  if(t.cleared)return '';if(t.taken)return `<span class="queue-brewing" style="left:${(t.x+.5)/7*100}%;top:${t.row*step}px" aria-label="Brewing; branch locked">⌛</span>`;const open=PotionRules.exposed(queue,t),near=t.blockers.some(id=>{const p=queue.find(a=>a.id===id);return p&&(p.taken||PotionRules.exposed(queue,p));}),known=open||near;
  return `<button class="queue-flask ${open?'exposed':'blocked'}" data-tile="${t.id}" ${!open||state.over?'disabled':''} style="left:${(t.x+.5)/7*100}%;top:${t.row*step}px" aria-label="${known?COLORS[t.color].name+' flask, capacity '+t.capacity:'Hidden flask'}, ${open?'available':'blocked'}, flask ${t.id+1}">${known?bottle(t,65)+recipeMarks(t):'<span class="concealed-tile" aria-hidden="true"></span>'}${known?`<span class="tile-capacity">${t.capacity}</span>`:''}${open?'':'<span class="tile-lock" aria-hidden="true">⌑</span>'}</button>`;
 }).join('');
 const queueEl=$('queues'),available=Array.from(queueEl.querySelectorAll('.queue-flask.exposed:not(:disabled)'));
 if(available.length&&!available.some(b=>b.offsetTop>=queueEl.scrollTop&&b.offsetTop+b.offsetHeight<=queueEl.scrollTop+queueEl.clientHeight))queueEl.scrollTop=Math.max(0,Math.min(...available.map(b=>b.offsetTop))-4);
}
function choose(id){
 if(state.over||spellMode)return;const b=state.queue?.find(t=>t.id===id),slot=state.shelf.indexOf(null);
 if(!b||slot<0||!PotionRules.exposed(state.queue,b))return;
 history.push(snapshot());b.taken=true;state.shelf[slot]={...b,fill:0};state.moves++;
 runLog.push({type:'place',tile:id});PotionScore.place(state.scoring);nextDrawAt=performance.now()+280;bottleMotion[slot].velocity=(b.shape%2?1:-1)*.85;bottleMotion[slot].lift=-7;tone(330+b.color*40,.06);render();
}
function tick(now){
 if(document.documentElement?.classList.contains('loading')||state.over||spellMode||now<nextDrawAt||now-lastTick<110||!physics?.settled)return;lastTick=now;
 const drops=globalThis.PotionSpells?PotionSpells.plan(state,physics.bottom(),effects):PotionRules.plan(state.shelf,physics.bottom(),effects);
 if(drops.length){
  const concurrent=drops.length;runLog.push({type:'draw',drops});PotionScore.burst(state.scoring,concurrent);
  if(state.scoring.combo>1){flashScore(brewName(state.scoring.combo)+' ×'+state.scoring.combo,state.scoring.combo);tone(520+state.scoring.combo*90,.12);}for(const drop of drops)state.shelf[drop.slot].combo=Math.max(state.shelf[drop.slot].combo||1,state.scoring.combo);
  for(const drop of drops){const stored=(state.essence||[]).find(g=>g.id===drop.gem),gem=stored||physics.bodies.get(drop.gem).plugin.gem;
   if(stored){state.essence.splice(state.essence.indexOf(stored),1);}else{const col=state.columns.find(c=>c.some(g=>g.id===gem.id));col.splice(col.findIndex(g=>g.id===gem.id),1);physics.remove(gem.id);}
   effects.push({gemId:gem.id,color:gem.color,radius:gem.drawRadius,shape:gem.shape,aspect:gem.aspect,angle:gem.angle||0,stored:!!stored,from:{x:stored?180:gem.x,y:stored?242:gem.y},to:{x:36+drop.slot*72,y:298},start:now,duration:1100,slot:drop.slot});tone(460+gem.color*70,.06);
  }
  busy=true;render();return;
 }
 busy=effects.length>0;renderSpells();$('undo').disabled=!history.length||busy;if(busy)return;
 if(state.brewed===state.bottleCount){state.over=true;if(!dailyMode){savedLevel=Math.min(30,state.level+1);try{localStorage.setItem('potion-cascade-level',String(savedLevel));}catch{}}render();showEnd(true);}
 else if(state.shelf.every(Boolean)||!state.queue.some(t=>PotionRules.exposed(state.queue,t))){state.over=true;PotionScore.breakChain(state.scoring);render();showEnd(false);}
}
function completePour(e){
 const b=state.shelf[e.slot];if(!b)return;runLog.push({type:'finish',gem:e.gemId});PotionScore.gem(state.scoring);b.fill++;
 bottleMotion[e.slot].velocity+=(e.from.x<180?1:-1)*.55;
 if(b.fill===b.capacity){const before=state.scoring.score;state.queue.find(t=>t.id===b.id).cleared=true;state.shelf[e.slot]=null;state.brewed++;PotionScore.clear(state.scoring,b.capacity,b.color,state.level,b.combo);flashScore((b.combo>1?brewName(b.combo)+' ×'+b.combo:'BREWED')+'  +'+(state.scoring.score-before),b.combo);tone(880,.14);}
 busy=effects.length>0;render();
}
function tone(freq,duration){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function layoutGems(columns){columns.forEach(column=>{const raw=column.reduce((n,d)=>n+d.radius*2*d.aspect+2,0),fit=Math.min(1,211/raw);let bottom=235;for(let j=column.length-1;j>=0;j--){const d=column[j];d.drawRadius??=d.radius*fit;const r=d.drawRadius,ry=r*d.aspect;d.targetY=bottom-ry;d.y??=d.targetY;d.y+=(d.targetY-d.y)*.13;bottom-=ry*2+2;}});}
function orb(x,y,d){
 const c=COLORS[d.color],r=d.drawRadius;ctx.save();ctx.translate(x,y);ctx.rotate(d.renderAngle??d.angle??0);ctx.scale(1,d.aspect);ctx.beginPath();
 if(d.shape===0||d.shape===4)ctx.ellipse(0,0,r*(d.shape===4?.74:1),r,0,0,Math.PI*2);else{const n=[0,4,6,5,0,3][d.shape];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2-Math.PI/2,px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();}
 const g=ctx.createRadialGradient(-r*.3,-r*.4,0,0,0,r);g.addColorStop(0,'#fff');g.addColorStop(.2,c.hex);g.addColorStop(1,c.hex+'99');ctx.fillStyle=g;ctx.globalAlpha=d.available?1:.72;ctx.fill();ctx.strokeStyle=d.available?'#ffffffbb':'#ffffff33';ctx.stroke();ctx.fillStyle='#ffffffaa';ctx.font=Math.max(7,r*.65)+'px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.symbol,0,1);ctx.restore();
}
function finishFrame(now,start){if(window.frameMeter)window.frameMeter.end(start,now);requestAnimationFrame(draw);}
function draw(now){ const frameStart=window.frameMeter?.begin(now);
 if(!state){ctx.clearRect(0,0,360,290);roundRect(22,12,316,241,24);ctx.fillStyle='#18362c';ctx.fill();finishFrame(now,frameStart);return;}
 window.potionFluid?.prepare();
 let physicsChanged=false;if(physics){if($('modal').classList.contains('hidden'))physicsChanged=physics.step(now,state.columns);}else layoutGems(state.columns);
 const dt=Math.min(.04,Math.max(0,(now-motionTime)/1000));motionTime=now;let motionActive=false;
 for(let i=0;i<5;i++){const m=bottleMotion[i],svg=slotSVGs[i];if(!svg){m.angle=m.velocity=m.lift=0;continue;}const moving=Math.abs(m.angle)>.0001||Math.abs(m.velocity)>.001||Math.abs(m.lift)>.02;if(!moving)continue;motionActive=true;m.velocity+=(-45*m.angle-9*m.velocity)*dt;m.angle+=m.velocity*dt;m.lift*=Math.exp(-dt*14);if(Math.abs(m.angle)<.0001&&Math.abs(m.velocity)<.001&&Math.abs(m.lift)<.02)m.angle=m.velocity=m.lift=0;svg.style.transform=`translateY(${m.lift}px) rotate(${m.angle*180/Math.PI}deg)`;slotNodes[i].style.setProperty('--slosh',`${-m.angle*30}deg`);}
 if(!physicsChanged&&!effects.length&&!motionActive&&!window.potionFluid?.surfaceActive&&!viewDirty&&!window.potionFluid?.dirty&&!window.potionFluid?.splashes.length){tick(now);finishFrame(now,frameStart);return;}viewDirty=false;
 time=now/1000;ctx.clearRect(0,0,360,290);ctx.save();ctx.shadowColor='#061a16';ctx.shadowBlur=15;ctx.shadowOffsetY=9;roundRect(22,12,316,241,24);ctx.fillStyle='#142e27';ctx.fill();ctx.restore();const glass=ctx.createLinearGradient(24,0,336,0);glass.addColorStop(0,'#9bb69c44');glass.addColorStop(.08,'#adc9ac10');glass.addColorStop(.85,'#d7e3c608');glass.addColorStop(1,'#accbaf33');roundRect(22,12,316,241,24);ctx.fillStyle=glass;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#9bb99c66';ctx.stroke();
 ctx.save();roundRect(26,16,308,231,20);ctx.clip();state.columns.forEach((column,i)=>column.forEach(d=>{ctx.fillStyle=`rgba(3,18,13,${Math.max(.025,.2-(244-d.y-d.drawRadius*d.aspect)*.002)})`;ctx.beginPath();ctx.ellipse(d.x??55+i*50,244,d.drawRadius*.85,2.2,0,0,7);ctx.fill();if(!window.potionFluid?.available)orb(d.renderX??d.x??55+i*50,d.renderY??d.y,d);}));
 for(const p of physics?.impacts||[]){const age=1-p.life;ctx.strokeStyle=COLORS[p.color].hex;ctx.fillStyle=COLORS[p.color].hex;ctx.globalAlpha=p.life*.3;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(p.x,p.y,3+age*p.strength*8,1+age*p.strength*2,0,0,7);ctx.stroke();for(let i=0;i<3;i++){const a=i*2.3+p.x;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*age*13,p.y-Math.sin(i+1)*age*15+age*age*12,1,0,7);ctx.fill();}}ctx.globalAlpha=1;ctx.fillStyle='#e9f6df14';roundRect(30,30,3,195,2);ctx.fill();ctx.restore();for(const x of [23,314]){roundRect(x,4,23,10,3);ctx.fillStyle='#b9a572';ctx.fill();ctx.fillStyle='#e5d39a';ctx.fillRect(x+3,5,17,2);}
 const completed=[];for(const e of effects){const p=Math.min(1,(now-e.start)/e.duration);if(!window.potionFluid?.available){const pose=window.potionSoulPose?.(p,e.from,e.to,e.gemId);ctx.save();if(pose?.phase==='pop'&&!e.stored){ctx.globalAlpha=pose.popScale;orb(e.from.x,e.from.y,{...e,drawRadius:e.radius*pose.popScale,aspect:e.aspect||1,shape:e.shape||0,available:true});}else{ctx.beginPath();for(let j=0;j<=24;j++){const q=Math.max(.16,p-.23)+j/24*(Math.min(.78,p)-Math.max(.16,p-.23)),point=window.potionSoulPose?.(q,e.from,e.to,e.gemId)||{x:e.from.x+(e.to.x-e.from.x)*q,y:e.from.y+(e.to.y-e.from.y)*q};j?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y);}ctx.lineCap='round';ctx.shadowColor=COLORS[e.color].hex;ctx.shadowBlur=16;ctx.strokeStyle=COLORS[e.color].hex;ctx.lineWidth=6;ctx.globalAlpha=Math.max(0,1-Math.max(0,p-.78)/.22);ctx.stroke();ctx.strokeStyle='#fff6dd';ctx.lineWidth=1.5;ctx.stroke();}ctx.restore();}if(p>=1)completed.push(e);}
 window.potionFluid?.update(now,state.columns,effects,COLORS,physicsChanged||motionActive,bottleMotion);for(const e of completed){effects.splice(effects.indexOf(e),1);completePour(e);}if($('modal').classList.contains('hidden'))tick(now);finishFrame(now,frameStart);
}
function showEnd(won){let resultMedal=0;if(won&&state.scoring){PotionScore.finish(state.scoring,state.level);const medal=PotionScore.medal(state.scoring,helpUsed||!ranked,Math.max(...state.queue.map(t=>t.capacity)));resultMedal=medal;if($('resultMedal'))$('resultMedal').textContent='✦'.repeat(medal);try{const key='potion-medal-'+state.level;localStorage.setItem(key,String(Math.max(medal,Number(localStorage.getItem(key))||0)));}catch{}}else if($('resultMedal'))$('resultMedal').textContent='';render();if($('resultScore')){$('resultScore').textContent=(runPoints+state.scoring.score).toLocaleString();$('submitScore').classList.toggle('hidden',won||!ranked);$('submitStatus').textContent='';$('postScore').disabled=false;$('postScore').textContent='Submit score';}globalThis.PotionTitles?.finish(won,{level:state.level,medal:resultMedal,combo:state.scoring.best,brewed:state.brewed,daily:dailyMode,day:runDay,rescued:helpUsed||!ranked});renderSpells();modalMode=won?'win':'lose';$('modal').classList.toggle('is-defeat',!won);$('modalTitle').textContent=won?'✧':'Brew ruined';$('modalTitle').setAttribute('aria-label',won?'Level completed':'Shelf blocked');$('modalRestart').classList.toggle('hidden',won);$('modalShuffle').classList.toggle('hidden',won);$('modalAction').disabled=!won&&!history.length;$('modalAction').textContent=won?'→':'Undo';$('modalAction').setAttribute('aria-label',won?'Next level':'Undo last bottle');$('modal').classList.remove('hidden');(won?$('modalAction'):$('modalRestart')).focus();}
function undo(){if(spellMode||!history.length)return;window.potionFluid?.reset();const saved=JSON.parse(history.pop());state=saved.state;runLog.length=saved.logLength||0;ranked=false;state.over=false;effects=saved.effects.map(e=>({...e,start:performance.now()}));busy=!!effects.length;lastTick=performance.now();resetPhysics();if(physics&&saved.physics){physics.settled=saved.physics.settled;physics.quietSteps=saved.physics.quietSteps;physics.sync();}$('modal').classList.add('hidden');render();}
$('queues').addEventListener('click',e=>{const b=e.target.closest('button[data-tile]');if(b&&!b.disabled)choose(Number(b.dataset.tile));});$('restart').onclick=restartGame;$('undo').onclick=undo;$('sound').onclick=()=>{sound=!sound;try{localStorage.setItem('potion-sound',sound?'on':'off');}catch{}$('sound').setAttribute('aria-pressed',String(sound));$('sound').textContent=sound?'♫':'♪';$('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');tone(660,.1);};$('sound').textContent=sound?'♫':'♪';$('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');$('sound').setAttribute('aria-pressed',String(sound));$('modalAction').onclick=()=>{if(modalMode==='win')loadLevel(state.level%30+1,false,true);else undo();};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();}});
// Challenge mode has no gem-drag control: buried colors must fall naturally.
$('shake').onclick=()=>{if(!physics||state.over)return;history.push(snapshot());ranked=false;if(state.scoring)PotionScore.breakChain(state.scoring);render();physics.nudge();$('undo').disabled=false;document.querySelector('.game').animate([{transform:'rotate(0)'},{transform:'rotate(-.45deg)'},{transform:'rotate(.4deg)'},{transform:'rotate(0)'}],{duration:360,easing:'ease-out'});tone(220,.08);};

function brewPoof(combo){
 if(!sound)return;try{
  audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const now=audio.currentTime;
  for(let i=0;i<3;i++){const o=audio.createOscillator(),gain=audio.createGain(),start=now+i*.065;o.type='sine';o.frequency.setValueAtTime((420+Math.min(combo,8)*42)*[1,1.25,1.5][i],start);o.frequency.exponentialRampToValueAtTime((520+combo*42)*[1,1.25,1.5][i],start+.1);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.022,start+.012);gain.gain.exponentialRampToValueAtTime(.001,start+.28);o.connect(gain);gain.connect(audio.destination);o.start(start);o.stop(start+.3);}
  const pop=audio.createOscillator(),gain=audio.createGain();pop.frequency.setValueAtTime(260,now);pop.frequency.exponentialRampToValueAtTime(70,now+.12);gain.gain.setValueAtTime(.045,now);gain.gain.exponentialRampToValueAtTime(.001,now+.15);pop.connect(gain);gain.connect(audio.destination);pop.start();pop.stop(now+.16);
 }catch{}
}
function flashScore(text,combo=0){
 if(typeof setTimeout!=='function'){showBrewFlash(text,combo);return;}
 if(brewQueue.length>=3)brewQueue.shift();brewQueue.push({text,combo});if(!brewTimer)nextBrewFlash();
}
function nextBrewFlash(){
 const message=brewQueue.shift();if(!message){brewTimer=null;return;}showBrewFlash(message.text,message.combo);brewTimer=setTimeout(nextBrewFlash,550);
}
function showBrewFlash(text,combo=0){
 const el=$('scoreFlash');if(!el)return;el.getAnimations?.().forEach(a=>a.cancel());el.textContent=text;
 if(el.insertAdjacentHTML){el.textContent='';const word=document.createElement('span');word.className='brew-word';word.textContent=text;el.append(word);el.insertAdjacentHTML('afterbegin','<span class="brew-cloud" aria-hidden="true"><i></i><i></i><i></i></span>');el.insertAdjacentHTML('beforeend','<span class="brew-sparks" aria-hidden="true">'+Array.from({length:8},(_,i)=>'<i style="--spark:'+i+'">'+(i%2?'✧':'✦')+'</i>').join('')+'</span>');}
 el.classList?.add('brew-announcement');el.setAttribute?.('data-potency',String(Math.min(8,combo||1)));
 el.animate?.([{opacity:0,transform:'translateY(14px) scale(.65)',filter:'blur(7px)'},{opacity:1,transform:'translateY(-3px) scale(1.08)',filter:'blur(0)',offset:.12},{opacity:1,transform:'translateY(0) scale(1)',offset:.23},{opacity:1,transform:'translateY(-3px) scale(1.02)',offset:.72},{opacity:0,transform:'translateY(-19px) scale(1.07)',filter:'blur(3px)'}],{duration:2200,fill:'forwards',easing:'ease-out'});
 if(combo>1)brewPoof(combo);
}
if($('leaderboard')?.addEventListener&&window.PotionOnline){$('leaderboard').onclick=()=>window.PotionOnline.open(state?.level||1,dailyMode);$('postScore').onclick=async()=>{
 const btn=$('postScore'),serial=runSerial,events=structuredClone(runLog),signature=JSON.stringify(events),ticketReady=runTicketReady;
 const current=()=>serial===runSerial&&state.over&&modalMode==='lose'&&signature===JSON.stringify(runLog);
 if(!current()||!ranked)return;btn.disabled=true;$('submitStatus').textContent='Submitting…';
 try{const ticket=await ticketReady;if(!current())return;if(!ticket)throw Error('Reconnect and replay to rank this run.');const result=await window.PotionOnline.submit(ticket,$('playerName').value,events,globalThis.PotionTitles?.status().rank.name||'Squire');if(!current())return;$('submitStatus').textContent='Saved · #'+result.rank;btn.textContent='Submitted';}
 catch(e){if(current()){$('submitStatus').textContent=e.message;btn.disabled=false;}}
};}


document.addEventListener('potion-level',event=>{dailyMode=!!event.detail.daily;loadLevel(event.detail.level||event.detail);});
$('daily')?.addEventListener('click',()=>{dailyMode=!dailyMode;$('daily').classList.toggle('selected',dailyMode);$('daily').textContent=dailyMode?'Journey':'Daily';loadLevel(dailyMode?PotionChallenge.level():savedLevel);});
function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=360*dpr;canvas.height=290*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);viewDirty=true;if(window.potionFluid)window.potionFluid.needsMeasure=true;}window.addEventListener('resize',resize);resize();if(typeof fetch==='function'&&typeof location!=='undefined')loadLevel(savedLevel);else newGame(savedLevel);requestAnimationFrame(draw);


$('dispel')?.addEventListener('click',()=>beginSpell('dispel'));
$('sweep')?.addEventListener('click',()=>beginSpell('sweep'));
$('sweepColors')?.addEventListener('click',event=>{const button=event.target.closest('button[data-sweep-color]');if(!button||spellMode!=='sweep')return;const color=Number(button.dataset.sweepColor),target=state.columns.flat().find(g=>g.color===color);if(target)castSpell(target.id);});
$('cancelSpell')?.addEventListener('click',cancelSpell);
$('rescueSpells')?.addEventListener('click',()=>beginSpell('dispel'));
canvas.addEventListener('click',e=>{if(!spellMode)return;const r=canvas.getBoundingClientRect(),point={x:(e.clientX-r.left)/r.width*360,y:(e.clientY-r.top)/r.height*290},picked=window.potionFluid?.available?window.potionFluid.pickGem(point):Matter.Query.point([...physics.bodies.values()],point).at(-1)?.plugin.gem.id;if(picked!=null)castSpell(picked);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&spellMode)cancelSpell();});

function shuffleCurrent(){
 if(!state||effects.length||!physics?.settled||state.brewed===state.bottleCount||!state.columns.flat().length||!globalThis.PotionTitles?.spend('shuffle'))return false;
 history.push(snapshot());const seed=Math.floor(Math.random()*4294967296);PotionSpells.shuffle(state.columns,seed);spellUses++;helpUsed=true;state.over=false;spellMode=null;runLog.push({type:'spell',spell:'shuffle',seed});PotionScore.breakChain(state.scoring);$('modal').classList.add('hidden');resetPhysics();flashScore('MIX IT UP!');tone(550,.14);render();return true;
}
$('shuffle')?.addEventListener('click',shuffleCurrent);
$('modalShuffle')?.addEventListener('click',shuffleCurrent);
$('modalRestart')?.addEventListener('click',restartGame);
