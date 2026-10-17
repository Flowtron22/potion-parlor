// Damped free-surface waves for the SVG fill boundary. GPU dye motion is in pavel-fluid.mjs.
export class LiquidSurface {
 constructor(){this.y=new Float32Array(19);this.v=new Float32Array(19);this.fill=8;this.accumulator=0;this.energy=0;}
 impact(amount=1,position=.5){const index=Math.round(position*18);for(let i=Math.max(0,index-2);i<=Math.min(18,index+2);i++)this.v[i]+=amount*(1-Math.abs(i-index)/3)*8;}
 step(dt,fill,tilt=0){this.fill+=(fill-this.fill)*(1-Math.exp(-dt*13));this.accumulator+=Math.min(.05,dt);
  while(this.accumulator>=1/120){this.accumulator-=1/120;for(let i=0;i<19;i++){const left=this.y[Math.max(0,i-1)],right=this.y[Math.min(18,i+1)];this.v[i]+=(160*(left+right-2*this.y[i])-32*this.y[i]-7*this.v[i])/120;}for(let i=0;i<19;i++)this.y[i]=Math.max(-5,Math.min(5,this.y[i]+this.v[i]/120));}
  this.energy=Math.max(Math.abs(fill-this.fill),...this.y.map(Math.abs),...this.v.map(v=>Math.abs(v)*.1));
  const base=75-this.fill*.54,points=[];for(let i=0;i<19;i++){const x=4+i*52/18;points.push([x,base+this.y[i]+tilt*(x-30)]);}return points;
 }
}
