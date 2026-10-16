'use strict';
const COLORS=[{name:'Rose',hex:'#f17b91',symbol:'♡'},{name:'Amber',hex:'#efb74e',symbol:'☀'},{name:'Mint',hex:'#7dcfa4',symbol:'✿'},{name:'Azure',hex:'#69c4e5',symbol:'☾'},{name:'Lilac',hex:'#b89ae6',symbol:'✧'},{name:'Peach',hex:'#ef9f72',symbol:'◇'}];
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let state,history=[],effects=[],busy=false,lastTick=0,time=0,audio,sound=false,modalMode='win',bottleSerial=0,physics=null;
const bottleMotion=Array.from({length:5},()=>({angle:0,velocity:0,lift:0}));let motionTime=0;
let slotNodes=[],slotSVGs=[],laneNodes=[],viewDirty=true;const rackMeta=Array(5).fill(null),queueMeta=Array(4).fill(null);
let savedLevel=1;try{savedLevel=Math.max(1,Math.min(9999,Number(localStorage.getItem('potion-level'))||1));}catch{}
const shuffle=(a,rng=Math.random)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const levelCache=new Map();
let levelWorker=null,loadId=0;
function loadLevel(level){
 if(levelCache.has(level)){newGame(level,JSON.parse(levelCache.get(level)));return;}
 if(typeof Worker!=='function'){newGame(level);return;}
 document.documentElement.classList.add('loading');document.querySelector('.app').setAttribute('aria-busy','true');$('restart').disabled=true;$('shake').disabled=true;
 const id=++loadId;
 const fallback=()=>{levelWorker?.terminate();levelWorker=null;document.documentElement.classList.remove('loading');document.querySelector('.app').setAttribute('aria-busy','false');setTimeout(()=>newGame(level),0);};
 try{
  if(!levelWorker)levelWorker=new Worker('level-worker.js');
  levelWorker.onmessage=event=>{if(event.data.id!==loadId)return;if(event.data.error){fallback();return;}const data=event.data.data;levelCache.set(level,JSON.stringify(data));if(levelCache.size>3)levelCache.delete(levelCache.keys().next().value);document.documentElement.classList.remove('loading');document.querySelector('.app').setAttribute('aria-busy','false');newGame(level,data);};
  levelWorker.onerror=fallback;levelWorker.postMessage({id,level});
 }catch{fallback();}
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
function bottle(b,fill=65,hidden=false){
 const c=COLORS[b.color],clip='bottle-'+bottleSerial++,path=BOTTLE_PATHS[b.shape],h=40+b.capacity*5,w=[40,42,40,35,32,37][b.shape]*(.78+b.capacity*.06),y=75-fill*.54;
 return `<svg class="bottle shape-${b.shape}" viewBox="0 0 60 82" preserveAspectRatio="none" aria-hidden="true" style="--potion:${c.hex};--bw:${w}px;--bh:${h}px"><defs><clipPath id="${clip}"><path d="${path}"/></clipPath><linearGradient id="${clip}-shine"><stop stop-color="#fff" stop-opacity=".3"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient></defs><path d="${path}" fill="#bbebdc0b"/>${hidden?'':`<g clip-path="url(#${clip})" class="potion-fill"><rect x="4" y="${y}" width="52" height="80" fill="${c.hex}" fill-opacity=".85"/><path class="meniscus" d="M0 ${y} Q15 ${y-3} 30 ${y} T60 ${y}V${y+7}H0Z" fill="${c.hex}"/><circle class="bubble" cx="29" cy="65" r="1.3" fill="#ffffff88"/></g>`}<path d="${path}" fill="url(#${clip}-shine)" stroke="#d0f0ddaa" stroke-width="1.5"/><path d="M26 15V25M18 44V59" fill="none" stroke="#ffffff66" stroke-width="2.3" stroke-linecap="round"/><rect class="cork" x="22" y="3" width="16" height="8" rx="2" fill="#c5a36b"/><path class="cork" d="M24 4H36" stroke="#eed399"/><text x="30" y="56" text-anchor="middle" fill="${hidden?'#8da897':'#fff'}" font-size="${hidden?19:15}" font-family="Georgia">${hidden?'?':c.symbol}</text></svg>`;
}
function render(){
 $('level').textContent=String(state.level).padStart(2,'0');$('count').textContent=`${state.brewed} / ${state.bottleCount}`;$('progress').style.width=state.brewed/state.bottleCount*100+'%';$('gems').textContent=state.columns.reduce((n,c)=>n+c.length,0)+effects.length;
 $('undo').disabled=!history.length||busy;$('restart').disabled=false;$('shake').disabled=false;viewDirty=true;
 if(!$('rack').children)return;
 let structural=false;
 if(!slotNodes.length){$('rack').innerHTML=Array(5).fill('<div class="slot"></div>').join('');slotNodes=Array.from($('rack').children);$('queues').innerHTML=Array(4).fill('<div class="lane"></div>').join('');laneNodes=Array.from($('queues').children);structural=true;}
 state.shelf.forEach((b,i)=>{const slot=slotNodes[i],key=b?state.level+':'+b.id:'empty';
  if(rackMeta[i]?.key!==key){slot.innerHTML=b?bottle(b,8+b.fill/b.capacity*86)+`<span class="fill-label">${b.fill}/${b.capacity}</span>`:'';slotSVGs[i]=slot.querySelector('.bottle');rackMeta[i]={key,fill:b?.fill};structural=true;}
  else if(b&&rackMeta[i].fill!==b.fill){const y=75-(8+b.fill/b.capacity*86)*.54;slot.querySelector('.potion-fill rect').setAttribute('y',y);slot.querySelector('.meniscus').setAttribute('d',`M0 ${y} Q15 ${y-3} 30 ${y} T60 ${y}V${y+7}H0Z`);slot.querySelector('.fill-label').textContent=`${b.fill}/${b.capacity}`;rackMeta[i].fill=b.fill;}
  slot.setAttribute('aria-label',b?COLORS[b.color].name+' bottle, '+b.fill+' of '+b.capacity:'Empty shelf slot '+(i+1));
 });
 state.lanes.forEach((lane,i)=>{const signature=state.level+':'+lane.map(b=>b.id).join(',')+':'+state.over;if(queueMeta[i]===signature)return;queueMeta[i]=signature;laneNodes[i].innerHTML=lane.length?lane.slice(0,3).map((b,j)=>`<button ${j||state.over?'disabled':''} class="${j?'':'front'}" data-lane="${i}" aria-label="${j?'Hidden bottle':COLORS[b.color].name+' potion, capacity '+b.capacity+', lane '+(i+1)}">${bottle(b,65,j>0)}${j?'':`<span class="capacity">${b.capacity}</span>`}</button>`).join('')+(lane.length>3?`<span class="queued-more">+${lane.length-3}</span>`:''):'<span class="lane-cleared" aria-label="Lane cleared">✧</span>';});
 window.potionFluid?.invalidate(slotNodes,structural);
}
function snapshot(){return JSON.stringify({state,effects:effects.map(e=>({...e,start:0})),physics:{settled:physics?.settled||false,quietSteps:physics?.quietSteps||0}});}
function resetPhysics(){if(state.columns.flat().some(d=>!Number.isFinite(d.drawRadius)||!Number.isFinite(d.y)))layoutGems(state.columns);if(window.GemPhysics){physics??=new window.GemPhysics();physics.reset(state.columns);}for(const m of bottleMotion){m.angle=0;m.velocity=0;m.lift=0;}for(let i=0;i<slotSVGs.length;i++)if(slotSVGs[i]){slotSVGs[i].style.transform='';slotNodes[i].style.setProperty('--slosh','0deg');}}
function newGame(level=1,prepared){window.potionFluid?.reset();state=prepared||generate(level);history=[];effects=[];busy=false;lastTick=performance.now();resetPhysics();$('modal').classList.add('hidden');render();}
function choose(lane){if(state.over||!state.lanes[lane]?.length)return;const slot=state.shelf.indexOf(null);if(slot<0)return;history.push(snapshot());const b=state.lanes[lane].shift();state.shelf[slot]={...b,fill:0};state.moves++;bottleMotion[slot].velocity=(b.shape%2?1:-1)*.85;bottleMotion[slot].lift=-7;tone(330+b.color*40,.06);render();}
function tick(now){
 if(state.over||effects.length||now-lastTick<240||!physics?.settled)return;lastTick=now;
 for(let i=0;i<5;i++){const b=state.shelf[i];if(!b)continue;const drop=physics.bottom(b.color)[0];if(!drop)continue;const col=state.columns.findIndex(c=>c.some(d=>d.id===drop.id));state.columns[col]=state.columns[col].filter(d=>d.id!==drop.id);physics.remove(drop.id);busy=true;$('undo').disabled=true;
  effects.push({color:drop.color,radius:drop.drawRadius||drop.radius,from:{x:drop.x??55+col*50,y:drop.y||220},to:{x:36+i*72,y:298},start:now,duration:850,slot:i});tone(460+drop.color*70,.04);return;}
 busy=false;$('undo').disabled=!history.length;
 if(state.brewed===state.bottleCount){state.over=true;try{localStorage.setItem('potion-level',String(state.level+1));}catch{}render();showEnd(true);}else if(state.shelf.every(Boolean)){state.over=true;render();showEnd(false);}
}
function completePour(e){const b=state.shelf[e.slot];if(!b)return;b.fill++;bottleMotion[e.slot].velocity+=(e.from.x<180?1:-1)*.55;if(b.fill===b.capacity){state.shelf[e.slot]=null;state.brewed++;tone(880,.14);}busy=false;render();}
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
 if(!physicsChanged&&!effects.length&&!motionActive&&!viewDirty&&!window.potionFluid?.dirty&&!window.potionFluid?.splashes.length){tick(now);finishFrame(now,frameStart);return;}viewDirty=false;
 time=now/1000;ctx.clearRect(0,0,360,290);ctx.save();ctx.shadowColor='#061a16';ctx.shadowBlur=15;ctx.shadowOffsetY=9;roundRect(22,12,316,241,24);ctx.fillStyle='#142e27';ctx.fill();ctx.restore();const glass=ctx.createLinearGradient(24,0,336,0);glass.addColorStop(0,'#9bb69c44');glass.addColorStop(.08,'#adc9ac10');glass.addColorStop(.85,'#d7e3c608');glass.addColorStop(1,'#accbaf33');roundRect(22,12,316,241,24);ctx.fillStyle=glass;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#9bb99c66';ctx.stroke();
 ctx.save();roundRect(26,16,308,231,20);ctx.clip();state.columns.forEach((column,i)=>column.forEach(d=>{ctx.fillStyle=`rgba(3,18,13,${Math.max(.025,.2-(244-d.y-d.drawRadius*d.aspect)*.002)})`;ctx.beginPath();ctx.ellipse(d.x??55+i*50,244,d.drawRadius*.85,2.2,0,0,7);ctx.fill();if(!window.potionFluid?.available)orb(d.renderX??d.x??55+i*50,d.renderY??d.y,d);}));
 for(const p of physics?.impacts||[]){const age=1-p.life;ctx.strokeStyle=COLORS[p.color].hex;ctx.fillStyle=COLORS[p.color].hex;ctx.globalAlpha=p.life*.3;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(p.x,p.y,3+age*p.strength*8,1+age*p.strength*2,0,0,7);ctx.stroke();for(let i=0;i<3;i++){const a=i*2.3+p.x;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*age*13,p.y-Math.sin(i+1)*age*15+age*age*12,1,0,7);ctx.fill();}}ctx.globalAlpha=1;ctx.fillStyle='#e9f6df14';roundRect(30,30,3,195,2);ctx.fill();ctx.restore();for(const x of [23,314]){roundRect(x,4,23,10,3);ctx.fillStyle='#b9a572';ctx.fill();ctx.fillStyle='#e5d39a';ctx.fillRect(x+3,5,17,2);}
 const completed=[];for(const e of effects){const p=Math.min(1,(now-e.start)/e.duration);if(!window.potionFluid?.available){ctx.save();ctx.strokeStyle=COLORS[e.color].hex;ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();for(let j=0;j<=20;j++){const q=Math.max(0,p-.4)+j/20*Math.min(p,.4),inv=1-q,x=inv*inv*e.from.x+(2*inv*q+q*q)*e.to.x,y=e.from.y+(e.to.y-e.from.y)*q;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();ctx.restore();}if(p>=1)completed.push(e);}
 window.potionFluid?.update(now,state.columns,effects,COLORS,physicsChanged||motionActive,bottleMotion);for(const e of completed){effects.splice(effects.indexOf(e),1);completePour(e);}if($('modal').classList.contains('hidden'))tick(now);finishFrame(now,frameStart);
}
function showEnd(won){modalMode=won?'win':'lose';$('modalTitle').textContent=won?'✧':'↻';$('modalTitle').setAttribute('aria-label',won?'Level completed':'Shelf blocked');$('modalAction').textContent=won?'→':'↶';$('modalAction').setAttribute('aria-label',won?'Next level':'Undo last bottle');$('modal').classList.remove('hidden');$('modalAction').focus();}
function undo(){if(!history.length)return;window.potionFluid?.reset();const saved=JSON.parse(history.pop());state=saved.state;state.over=false;effects=saved.effects.map(e=>({...e,start:performance.now()}));busy=!!effects.length;lastTick=performance.now();resetPhysics();if(physics&&saved.physics){physics.settled=saved.physics.settled;physics.quietSteps=saved.physics.quietSteps;physics.sync();}$('modal').classList.add('hidden');render();}
$('queues').addEventListener('click',e=>{const b=e.target.closest('button[data-lane]');if(b&&!b.disabled)choose(Number(b.dataset.lane));});$('restart').onclick=()=>loadLevel(state.level);$('undo').onclick=undo;$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♫':'♪';$('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');tone(660,.1);};$('modalAction').onclick=()=>{if(modalMode==='win')loadLevel(state.level+1);else undo();};
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();}if(e.key==='Tab'&&!$('modal').classList.contains('hidden')){e.preventDefault();$('modalAction').focus();}});
// Challenge mode has no gem-drag control: buried colors must fall naturally.
$('shake').onclick=()=>{if(!physics||state.over)return;history.push(snapshot());physics.nudge();$('undo').disabled=false;document.querySelector('.game').animate([{transform:'rotate(0)'},{transform:'rotate(-.45deg)'},{transform:'rotate(.4deg)'},{transform:'rotate(0)'}],{duration:360,easing:'ease-out'});tone(220,.08);};
function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=360*dpr;canvas.height=290*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);viewDirty=true;if(window.potionFluid)window.potionFluid.needsMeasure=true;}window.addEventListener('resize',resize);resize();if(typeof Worker==='function'&&location.protocol!=='file:')loadLevel(savedLevel);else newGame(savedLevel);requestAnimationFrame(draw);
