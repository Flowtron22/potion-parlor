'use strict';
const COLORS=[{name:'Rose',hex:'#f17b91',symbol:'♡'},{name:'Amber',hex:'#efb74e',symbol:'☀'},{name:'Mint',hex:'#7dcfa4',symbol:'✿'},{name:'Azure',hex:'#69c4e5',symbol:'☾'},{name:'Lilac',hex:'#b89ae6',symbol:'✧'},{name:'Peach',hex:'#ef9f72',symbol:'◇'}];
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let dailyMode=false;
let runLog=[],ranked=true,runTicket=null,runSerial=0,rankConnection='Connecting';
let state,history=[],effects=[],busy=false,lastTick=0,nextDrawAt=0,time=0,audio,sound=false,modalMode='win',bottleSerial=0,physics=null;
const bottleMotion=Array.from({length:5},()=>({angle:0,velocity:0,lift:0}));let motionTime=0;
let slotNodes=[],slotSVGs=[],laneNodes=[],viewDirty=true;const rackMeta=Array(5).fill(null),queueMeta=Array(4).fill(null);
let savedLevel=1;try{savedLevel=Math.max(1,Math.min(30,Number(localStorage.getItem('potion-cascade-level'))||1));}catch{}
const shuffle=(a,rng=Math.random)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const levelCache=new Map();
let levelWorker=null,loadId=0;
async function loadLevel(level){
 const id=++loadId;
 if(levelCache.has(level)){document.documentElement.classList.remove('loading');document.querySelector('.app').setAttribute('aria-busy','false');newGame(level,JSON.parse(levelCache.get(level)));return;}
 document.documentElement.classList.add('loading');document.querySelector('.app').setAttribute('aria-busy','true');$('restart').disabled=true;$('shake').disabled=true;
 try{
  const response=await fetch('boards/'+level+'.json');if(!response.ok)throw Error('Board unavailable');const data=await response.json();if(id!==loadId)return;
  levelCache.set(level,JSON.stringify(data));if(levelCache.size>3)levelCache.delete(levelCache.keys().next().value);newGame(level,data);
 }catch{if(id!==loadId)return;rankConnection='Offline';$('rankMode').textContent='Tap ↻ to retry';$('restart').disabled=false;$('restart').onclick=()=>loadLevel(level);}
 finally{if(id===loadId){document.documentElement.classList.remove('loading');document.querySelector('.app').setAttribute('aria-busy','false');}}
}
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function generate(level){return window.PotionLevels.generate(level);}

const BOTTLE_PATHS=[
 'M24 10H36V23Q36 26 39 29V65Q39 74 30 74Q21 74 21 65V29Q24 26 24 23Z',
 'M24 10H36V25C36 31 53 34 53 52C53 68 44 76 30 76C16 76 7 68 7 52C7 34 24 31 24 25Z',
 'M24 10H36V25L53 65Q57 75 46 75H14Q3 75 7 65L24 25Z',
 'M23 10H37V25Q49 26 49 36V67Q49 75 41 75H19Q11 75 11 67V36Q11 26 23 25Z',
 'M25 10H35V23C35 38 49 41 49 57C49 69 41 76 30 76C19 76 11 69 11 57C11 41 25 38 25 23Z',
 'M22 10H38V22Q47 24 47 34L44 65Q42 75 30 75Q18 75 16 65L13 34Q13 24 22 22Z'];
function liquidLayers(b,clip,y){
 const colors=b.recipe||[b.color],unit=46.44/b.capacity;
 return `<g clip-path="url(#${clip}-volume)"><rect x="4" y="0" width="52" height="82" fill="${COLORS[colors[0]].hex}"/>${b.recipe?colors.map((color,i)=>`<rect x="4" y="${70.68-(i+1)*unit}" width="52" height="${unit+.5}" fill="${COLORS[color].hex}"/>`).join(''):''}</g>`;
}
function bottle(b,fill=65,hidden=false){
 const c=COLORS[PotionRules.color(b)],clip='bottle-'+bottleSerial++,path=BOTTLE_PATHS[b.shape],h=40+b.capacity*5,w=[40,42,40,35,32,37][b.shape]*(.78+b.capacity*.06),y=75-fill*.54;
 return `<svg class="bottle shape-${b.shape}" viewBox="0 0 60 82" preserveAspectRatio="none" aria-hidden="true" data-fill="${fill}" data-capacity="${b.capacity}" style="--potion:${c.hex};--bw:${w}px;--bh:${h}px"><defs><clipPath id="${clip}"><path d="${path}"/></clipPath><clipPath id="${clip}-volume"><path class="liquid-body" d="M4 ${y}H56V82H4Z"/></clipPath><linearGradient id="${clip}-shine"><stop stop-color="#fff" stop-opacity=".3"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient></defs><path d="${path}" fill="#bbebdc0b"/>${hidden?'':`<g clip-path="url(#${clip})" class="potion-fill">${liquidLayers(b,clip,y)}<path class="meniscus" d="M4 ${y}H56" fill="none" stroke="#ecfff5aa" stroke-width=".8"/><circle class="bubble" cx="29" cy="65" r="1.3" fill="#ffffff88"/></g>`}<path d="${path}" fill="url(#${clip}-shine)" stroke="#d0f0ddaa" stroke-width="1.5"/><path d="M26 15V25M18 44V59" fill="none" stroke="#ffffff66" stroke-width="2.3" stroke-linecap="round"/><rect class="cork" x="22" y="3" width="16" height="8" rx="2" fill="#c5a36b"/><path class="cork" d="M24 4H36" stroke="#eed399"/><text x="30" y="56" text-anchor="middle" fill="${hidden?'#8da897':'#fff'}" font-size="${hidden?19:15}" font-family="Georgia">${hidden?'?':c.symbol}</text></svg>`;
}
function recipeMarks(b){return b.recipe?'<span class="recipe-bands" aria-hidden="true">'+b.recipe.map((color,i)=>`<i class="${i<(b.fill||0)?'done':i===(b.fill||0)?'next':''}" style="--ingredient:${COLORS[color].hex}">${COLORS[color].symbol}</i>`).join('')+'</span>':'';}
function render(){
 if($('daily')){$('daily').classList.toggle('selected',dailyMode);$('daily').textContent=dailyMode?'Journey':'Daily';}
 if($('score')){$('score').textContent=(state.scoring?.score||0).toLocaleString();$('combo').textContent=state.scoring?.combo>1?'CASCADE ×'+state.scoring.combo:'×1';$('combo').classList.toggle('combo-live',state.scoring?.combo>1);$('rankMode').textContent=ranked?rankConnection:'Practice';}$('level').textContent=(dailyMode?'Daily · ':'')+String(state.level).padStart(2,'0');if($('medals')){let medal=0;try{medal=Number(localStorage.getItem('potion-medal-'+state.level))||0;}catch{}$('medals').textContent=medal?'✦'.repeat(medal):'';}$('count').textContent=`${state.brewed} / ${state.bottleCount}`;$('progress').style.width=state.brewed/state.bottleCount*100+'%';$('gems').textContent=state.columns.reduce((n,c)=>n+c.length,0)+effects.length;
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
 renderQueue();
 window.potionFluid?.invalidate(slotNodes,structural);
}
function snapshot(){return JSON.stringify({logLength:runLog.length,state,effects:effects.map(e=>({...e,start:0})),physics:{settled:physics?.settled||false,quietSteps:physics?.quietSteps||0}});}
function resetPhysics(){if(state.columns.flat().some(d=>!Number.isFinite(d.drawRadius)||!Number.isFinite(d.y)))layoutGems(state.columns);if(window.GemPhysics){physics??=new window.GemPhysics();physics.reset(state.columns);}for(const m of bottleMotion){m.angle=0;m.velocity=0;m.lift=0;}for(let i=0;i<slotSVGs.length;i++)if(slotSVGs[i]){slotSVGs[i].style.transform='';slotNodes[i].style.setProperty('--slosh','0deg');}}
function newGame(level=1,prepared){
 $('scoreFlash')?.getAnimations?.().forEach(a=>a.cancel());if($('scoreFlash'))$('scoreFlash').textContent='';
 window.potionFluid?.reset();state=prepared||generate(level);state.scoring=PotionScore.fresh();
 runLog=[];ranked=true;runTicket=null;rankConnection='Connecting';const serial=++runSerial;
 window.PotionOnline?.start(level,dailyMode).then(ticket=>{if(serial!==runSerial)return;runTicket=ticket;rankConnection=ticket?'Ranked':'Offline';render();});
 history=[];effects=[];busy=false;lastTick=performance.now();nextDrawAt=0;resetPhysics();$('modal').classList.add('hidden');$('restart').onclick=()=>loadLevel(state.level);render();
}
function renderQueue(){
 const queue=state.queue||[],signature=state.level+':'+queue.filter(t=>t.taken).map(t=>t.id+':'+!!t.cleared).join(',')+':'+state.over;
 if(queueMeta[0]===signature)return;queueMeta[0]=signature;
 const rows=Math.max(...queue.map(t=>t.row),0)+1;$('queues').style.setProperty('--rows',rows);
 const connectors=queue.flatMap(t=>t.blockers.map(id=>{const p=queue.find(a=>a.id===id);return !p||p.cleared||t.cleared?'':`<path d="M${(p.x+.5)/7*350} ${p.row*51+33}V${p.row*51+47}H${(t.x+.5)/7*350}V${t.row*51+10}"/>`;})).join('');
 const walls=Array.from({length:rows},(_,row)=>Array.from({length:7},(_,x)=>queue.some(t=>t.row===row&&Math.abs(t.x-x)<.6)?'':`<span class="queue-stone" style="left:${x/7*100}%;top:${row*51}px"></span>`).join('')).join('');
 $('queues').innerHTML=walls+`<svg class="queue-links" viewBox="0 0 350 ${rows*51}" preserveAspectRatio="none" aria-hidden="true">${connectors}</svg>`+queue.map(t=>{
  if(t.cleared)return '';if(t.taken)return `<span class="queue-brewing" style="left:${(t.x+.5)/7*100}%;top:${t.row*51}px" aria-label="Brewing; branch locked">⌛</span>`;const open=PotionRules.exposed(queue,t),near=t.blockers.some(id=>{const p=queue.find(a=>a.id===id);return p&&(p.taken||PotionRules.exposed(queue,p));}),known=open||near;
  return `<button class="queue-flask ${open?'exposed':'blocked'}" data-tile="${t.id}" ${!open||state.over?'disabled':''} style="left:${(t.x+.5)/7*100}%;top:${t.row*51}px" aria-label="${known?COLORS[t.color].name+' flask, capacity '+t.capacity:'Hidden flask'}, ${open?'available':'blocked'}, flask ${t.id+1}">${known?bottle(t,65)+recipeMarks(t):'<span class="concealed-tile" aria-hidden="true"></span>'}${known?`<span class="tile-capacity">${t.capacity}</span>`:''}${open?'':'<span class="tile-lock" aria-hidden="true">⌑</span>'}</button>`;
 }).join('');
}
function choose(id){
 if(state.over)return;const b=state.queue?.find(t=>t.id===id),slot=state.shelf.indexOf(null);
 if(!b||slot<0||!PotionRules.exposed(state.queue,b))return;
 history.push(snapshot());b.taken=true;state.shelf[slot]={...b,fill:0};state.moves++;
 runLog.push({type:'place',tile:id});PotionScore.place(state.scoring);nextDrawAt=performance.now()+280;bottleMotion[slot].velocity=(b.shape%2?1:-1)*.85;bottleMotion[slot].lift=-7;tone(330+b.color*40,.06);render();
}
function tick(now){
 if(state.over||now<nextDrawAt||now-lastTick<110||!physics?.settled)return;lastTick=now;
 const drops=PotionRules.plan(state.shelf,physics.bottom(),effects);
 if(drops.length){
  const concurrent=drops.length;runLog.push({type:'draw',drops});PotionScore.burst(state.scoring,concurrent);
  if(state.scoring.combo>1){flashScore('CASCADE ×'+state.scoring.combo);tone(520+state.scoring.combo*90,.12);}for(const drop of drops)state.shelf[drop.slot].combo=Math.max(state.shelf[drop.slot].combo||1,state.scoring.combo);
  for(const drop of drops){const gem=physics.bodies.get(drop.gem).plugin.gem;const col=state.columns.find(c=>c.some(g=>g.id===gem.id));col.splice(col.findIndex(g=>g.id===gem.id),1);
   physics.remove(gem.id);effects.push({gemId:gem.id,color:gem.color,radius:gem.drawRadius,from:{x:gem.x,y:gem.y},to:{x:36+drop.slot*72,y:298},start:now,duration:1100,slot:drop.slot});tone(460+gem.color*70,.06);
  }
  busy=true;render();return;
 }
 busy=effects.length>0;$('undo').disabled=!history.length||busy;if(busy)return;
 if(state.brewed===state.bottleCount){state.over=true;if(!dailyMode){savedLevel=Math.min(30,state.level+1);try{localStorage.setItem('potion-cascade-level',String(savedLevel));}catch{}}render();showEnd(true);}
 else if(state.shelf.every(Boolean)||!state.queue.some(t=>PotionRules.exposed(state.queue,t))){state.over=true;PotionScore.breakChain(state.scoring);render();showEnd(false);}
}
function completePour(e){
 const b=state.shelf[e.slot];if(!b)return;runLog.push({type:'finish',gem:e.gemId});PotionScore.gem(state.scoring);b.fill++;
 bottleMotion[e.slot].velocity+=(e.from.x<180?1:-1)*.55;
 if(b.fill===b.capacity){const before=state.scoring.score;state.queue.find(t=>t.id===b.id).cleared=true;state.shelf[e.slot]=null;state.brewed++;PotionScore.clear(state.scoring,b.capacity,b.color,state.level,b.combo);flashScore((b.combo>1?'CASCADE ×'+b.combo:'BREWED')+'  +'+(state.scoring.score-before));tone(880,.14);}
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
 const completed=[];for(const e of effects){const p=Math.min(1,(now-e.start)/e.duration);if(!window.potionFluid?.available){ctx.save();ctx.strokeStyle=COLORS[e.color].hex;ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();for(let j=0;j<=20;j++){const q=Math.max(0,p-.4)+j/20*Math.min(p,.4),inv=1-q,x=inv*inv*e.from.x+(2*inv*q+q*q)*e.to.x,y=e.from.y+(e.to.y-e.from.y)*q;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();ctx.restore();}if(p>=1)completed.push(e);}
 window.potionFluid?.update(now,state.columns,effects,COLORS,physicsChanged||motionActive,bottleMotion);for(const e of completed){effects.splice(effects.indexOf(e),1);completePour(e);}if($('modal').classList.contains('hidden'))tick(now);finishFrame(now,frameStart);
}
function showEnd(won){if(won&&state.scoring){PotionScore.finish(state.scoring,state.level);const medal=PotionScore.medal(state.scoring,!ranked,Math.max(...state.queue.map(t=>t.capacity)));if($('resultMedal'))$('resultMedal').textContent='✦'.repeat(medal);try{const key='potion-medal-'+state.level;localStorage.setItem(key,String(Math.max(medal,Number(localStorage.getItem(key))||0)));}catch{}}else if($('resultMedal'))$('resultMedal').textContent='';render();if($('resultScore')){$('resultScore').textContent=state.scoring.score.toLocaleString();$('submitScore').classList.toggle('hidden',!won||!ranked);$('submitStatus').textContent='';$('postScore').disabled=false;$('postScore').textContent='Submit score';}modalMode=won?'win':'lose';$('modalTitle').textContent=won?'✧':'↻';$('modalTitle').setAttribute('aria-label',won?'Level completed':'Shelf blocked');$('modalAction').textContent=won?'→':'↶';$('modalAction').setAttribute('aria-label',won?'Next level':'Undo last bottle');$('modal').classList.remove('hidden');$('modalAction').focus();}
function undo(){if(!history.length)return;window.potionFluid?.reset();const saved=JSON.parse(history.pop());state=saved.state;runLog.length=saved.logLength||0;ranked=false;state.over=false;effects=saved.effects.map(e=>({...e,start:performance.now()}));busy=!!effects.length;lastTick=performance.now();resetPhysics();if(physics&&saved.physics){physics.settled=saved.physics.settled;physics.quietSteps=saved.physics.quietSteps;physics.sync();}$('modal').classList.add('hidden');render();}
$('queues').addEventListener('click',e=>{const b=e.target.closest('button[data-tile]');if(b&&!b.disabled)choose(Number(b.dataset.tile));});$('restart').onclick=()=>loadLevel(state.level);$('undo').onclick=undo;$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♫':'♪';$('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');tone(660,.1);};$('modalAction').onclick=()=>{if(modalMode==='win')loadLevel(dailyMode?state.level:Math.min(30,state.level+1));else undo();};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();}});
// Challenge mode has no gem-drag control: buried colors must fall naturally.
$('shake').onclick=()=>{if(!physics||state.over)return;history.push(snapshot());ranked=false;if(state.scoring)PotionScore.breakChain(state.scoring);render();physics.nudge();$('undo').disabled=false;document.querySelector('.game').animate([{transform:'rotate(0)'},{transform:'rotate(-.45deg)'},{transform:'rotate(.4deg)'},{transform:'rotate(0)'}],{duration:360,easing:'ease-out'});tone(220,.08);};

function flashScore(text){const el=$('scoreFlash');if(!el)return;el.textContent=text;el.getAnimations?.().forEach(a=>a.cancel());el.animate?.([{opacity:0,transform:'translateY(8px)'},{opacity:1,offset:.15},{opacity:1,offset:.7},{opacity:0,transform:'translateY(-12px)'}],{duration:2600,fill:'forwards'});}
if($('leaderboard')?.addEventListener&&window.PotionOnline){$('leaderboard').onclick=()=>window.PotionOnline.open(state?.level||1,dailyMode);$('postScore').onclick=async()=>{const btn=$('postScore');btn.disabled=true;$('submitStatus').textContent='Submitting…';try{if(!runTicket)throw Error('Reconnect and replay to rank this run.');const result=await window.PotionOnline.submit(runTicket,$('playerName').value,runLog);$('submitStatus').textContent='Saved · #'+result.rank;btn.textContent='Submitted';}catch(e){$('submitStatus').textContent=e.message;btn.disabled=false;}};}

document.addEventListener('potion-level',event=>{dailyMode=!!event.detail.daily;loadLevel(event.detail.level||event.detail);});
$('daily')?.addEventListener('click',()=>{dailyMode=!dailyMode;$('daily').classList.toggle('selected',dailyMode);$('daily').textContent=dailyMode?'Journey':'Daily';loadLevel(dailyMode?PotionChallenge.level():savedLevel);});
function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=360*dpr;canvas.height=290*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);viewDirty=true;if(window.potionFluid)window.potionFluid.needsMeasure=true;}window.addEventListener('resize',resize);resize();if(typeof fetch==='function'&&typeof location!=='undefined')loadLevel(savedLevel);else newGame(savedLevel);requestAnimationFrame(draw);

