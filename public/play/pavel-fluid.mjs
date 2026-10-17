// GPU velocity/dye solver adapted from Pavel Dobryakov's MIT-licensed
// WebGL-Fluid-Simulation. The original seven passes live in vendor/pavel-fluid.
import * as THREE from './vendor/three.module.min.js';
import * as upstream from './vendor/pavel-fluid/shaders.mjs';

const vertex=`varying vec2 vUv,vL,vR,vT,vB;uniform vec2 texelSize;
void main(){vUv=position.xy*.5+.5;vL=vUv-vec2(texelSize.x,0.);vR=vUv+vec2(texelSize.x,0.);vT=vUv+vec2(0.,texelSize.y);vB=vUv-vec2(0.,texelSize.y);gl_Position=vec4(position.xy,0.,1.);}`;
const boundary=`uniform sampler2D uMask;uniform float uUseMask,uLevel;
bool solid(vec2 uv){return uUseMask>.5&&(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>uLevel||texture2D(uMask,uv).a<.5);}
`;
function masked(name,source){
 source=source.replace('void main () {','void main () {\nif(solid(vUv)){gl_FragColor=vec4(0.);return;}');
 if(name==='divergence')source=source.replace('float div =',`if(solid(vL))L=-C.x;if(solid(vR))R=-C.x;if(solid(vT))T=-C.y;if(solid(vB))B=-C.y;\nfloat div =`);
 if(name==='pressure')source=source.replace('float divergence =',`if(solid(vL))L=C;if(solid(vR))R=C;if(solid(vT))T=C;if(solid(vB))B=C;\nfloat divergence =`);
 if(name==='gradientSubtract')source=source.replace('vec2 velocity =',`float C=texture2D(uPressure,vUv).x;if(solid(vL))L=C;if(solid(vR))R=C;if(solid(vT))T=C;if(solid(vB))B=C;\nvec2 velocity =`).replace('gl_FragColor =',`if(solid(vL)||solid(vR))velocity.x=0.;if(solid(vT)||solid(vB))velocity.y=0.;\ngl_FragColor =`);
 return boundary+source;
}
const force=`varying vec2 vUv;uniform sampler2D uVelocity;uniform float dt,uTime,uGuided;uniform vec2 uSource,uTarget,uResolution;
void main(){if(solid(vUv)){gl_FragColor=vec4(0.);return;}vec2 v=texture2D(uVelocity,vUv).xy;
 if(uGuided>.5){float q=clamp((vUv.y-uSource.y)/min(-.001,uTarget.y-uSource.y),0.,1.);float center=mix(uSource.x,uTarget.x,q*(2.-q));float dy=uTarget.y-uSource.y;
  vec2 tangent=vec2(2.*(uTarget.x-uSource.x)*(1.-q),dy);vec2 desired=tangent*uResolution*2.65;
  float near=exp(-pow((vUv.x-center)*uResolution.x/9.,2.));v=mix(v,desired,near*(1.-exp(-dt*35.)));v.x+=sin(q*16.+uTime*7.)*near*dt*6.;
 }else{v.y-=dt*18.;}
 gl_FragColor=vec4(clamp(v,vec2(-900.),vec2(900.)),0.,1.);}`;
const clear=`varying vec2 vUv;uniform sampler2D uTexture;uniform float value;void main(){gl_FragColor=texture2D(uTexture,vUv)*value;}`;
const geometry=new THREE.PlaneGeometry(2,2);

export class PavelFluid {
 constructor(renderer,{width=80,height=112,dyeWidth=192,dyeHeight=256,mask=null,guided=false}={}){
  if(!renderer.extensions.has('EXT_color_buffer_float'))throw Error('Floating-point fluid buffers unavailable');
  this.renderer=renderer;this.width=width;this.height=height;this.mask=mask;this.guided=guided;this.steps=0;this.disposed=false;
  this.scene=new THREE.Scene();this.camera=new THREE.Camera();this.mesh=new THREE.Mesh(geometry);this.mesh.frustumCulled=false;this.mesh.material.dispose();this.scene.add(this.mesh);this.materials={};this.targets=[];
  this.velocity=this.double(width,height);this.dye=this.double(dyeWidth,dyeHeight);this.pressure=this.double(width,height);this.divergence=this.target(width,height);this.curl=this.target(width,height);
  for(const [name,source] of Object.entries(upstream))this.materials[name]=this.material(masked(name,source),name==='advection');
  this.materials.force=this.material(boundary+force);this.materials.clear=this.material(clear);this.clear();
 }
 target(width,height){const target=new THREE.WebGLRenderTarget(width,height,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false,stencilBuffer:false});target.texture.generateMipmaps=false;this.targets.push(target);return target;}
 double(w,h){const a=this.target(w,h),b=this.target(w,h);return{read:a,write:b,swap(){[this.read,this.write]=[this.write,this.read];}};}
 material(fragment,manual=false){return new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,defines:manual?{MANUAL_FILTERING:''}:{},depthTest:false,depthWrite:false,blending:THREE.NoBlending,uniforms:{texelSize:{value:new THREE.Vector2(1/this.width,1/this.height)},uUseMask:{value:this.mask?1:0},uMask:{value:this.mask},uLevel:{value:1}}});}
 run(name,target,values={}){const material=this.materials[name];for(const [key,value] of Object.entries(values)){if(!material.uniforms[key])material.uniforms[key]={value};else material.uniforms[key].value=value;}this.mesh.material=material;this.renderer.setRenderTarget(target);this.renderer.render(this.scene,this.camera);}
 clear(){const previous=this.renderer.getRenderTarget(),color=this.renderer.getClearColor(new THREE.Color()),alpha=this.renderer.getClearAlpha();this.renderer.setClearColor(0,0);for(const target of this.targets){this.renderer.setRenderTarget(target);this.renderer.clear();}this.renderer.setClearColor(color,alpha);this.renderer.setRenderTarget(previous);}
 setLevel(level){for(const material of Object.values(this.materials))if(material.uniforms.uLevel)material.uniforms.uLevel.value=level;}
 inject({x,y,vx=0,vy=0,color,radius=.0008,amount=.2,aspectRatio=this.width/this.height}){
  const common={point:new THREE.Vector2(x,y),aspectRatio,radius};
  if(vx||vy){this.run('splat',this.velocity.write,{...common,uTarget:this.velocity.read.texture,color:new THREE.Vector3(vx,vy,0)});this.velocity.swap();}
  this.run('splat',this.dye.write,{...common,uTarget:this.dye.read.texture,color:new THREE.Vector3(color.r*amount,color.g*amount,color.b*amount)});this.dye.swap();
 }
 step(dt,{source={x:.5,y:.9},target={x:.5,y:.1},time=0}={}){
  dt=Math.min(1/30,Math.max(1/240,dt));const texel=new THREE.Vector2(1/this.width,1/this.height);
  this.run('force',this.velocity.write,{uVelocity:this.velocity.read.texture,dt,uTime:time,uGuided:this.guided?1:0,uSource:new THREE.Vector2(source.x,source.y),uTarget:new THREE.Vector2(target.x,target.y),uResolution:new THREE.Vector2(this.width,this.height)});this.velocity.swap();
  this.run('curl',this.curl,{uVelocity:this.velocity.read.texture});
  this.run('vorticity',this.velocity.write,{uVelocity:this.velocity.read.texture,uCurl:this.curl.texture,curl:this.guided?10:22,dt});this.velocity.swap();
  this.run('divergence',this.divergence,{uVelocity:this.velocity.read.texture});
  this.run('clear',this.pressure.write,{uTexture:this.pressure.read.texture,value:.8});this.pressure.swap();
  for(let i=0;i<14;i++){this.run('pressure',this.pressure.write,{uPressure:this.pressure.read.texture,uDivergence:this.divergence.texture});this.pressure.swap();}
  this.run('gradientSubtract',this.velocity.write,{uPressure:this.pressure.read.texture,uVelocity:this.velocity.read.texture});this.velocity.swap();
  this.run('advection',this.velocity.write,{uVelocity:this.velocity.read.texture,uSource:this.velocity.read.texture,texelSize:texel,dyeTexelSize:texel,dt,dissipation:1.2});this.velocity.swap();
  this.run('advection',this.dye.write,{uVelocity:this.velocity.read.texture,uSource:this.dye.read.texture,texelSize:texel,dyeTexelSize:new THREE.Vector2(1/this.dye.read.width,1/this.dye.read.height),dt,dissipation:this.guided?1.5:.35});this.dye.swap();this.steps++;
 }
 get texture(){return this.dye.read.texture;}
 dispose(){if(this.disposed)return;this.disposed=true;for(const target of this.targets)target.dispose();for(const material of Object.values(this.materials))material.dispose();this.mask?.dispose();}
}
