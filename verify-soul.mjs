import assert from 'node:assert/strict';
import {soulPose,SOUL_SETTINGS as S,POP_END,SOUL_ARRIVAL} from './public/play/soul-motion.mjs';
assert.equal(S.simResolution,128);assert.equal(S.dyeResolution,1024);assert.equal(S.densityDissipation,4);assert.equal(S.velocityDissipation,0);assert.equal(S.pressure,0);assert.equal(S.curl,0);assert.equal(S.splatRadius,.04);assert.equal(S.bloomIntensity,2);assert.equal(S.bloomThreshold,1);assert.equal(S.sunraysWeight,1);
for(const [source,target]of [[{x:50,y:220},{x:310,y:320}],[{x:310,y:220},{x:50,y:320}],[{x:180,y:220},{x:180,y:320}]]){
 let delivered=0;
 for(let i=0;i<=1000;i++){const p=i/1000,pose=soulPose(p,source,target);assert(Number.isFinite(pose.x)&&Number.isFinite(pose.y));assert(pose.delivered>=delivered);delivered=pose.delivered;if(p<SOUL_ARRIVAL)assert.equal(pose.delivered,0);if(p>=POP_END)assert.equal(pose.popScale,0);}
 assert.equal(soulPose(0,source,target).popScale,1);const arrival=soulPose(SOUL_ARRIVAL,source,target);assert(Math.abs(arrival.x-target.x)<1e-8&&Math.abs(arrival.y-target.y)<1e-8);assert.equal(soulPose(1,source,target).delivered,1);
 const mid=soulPose(.45,source,target);assert(mid.emission);assert.equal(mid.phase,'flight');
}
console.log('PASS: screenshot settings, floor-pop phase, curved flight, exact neck arrival, no premature filling, monotonic delivery.');
