'use strict';
const COLORS=[{name:'Rose',hex:'#f17b91',symbol:'♡'},{name:'Amber',hex:'#efb74e',symbol:'☀'},{name:'Mint',hex:'#7dcfa4',symbol:'✿'},{name:'Azure',hex:'#69c4e5',symbol:'☾'},{name:'Lilac',hex:'#b89ae6',symbol:'✧'},{name:'Peach',hex:'#ef9f72',symbol:'◇'}];
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let state,history=[],effects=[],busy=false,lastTick=0,time=0,audio,sound=false,modalMode='help',animFrame;
let savedLevel=1;try{savedLevel=Number(localStorage.getItem('potion-level'))||1;}catch{}
const shuffle=(a,rng=Math.random)=>{for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function generate(level,attempt=0){
 const rng=random(9173+level*1231+attempt*7919),batches=attempt<500?shuffle([...COLORS.keys(),...COLORS.keys()],rng):COLORS.flatMap((_,i)=>[i,i]),columns=Array.from({length:6},()=>[]);
 // Build in batches, then validate against the exact left-to-right pour policy.
 // Equal-colored batches can otherwise consume each other's accessible drops.
 batches.forEach((color,b)=>{for(let n=0;n<3;n++){const available=columns.map((c,i)=>c.length<6?i:-1).filter(i=>i>=0);let col=available[attempt<500?Math.floor(rng()*available.length):0];columns[col].push({color,id:b*3+n,seed:rng()*10});}});
 const solution=batches.slice().reverse(),lanes=Array.from({length:4},()=>[]);solution.forEach((color,i)=>lanes[i%4].push(color));
 const check=columns.map(c=>c.map(d=>d.color));
 for(const color of solution){for(let n=0;n<3;n++){const col=check.findIndex(c=>c.length&&c[c.length-1]===color);if(col<0)return generate(level,attempt+1);check[col].pop();}}
 return{level,columns,lanes,shelf:Array(5).fill(null),brewed:0,moves:0,over:false,solution};
}
function bottle(color,fill=70,hidden=false){const c=COLORS[color];return `<span class="bottle" style="--potion:${hidden?'#6b8979':c.hex};--fill:${fill}%"><span class="glass">${hidden?'<span class="unknown">?</span>':'<span class="liquid"></span><span class="sigil">'+c.symbol+'</span>'}</span></span>`;}
function render(){
 $('level').textContent=String(state.level).padStart(2,'0');$('levelName').textContent=['The first brew','Moonlit infusion','The secret garden','Stardust & sage','An amber evening'][(state.level-1)%5];$('count').textContent=`${state.brewed} / 12 brewed`;$('progress').style.width=state.brewed/12*100+'%';
 $('slots').textContent=state.shelf.filter(Boolean).length+' / 5';
 $('rack').innerHTML=state.shelf.map((b,i)=>`<div class="slot" aria-label="${b?COLORS[b.color].name+' bottle, '+b.fill+' of 3 drops':'Empty shelf slot '+(i+1)}">${b?bottle(b.color,12+b.fill/3*75)+`<span class="fill-label">${b.fill} / 3</span>`:''}</div>`).join('');
 $('queues').innerHTML=state.lanes.map((lane,i)=>`<div class="lane">${lane.length?lane.map((color,j)=>`<button ${j||state.over?'disabled':''} class="${j?'':'front'}" data-lane="${i}" aria-label="${j?'Hidden bottle':COLORS[color].name+' potion, lane '+(i+1)}">${bottle(color,65,j>0)}</button>`).join(''):'<div class="empty-lane">All brewed ✧</div>'}</div>`).join('');
 $('undo').disabled=!history.length||busy;
}
function status(message){$('status').textContent=message;}
function newGame(level=1){window.potionFluid?.reset();state=generate(level);history=[];effects=[];busy=false;lastTick=performance.now();render();status('Pick a potion below. Let the magic flow.');}
function choose(lane){
 if(state.over||!state.lanes[lane]?.length)return;
 const slot=state.shelf.indexOf(null);if(slot<0){status('Your shelf is full — wait for the pour, or undo.');return;}
 // Save all logical state so undo remains exact even during a pour.
 history.push(JSON.stringify(state));const color=state.lanes[lane].shift();state.shelf[slot]={color,fill:0};state.moves++;tone(330+color*40,.06);status(`${COLORS[color].name} is on the shelf. Watching for matching drops…`);render();
}
function tick(now){
 if(state.over||effects.length)return;
 if(now-lastTick<340)return;lastTick=now;
 // One drop at a time keeps the source, stream, and bottle fill easy to follow.
 for(let i=0;i<5;i++){
  const b=state.shelf[i];if(!b)continue;
  const col=state.columns.findIndex(c=>c.length&&c[c.length-1].color===b.color);
  if(col<0)continue;
  const drop=state.columns[col].pop();busy=true;$('undo').disabled=true;
  effects.push({color:drop.color,from:{x:55+col*50,y:219},to:{x:36+i*72,y:298},start:now,duration:1150,slot:i});tone(460+drop.color*70,.04);return;
 }
 busy=false;$('undo').disabled=!history.length;
 if(state.brewed===12){state.over=true;try{localStorage.setItem('potion-level',String(state.level+1));}catch{};render();showEnd(true);return;}
 if(state.shelf.every(Boolean)){state.over=true;render();showEnd(false);return;}
 const waiting=state.shelf.filter(Boolean).length;status(waiting?'No matching drops exposed. Try another front bottle.':'Pick a potion below. Let the magic flow.');
}
function completePour(effect){const b=state.shelf[effect.slot];if(!b)return;b.fill++;if(b.fill===3){state.shelf[effect.slot]=null;state.brewed++;tone(880,.14);status('A perfect brew! A little more room for magic.');}busy=false;render();}
function tone(freq,duration){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.4,audio.currentTime+duration);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function orb(x,y,color,seed,t){
 const c=COLORS[color],radius=21+Math.sin(seed)*2,sy=1+Math.sin(t*1.5+seed)*.028,sx=1/sy;ctx.save();ctx.translate(x,y+Math.sin(t+seed)*1.5);ctx.scale(sx,sy);
 const glow=ctx.createRadialGradient(-7,-9,1,1,3,radius);glow.addColorStop(0,c.hex);glow.addColorStop(.62,c.hex);glow.addColorStop(1,c.hex+'99');ctx.shadowColor=c.hex+'55';ctx.shadowBlur=9;
 ctx.beginPath();for(let i=0;i<=40;i++){const a=i/40*Math.PI*2,r=radius+Math.sin(a*3+t+seed)*.75;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fillStyle=glow;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#ffffff28';ctx.lineWidth=1;ctx.stroke();
 ctx.beginPath();ctx.ellipse(-6,-9,7,3,-.65,0,Math.PI*2);ctx.fillStyle='#ffffff52';ctx.fill();ctx.fillStyle='#ffffffbb';ctx.font='15px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.symbol,0,3);ctx.beginPath();ctx.arc(8,10,1.4,0,7);ctx.fillStyle='#ffffff55';ctx.fill();ctx.restore();
}
function draw(now){time=now/1000;ctx.clearRect(0,0,360,290);
 // Brass fittings around a glass reservoir.
 ctx.save();ctx.shadowColor='#061a16';ctx.shadowBlur=15;ctx.shadowOffsetY=9;roundRect(22,12,316,241,24);ctx.fillStyle='#142e27';ctx.fill();ctx.restore();
 const glass=ctx.createLinearGradient(24,0,336,0);glass.addColorStop(0,'#9bb69c44');glass.addColorStop(.08,'#adc9ac10');glass.addColorStop(.85,'#d7e3c608');glass.addColorStop(1,'#accbaf33');roundRect(22,12,316,241,24);ctx.fillStyle=glass;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#9bb99c66';ctx.stroke();
 ctx.save();roundRect(26,16,308,231,20);ctx.clip();
 // The fluid settles down the columns as the exposed drops are collected.
 state.columns.forEach((column,i)=>column.forEach((d,j)=>{const target=44+(6-column.length+j)*35;d.y??=target;d.y+=(target-d.y)*.11;if(!window.potionFluid?.available)orb(55+i*50,d.y,d.color,d.seed,time);}));
 ctx.fillStyle='#e9f6df14';roundRect(30,30,3,195,2);ctx.fill();ctx.restore();
 for(const x of [23,314]){roundRect(x,4,23,10,3);ctx.fillStyle='#b9a572';ctx.fill();ctx.fillStyle='#e5d39a';ctx.fillRect(x+3,5,17,2);}
 ctx.fillStyle='#afcdb01c';roundRect(43,243,274,3,2);ctx.fill();
 ctx.textAlign='center';ctx.font='8px DM Sans, sans-serif';ctx.fillStyle='#99b699';ctx.letterSpacing='2px';ctx.fillText('ENCHANTED ESSENCE',180,273);ctx.letterSpacing='0px';
 const completed=[];effects.forEach(e=>{
  const p=Math.min(1,(now-e.start)/e.duration),c=COLORS[e.color].hex;
  const point=q=>{const inv=1-q;return{x:inv*inv*e.from.x+2*inv*q*e.to.x+q*q*e.to.x,y:inv*inv*e.from.y+2*inv*q*(e.from.y+40)+q*q*e.to.y};};
  if(!window.potionFluid?.available){ctx.save();ctx.shadowColor=c;ctx.shadowBlur=14;ctx.strokeStyle=c;ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();for(let j=0;j<=20;j++){const q=Math.max(0,p-.32)+j/20*Math.min(p,.32),a=point(q);j?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y);}ctx.stroke();const head=point(p);ctx.beginPath();ctx.ellipse(head.x,head.y,4,6,0,0,7);ctx.fillStyle=c;ctx.fill();ctx.restore();}if(p>=1)completed.push(e);
 });
 window.potionFluid?.update(now,state.columns,effects,COLORS);
 for(const e of completed){effects.splice(effects.indexOf(e),1);completePour(e);}
 if($('modal').classList.contains('hidden'))tick(now);animFrame=requestAnimationFrame(draw);
}
const helpHTML=$('modalBody').innerHTML;
function openHelp(){modalMode='help';$('modalTitle').textContent='Pour a little magic.';$('modalBody').innerHTML=helpHTML;$('modalAction').innerHTML='Let’s brew <span>→</span>';$('modal').classList.remove('hidden');$('modalAction').focus();}
function showEnd(won){modalMode=won?'win':'lose';$('modalTitle').textContent=won?'Beautifully brewed.':'A little tangled magic.';$('modalBody').innerHTML=won?`<p>All 36 drops, twelve perfect potions. You cleared the cellar in <b>${state.moves} moves</b>.</p><p>A fresh collection of enchanted essences is waiting for you.</p>`:'<p>All five shelf slots are waiting for colors that are buried in the reservoir.</p><p>Use <b>Undo</b> to rethink your last bottle, or restart this brew. Watch the bottom drops to plan your next pour.</p>';$('modalAction').innerHTML=won?'Next brew <span>→</span>':'Undo last bottle <span>↶</span>';$('modal').classList.remove('hidden');$('modalAction').focus();}
function undo(){if(!history.length)return;window.potionFluid?.reset();state=JSON.parse(history.pop());state.over=false;effects=[];busy=false;lastTick=performance.now();$('modal').classList.add('hidden');render();status('One step back. A fresh possibility.');}
document.getElementById('queues').addEventListener('click',e=>{const b=e.target.closest('button[data-lane]');if(b&&!b.disabled)choose(Number(b.dataset.lane));});
$('restart').onclick=()=>{newGame(state.level);};$('undo').onclick=undo;$('help').onclick=openHelp;$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♫':'♪';$('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');$('sound').style.color=sound?'#e9c982':'';tone(660,.1);};
$('modalAction').onclick=()=>{const mode=modalMode;$('modal').classList.add('hidden');if(mode==='win')newGame(state.level+1);if(mode==='lose')undo();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modalMode==='help')$('modal').classList.add('hidden');if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();}if(e.key==='Tab'&&!$('modal').classList.contains('hidden')){e.preventDefault();$('modalAction').focus();}});
$('legend').innerHTML=COLORS.map(c=>`<span><i class="legend-dot" style="background:${c.hex}"></i>${c.name}</span>`).join('');
function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=360*dpr;canvas.height=290*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}window.addEventListener('resize',resize);resize();$('modal').classList.add('hidden');newGame(savedLevel);animFrame=requestAnimationFrame(draw);
