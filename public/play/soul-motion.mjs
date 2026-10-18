// Values read from the supplied WebGL Fluid Simulation settings screenshot.
export const SOUL_SETTINGS=Object.freeze({simResolution:32,dyeResolution:128,densityDissipation:4,velocityDissipation:4,pressure:1,curl:50,splatRadius:.01,shading:true,bloomIntensity:2,bloomThreshold:1,sunraysWeight:1});
export const POP_END=.16,SOUL_ARRIVAL=.78;
const clamp=n=>Math.max(0,Math.min(1,n));
export function soulPose(progress,source,target,seed=0){
 const p=clamp(progress),pop=clamp(p/POP_END),q=clamp((p-POP_END)/(SOUL_ARRIVAL-POP_END)),ease=q*q*(3-2*q);
 const side=target.x>=source.x?1:-1,arc=Math.sin(q*Math.PI),curl=Math.sin(q*Math.PI*2)*arc;
 return {x:source.x+(target.x-source.x)*ease+side*(arc*16+curl*16),y:source.y+(target.y-source.y)*ease-arc*34,
  popScale:p<POP_END?1-Math.pow(pop,4):0,squash:Math.sin(pop*Math.PI)*.36,phase:p<POP_END?'pop':p<SOUL_ARRIVAL?'flight':'merge',
  emission:p>=.08&&p<SOUL_ARRIVAL,delivered:clamp((p-SOUL_ARRIVAL)/(1-SOUL_ARRIVAL)),pulse:Math.sin(pop*Math.PI)};
}
