import * as THREE from './vendor/three.module.min.js';
import {PavelFluid} from './pavel-fluid.mjs?v=soul5';
import * as post from './vendor/pavel-fluid/post.mjs';
import {SOUL_SETTINGS as S,soulPose,SOUL_ARRIVAL} from './soul-motion.mjs';

const vertex=`varying vec2 vUv,vL,vR,vT,vB;uniform vec2 texelSize;void main(){vUv=position.xy*.5+.5;vL=vUv-vec2(texelSize.x,0.);vR=vUv+vec2(texelSize.x,0.);vT=vUv+vec2(0.,texelSize.y);vB=vUv-vec2(0.,texelSize.y);gl_Position=vec4(position.xy,0.,1.);}`;
const displayVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const display=`varying vec2 vUv;uniform sampler2D uTexture,uBloom,uSunrays;uniform vec2 texelSize;uniform float fade;
void main(){vec3 c=texture2D(uTexture,vUv).rgb;
 float dx=length(texture2D(uTexture,vUv+vec2(texelSize.x,0.)).rgb)-length(texture2D(uTexture,vUv-vec2(texelSize.x,0.)).rgb);
 float dy=length(texture2D(uTexture,vUv+vec2(0.,texelSize.y)).rgb)-length(texture2D(uTexture,vUv-vec2(0.,texelSize.y)).rgb);
 c*=clamp(normalize(vec3(dx,dy,length(texelSize))).z+.7,.7,1.);
 float rays=texture2D(uSunrays,vUv).r;vec3 bloom=texture2D(uBloom,vUv).rgb*rays;
 bloom=max(1.055*pow(max(bloom,vec3(0.)),vec3(.416666667))-.055,vec3(0.));
 c=c*rays+bloom;c=vec3(1.)-exp(-c*.5);float a=max(c.r,max(c.g,c.b))*fade;if(a<.004)discard;gl_FragColor=vec4(c,clamp(a,0.,1.));}`;
const absorb=`varying vec2 vUv;uniform sampler2D uTexture;uniform vec4 sinks[5];uniform float aspect;
void main(){vec3 c=texture2D(uTexture,vUv).rgb;for(int i=0;i<5;i++){vec2 d=vUv-sinks[i].xy;d.x*=aspect;c*=1.-exp(-dot(d,d)/.0007)*sinks[i].w;}gl_FragColor=vec4(c,1.);}`;
// One continuous stroke per emitter/frame, rather than many full-size splats.
const stroke=`varying vec2 vUv;uniform sampler2D uTexture;uniform vec2 a,b;uniform vec3 color;uniform float aspect,radius;
void main(){vec2 p=vUv-a,d=b-a;p.x*=aspect;d.x*=aspect;float q=clamp(dot(p,d)/max(.000001,dot(d,d)),0.,1.);vec2 offset=p-d*q;float weight=exp(-dot(offset,offset)/radius);float dose=sqrt(radius)/(sqrt(radius)+length(d)*.6);gl_FragColor=vec4(texture2D(uTexture,vUv).rgb+color*weight*dose,1.);}`;
const geometry=new THREE.PlaneGeometry(2,2);
function mat(fragment){return new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,depthTest:false,depthWrite:false,blending:THREE.NoBlending,uniforms:{texelSize:{value:new THREE.Vector2(1/256,1/256)}}});}
export class SoulField{
 constructor(renderer){
  this.renderer=renderer;this.settings=S;this.solver=new PavelFluid(renderer,{width:S.simResolution,height:S.simResolution,dyeWidth:S.dyeResolution,dyeHeight:S.dyeResolution,densityDissipation:S.densityDissipation,velocityDissipation:S.velocityDissipation,pressureDecay:S.pressure,vorticity:S.curl,gravity:0,pressureIterations:20});
  this.scene=new THREE.Scene();this.camera=new THREE.Camera();this.quad=new THREE.Mesh(geometry);this.quad.material.dispose();this.quad.frustumCulled=false;this.scene.add(this.quad);this.materials={};this.targets=[];
  for(const [name,fragment] of Object.entries(post))this.materials[name]=mat(fragment);
  this.materials.blur.vertexShader=vertex.replace('vUv-vec2(texelSize.x,0.)','vUv-texelSize*1.33333333').replace('vUv+vec2(texelSize.x,0.)','vUv+texelSize*1.33333333');
  this.materials.addBlur=mat(post.bloomBlur);Object.assign(this.materials.addBlur,{transparent:true,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation});
  this.materials.absorb=mat(absorb);
  this.materials.stroke=mat(stroke);
  this.bloom=this.target(256,256);this.levels=[128,64,32,16,8].map(n=>this.target(n,n));this.rayMask=this.target(196,196);this.rays=this.target(196,196);this.rayTemp=this.target(196,196);
  this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({vertexShader:displayVertex,fragmentShader:display,transparent:true,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,uniforms:{uTexture:{value:this.solver.texture},uBloom:{value:this.bloom.texture},uSunrays:{value:this.rays.texture},texelSize:{value:new THREE.Vector2(1/S.dyeResolution,1/S.dyeResolution)},fade:{value:1}}}));
  this.mesh.frustumCulled=false;this.mesh.visible=false;this.last=new WeakMap();this.until=0;this.active=false;this.previous=0;this.clear();
 }
 target(w,h){const rt=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false});rt.texture.generateMipmaps=false;this.targets.push(rt);return rt;}
 run(name,target,values={},add=false){const m=this.materials[name];for(const [key,value]of Object.entries(values)){if(m.uniforms[key])m.uniforms[key].value=value;else m.uniforms[key]={value};}m.uniformsNeedUpdate=true;this.quad.material=m;const auto=this.renderer.autoClear;this.renderer.autoClear=!add;this.renderer.setRenderTarget(target);this.renderer.render(this.scene,this.camera);this.renderer.autoClear=auto;}
 update(now,effects,colors,width,height,targets,motions,scaleX,scaleY){
  const dt=this.previous?Math.min(.07,(now-this.previous)/1000):1/60;this.previous=now;
  if(effects.length)this.until=now+400;
  if(!effects.length&&now>this.until){if(this.active)this.clear();return;}
  this.active=true;const sinks=Array.from({length:5},()=>new THREE.Vector4(-2,-2,0,0));
  for(const e of effects){
   let target=targets[e.slot];if(!target)continue;const motion=motions[e.slot];if(motion)target={...target,x:target.x+(target.neck||0)*Math.sin(motion.angle),y:target.y+(target.neck||0)*(1-Math.cos(motion.angle))+motion.lift};
   const p=Math.max(0,Math.min(1,(now-e.start)/e.duration)),source={x:e.from.x*scaleX,y:e.from.y*scaleY},pose=soulPose(p,source,target,e.gemId);
   e.delivered=pose.delivered;
   const point={x:Math.max(2,Math.min(width-2,pose.x)),y:Math.max(2,Math.min(height-2,pose.y))},previous=this.last.get(e)||point;
   if(pose.emission){
    const color=new THREE.Color(colors[e.color].hex);
    color.r=Math.pow(color.r,1.7);color.g=Math.pow(color.g,1.7);color.b=Math.pow(color.b,1.7);color.multiplyScalar(1/Math.max(color.r,color.g,color.b));
    const vx=(point.x-previous.x)/Math.max(.008,dt)/width*S.simResolution*.7,vy=-(point.y-previous.y)/Math.max(.008,dt)/height*S.simResolution*.7;
    const common={a:new THREE.Vector2(previous.x/width,1-previous.y/height),b:new THREE.Vector2(point.x/width,1-point.y/height),aspect:width/height,radius:S.splatRadius/100};
    this.run('stroke',this.solver.velocity.write,{...common,uTexture:this.solver.velocity.read.texture,color:new THREE.Vector3(vx,vy,0)});this.solver.velocity.swap();
    this.run('stroke',this.solver.dye.write,{...common,uTexture:this.solver.texture,color:new THREE.Vector3(color.r,color.g,color.b).multiplyScalar(3.2*dt*60)});this.solver.dye.swap();
   }
   this.last.set(e,point);if(p>=SOUL_ARRIVAL)sinks[e.slot].set(target.x/width,1-target.y/height,0,Math.min(1,pose.delivered*3));
  }
  this.solver.step(dt,{time:now/1000});this.run('absorb',this.solver.dye.write,{uTexture:this.solver.texture,sinks,aspect:width/height});this.solver.dye.swap();
  this.post();this.mesh.material.uniforms.uTexture.value=this.solver.texture;this.mesh.material.uniforms.fade.value=effects.length?1:Math.max(0,(this.until-now)/400);
  this.mesh.scale.set(width,height,1);this.mesh.position.set(width/2,height/2,85);this.mesh.visible=true;
 }
 post(){
  const knee=S.bloomThreshold*.7+.0001;this.run('bloomPrefilter',this.bloom,{uTexture:this.solver.texture,curve:new THREE.Vector3(S.bloomThreshold-knee,knee*2,.25/knee),threshold:S.bloomThreshold});
  let last=this.bloom;for(const level of this.levels){this.run('bloomBlur',level,{uTexture:last.texture,texelSize:new THREE.Vector2(1/last.width,1/last.height)});last=level;}
  for(let i=this.levels.length-2;i>=0;i--){const level=this.levels[i];this.run('addBlur',level,{uTexture:last.texture,texelSize:new THREE.Vector2(1/last.width,1/last.height)},true);last=level;}
  this.run('bloomFinal',this.bloom,{uTexture:last.texture,texelSize:new THREE.Vector2(1/last.width,1/last.height),intensity:S.bloomIntensity});
  this.run('sunraysMask',this.rayMask,{uTexture:this.solver.texture});this.run('sunrays',this.rays,{uTexture:this.rayMask.texture,weight:S.sunraysWeight});
  this.run('blur',this.rayTemp,{uTexture:this.rays.texture,texelSize:new THREE.Vector2(1/196,0)});this.run('blur',this.rays,{uTexture:this.rayTemp.texture,texelSize:new THREE.Vector2(0,1/196)});
 }
 clear(){this.solver.clear();this.active=false;this.mesh.visible=false;this.previous=0;this.last=new WeakMap();this.until=0;}
 dispose(){this.solver.dispose();for(const rt of this.targets)rt.dispose();for(const m of Object.values(this.materials))m.dispose();this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
