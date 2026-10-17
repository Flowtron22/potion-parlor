// A bounded 2D position-based fluid. Simulation particles are reconstructed into
// one surface by fluid.js; they are never drawn as individual visible circles.
export class LiquidJet {
 constructor(seed=1){this.particles=[];this.seed=seed;this.accumulator=0;this.emitted=0;this.lastProgress=0;this.arrivals=0;}
 noise(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296-.5;}
 step(dt,source,target,progress,scale=1){
  this.accumulator+=Math.min(.04,Math.max(0,dt));this.arrivals=0;
  const gravity=1750*scale,h=7*scale,flight=Math.sqrt(2*Math.max(20,target.y-source.y)/gravity),emitUntil=.5;
  while(this.accumulator>=1/120){this.accumulator-=1/120;const step=1/120;
   const desired=Math.floor(Math.min(progress/emitUntil,1)*105);
   while(this.emitted<desired&&this.particles.length<150){
    // Spread emissions along the nozzle velocity within this substep, avoiding clumps.
    const lag=(desired-this.emitted-1)/185;
    const vx=(target.x-source.x)/flight,vy=22*scale;
    this.particles.push({x:source.x+vx*lag+this.noise()*.35*scale,y:source.y+vy*lag+gravity*lag*lag*.5,vx,vy:vy+gravity*lag});this.emitted++;
   }
   for(const p of this.particles){p.oldX=p.x;p.oldY=p.y;p.vy+=gravity*step;p.x+=p.vx*step;p.y+=p.vy*step;}
   const grid=new Map(),cell=p=>[Math.floor(p.x/h),Math.floor(p.y/h)];
   for(const p of this.particles){const [x,y]=cell(p),key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(p);}
   // Short-range viscosity and double-density relaxation (incompressibility + cohesion).
   for(const p of this.particles){const [cx,cy]=cell(p),neighbors=[];let density=0,near=0;
    for(let y=cy-1;y<=cy+1;y++)for(let x=cx-1;x<=cx+1;x++)for(const q of grid.get(x+','+y)||[]){if(p===q)continue;const dx=q.x-p.x,dy=q.y-p.y,r=Math.hypot(dx,dy);if(r>0&&r<h){const w=1-r/h;density+=w*w;near+=w*w*w;neighbors.push({q,dx:dx/r,dy:dy/r,w});}}
    const pressure=(density-2)*.008*scale,nearPressure=near*.012*scale;
    for(const {q,dx,dy,w} of neighbors){const displacement=(pressure*w+nearPressure*w*w)*.5;p.x-=dx*displacement;p.y-=dy*displacement;q.x+=dx*displacement;q.y+=dy*displacement;const viscosity=.035*w*step;p.x+=(q.vx-p.vx)*viscosity;p.y+=(q.vy-p.vy)*viscosity;}
   }
   const remaining=[];
   for(const p of this.particles){
    p.vx=(p.x-p.oldX)/step;p.vy=(p.y-p.oldY)/step;
    // The bottle mouth is a collector: particles enter it instead of splashing
    // against an invisible screen-space wall. Its motion affects the last segment.
    if(p.y>target.y-22*scale){const weight=Math.min(1,(p.y-target.y+22*scale)/(22*scale));p.x+=(target.x-p.x)*weight*.6;}
    if(p.y>=target.y){this.arrivals++;}else if(p.y>source.y-20*scale&&p.y<target.y+30*scale)remaining.push(p);
   }
   this.particles=remaining;
  }
  this.lastProgress=progress;return this.arrivals;
 }
}

export class LiquidSurface {
 constructor(){this.y=new Float32Array(19);this.v=new Float32Array(19);this.fill=8;this.accumulator=0;this.energy=0;}
 impact(amount=1,position=.5){const index=Math.round(position*18);for(let i=Math.max(0,index-2);i<=Math.min(18,index+2);i++)this.v[i]+=amount*(1-Math.abs(i-index)/3)*8;}
 step(dt,fill,tilt=0){this.fill+=(fill-this.fill)*(1-Math.exp(-dt*13));this.accumulator+=Math.min(.05,dt);
  while(this.accumulator>=1/120){this.accumulator-=1/120;for(let i=0;i<19;i++){const left=this.y[Math.max(0,i-1)],right=this.y[Math.min(18,i+1)];this.v[i]+=(160*(left+right-2*this.y[i])-32*this.y[i]-7*this.v[i])/120;}for(let i=0;i<19;i++)this.y[i]=Math.max(-5,Math.min(5,this.y[i]+this.v[i]/120));}
  this.energy=Math.max(Math.abs(fill-this.fill),...this.y.map(Math.abs),...this.v.map(v=>Math.abs(v)*.1));
  const base=75-this.fill*.54,points=[];for(let i=0;i<19;i++){const x=4+i*52/18;points.push([x,base+this.y[i]+tilt*(x-30)]);}return points;
 }
}
