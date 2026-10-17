import assert from 'node:assert/strict';
import {LiquidJet,LiquidSurface} from './public/play/liquid-physics.mjs';
for(const fps of [30,60,120])for(const dx of [-180,0,180]){
 const jet=new LiquidJet(1),source={x:180,y:180},target={x:180+dx,y:310};let received=0,max=0;
 for(let frame=1;frame<=fps*1.6;frame++){
  received+=jet.step(1/fps,source,target,Math.min(1,frame/fps/1.1));max=Math.max(max,jet.particles.length);
  for(const p of jet.particles)assert([p.x,p.y,p.vx,p.vy].every(Number.isFinite));
 }
 assert.equal(jet.emitted,105);assert.equal(received,105);assert.equal(jet.particles.length,0);assert(max<=150);
}
const surface=new LiquidSurface();surface.impact(1);surface.step(1/60,60);assert(surface.energy>0);
let points;for(let i=0;i<1200;i++)points=surface.step(1/120,60);
assert(surface.energy<.025);assert(Math.abs(surface.fill-60)<.001);assert.equal(points.length,19);
console.log('PASS: liquid conserves emitted volume and drains at 30/60/120 fps; all trajectories finite; bounded particles; surface ripples settle to rest.');
