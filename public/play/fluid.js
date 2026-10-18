import * as THREE from './vendor/three.module.min.js';
import {LiquidSurface} from './liquid-physics.mjs';
import {PavelFluid} from './pavel-fluid.mjs?v=soul5';
import {SoulField} from './soul-field.mjs?v=swirl7';
import {soulPose,POP_END} from './soul-motion.mjs?v=swirl7';
window.potionSoulPose=soulPose;

// Pavel Dobryakov's velocity/dye fluid solver drives both pours and bottle mixing.
const fluidVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fluidFragment=`varying vec2 vUv;uniform sampler2D uDye,uMask;uniform vec2 uTexel,uSource,uTarget,uSize;uniform float uVessel,uLevel,uFade,uTilt;
float density(vec2 uv){vec3 c=texture2D(uDye,uv).rgb;return max(c.r,max(c.g,c.b));}
void main(){vec3 dye=texture2D(uDye,vUv).rgb;float d=max(dye.r,max(dye.g,dye.b));if(d<.012)discard;
 float mask=1.;if(uVessel>.5){mask=texture2D(uMask,vUv).a;float level=uLevel+uTilt*(vUv.x-.5);mask*=1.-smoothstep(level-.008,level+.008,vUv.y);}else{float q=(vUv.y-uSource.y)/min(-.001,uTarget.y-uSource.y);float center=mix(uSource.x,uTarget.x,clamp(q,0.,1.)*(2.-clamp(q,0.,1.)));float side=(vUv.x-center)*uSize.x;mask*=exp(-pow(abs(side)/8.,4.));mask*=smoothstep(-.02,.01,q)*(1.-smoothstep(.98,1.02,q));}
 vec2 gradient=vec2(density(vUv+vec2(uTexel.x,0.))-density(vUv-vec2(uTexel.x,0.)),density(vUv+vec2(0.,uTexel.y))-density(vUv-vec2(0.,uTexel.y)));
 vec3 n=normalize(vec3(-gradient*1.8,.25));float diffuse=clamp(dot(n,normalize(vec3(-.4,.6,1.)))+.35,.45,1.2);float shine=pow(max(0.,dot(n,normalize(vec3(-.3,.4,1.)))),22.);
 vec3 hue=dye/max(d,.01);vec3 color=hue*(.48+.28*min(d,2.))*diffuse+vec3(.65,.88,.95)*shine*.26;
 float alpha=smoothstep(.012,.20,d)*mask*uFade*(uVessel>.5?.78:.96);if(alpha<.005)discard;gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
function fluidMaterial(solver,vessel=false,mask=null){return new THREE.ShaderMaterial({uniforms:{uDye:{value:solver.texture},uMask:{value:mask},uTexel:{value:new THREE.Vector2(1/solver.dye.read.width,1/solver.dye.read.height)},uSource:{value:new THREE.Vector2()},uTarget:{value:new THREE.Vector2()},uSize:{value:new THREE.Vector2(1,1)},uVessel:{value:vessel?1:0},uLevel:{value:1},uFade:{value:1},uTilt:{value:0}},vertexShader:fluidVertex,fragmentShader:fluidFragment,transparent:true,depthTest:false,depthWrite:false});}
function bottleMask(svg){const canvas=document.createElement('canvas');canvas.width=120;canvas.height=164;const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.fillStyle='white';ctx.fill(new Path2D(svg.querySelector('defs clipPath path').getAttribute('d')));const texture=new THREE.CanvasTexture(canvas);texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;return texture;}

class LiquidScene {
 constructor(){
   this.root=document.createElement('div');this.root.className='fluid-layer';this.root.setAttribute('aria-hidden','true');document.querySelector('.game').append(this.root);
   this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
   this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.dirty=true;this.needsMeasure=true;this.slots=[];this.renderCount=0;
   this.root.append(this.renderer.domElement);this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(0,360,400,0,.1,2000);this.camera.position.z=1000;
   this.scene.add(new THREE.AmbientLight(0xd7f7e9,2));
   const key=new THREE.DirectionalLight(0xffffff,3.5);key.position.set(-100,-150,500);this.scene.add(key);
   const rim=new THREE.DirectionalLight(0xa9e6dd,2);rim.position.set(300,80,200);this.scene.add(rim);
   const tear=new THREE.SphereGeometry(1,20,16),vertices=tear.attributes.position;for(let i=0;i<vertices.count;i++){const y=vertices.getY(i),t=.76-.24*y;vertices.setX(i,vertices.getX(i)*t);vertices.setZ(i,vertices.getZ(i)*t);}tear.computeVertexNormals();
   const hex=new THREE.CylinderGeometry(1,1,1.05,6,1);hex.rotateX(Math.PI/2);
   this.geometries=[new THREE.SphereGeometry(1,20,16),new THREE.OctahedronGeometry(1),hex,new THREE.DodecahedronGeometry(1),tear,new THREE.TetrahedronGeometry(1)];this.meshes=new Map();this.materials=new Map();this.textures=new Map();this.splashes=[];this.seen=new WeakSet();this.available=true;
   this.departures=new Map();this.soul=new SoulField(this.renderer);this.scene.add(this.soul.mesh);this.vessels=[];this.surfaces=[];this.surfaceActive=false;this.previousTime=0;this.liquidGeometry=new THREE.PlaneGeometry(1,1);
   this.soul.solver.step(1/120);this.soul.clear();this.renderer.setRenderTarget(null);this.renderer.compile(this.scene,this.camera);
   this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;this.dirty=true;this.root.style.display='none';});
   this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.available=true;this.dirty=true;this.root.style.display='';});
   this.observer=new ResizeObserver(()=>this.measure());this.observer.observe(document.querySelector('.game'));this.measure();
 }
 measure(){
   const parent=document.querySelector('.game').getBoundingClientRect(),board=document.getElementById('game').getBoundingClientRect(),rack=document.getElementById('rack').getBoundingClientRect();
   const width=board.width,height=rack.bottom-board.top,changed=width!==this.width||height!==this.height;this.width=width;this.height=height;this.scaleX=board.width/360;this.scaleY=board.height/290;
   this.root.style.left=(board.left-parent.left-1)+'px';this.root.style.top=(board.top-parent.top-1)+'px';if(changed){this.root.style.width=width+'px';this.root.style.height=height+'px';this.renderer.setSize(width,height);this.camera.right=width;this.camera.top=height;this.camera.bottom=0;this.camera.updateProjectionMatrix();}
   if(!this.slots.length)this.slots=Array.from(document.querySelectorAll('.slot'));
   this.targets=this.slots.map(slot=>{const svg=slot.querySelector('.bottle'),r=slot.getBoundingClientRect();if(!svg)return{x:r.left+r.width/2-board.left,y:r.top+9-board.top};const css=getComputedStyle(svg),w=parseFloat(css.width),h=parseFloat(css.height),padding=parseFloat(getComputedStyle(slot).paddingBottom)||13;const left=r.left+r.width/2-w/2-board.left,top=r.bottom-padding-h-board.top;const mouthY=Number(svg.dataset.mouthY)||17;return{x:left+w/2,y:top+mouthY*h/82,neck:h*(.92-mouthY/82),left,top,width:w,height:h};});this.needsMeasure=false;this.dirty=true;
 }
 invalidate(slots,measure=true){if(slots)this.slots=slots;this.dirty=true;this.needsMeasure||=measure;}
 prepare(){if(this.needsMeasure)this.measure();}
 material(color,available=false){
   const key=color+':'+available;if(!this.materials.has(key)){
     const material=new THREE.ShaderMaterial({uniforms:{uTint:{value:new THREE.Color(color)}},vertexShader:`varying vec3 vN; void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vN;uniform vec3 uTint;void main(){vec3 n=normalize(vN);vec3 l=normalize(vec3(-.5,.7,1.));float diffuse=max(dot(n,l),0.);float spec=pow(max(dot(n,normalize(l+vec3(0.,0.,1.))),0.),55.);float fresnel=pow(1.-abs(n.z),3.);vec3 col=uTint*(.45+.65*diffuse)+vec3(spec*.85)+vec3(.5,.85,.75)*fresnel*.25;gl_FragColor=vec4(col,.96);#include <colorspace_fragment>}`.replace(';#include',';\n#include'),transparent:true});
     if(!available)material.uniforms.uTint.value.multiplyScalar(.72);this.materials.set(key,material);
   }return this.materials.get(key);
 }
 symbolTexture(color,symbol){
   if(!this.textures.has(color)){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.font='32px Georgia';g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgba(255,255,255,.8)';g.fillText(symbol,32,34);const texture=new THREE.CanvasTexture(c);this.textures.set(color,texture);}return this.textures.get(color);
 }
 update(now,columns,effects,colors,animating=true,motions=[]){
   if(!this.available){this.dirty=false;return;}
   if(!animating&&!effects.length&&!this.splashes.length&&!this.surfaceActive&&!this.dirty)return;
   const t=now/1000,dt=this.previousTime?Math.min(.04,(now-this.previousTime)/1000):1/60,live=new Set();this.previousTime=now;
   columns.forEach((column,i)=>column.forEach(d=>{
     live.add(d.id);let group=this.meshes.get(d.id);
     if(!group){group=new THREE.Group();const sphere=new THREE.Mesh(this.geometries[d.shape],this.material(colors[d.color].hex));group.add(sphere);const label=new THREE.Sprite(new THREE.SpriteMaterial({map:this.symbolTexture(colors[d.color].hex+(d.material||''),d.material==='heavy'?'◆':colors[d.color].symbol),transparent:true,depthTest:false}));group.add(label);group.userData.sphere=sphere;this.meshes.set(d.id,group);this.scene.add(group);}
     group.userData.sphere.material=this.material(colors[d.color].hex,!!d.available);group.position.set((d.renderX??d.x??55+i*50)*this.scaleX,this.height-(d.renderY??d.y)*this.scaleY,15);
     const r=d.drawRadius*this.scaleX,squash=d.impact||0;
     group.userData.sphere.scale.set(r*(1+squash),r*d.aspect*(1-squash)*this.scaleY/this.scaleX,r*.72);
     group.userData.sphere.rotation.z=-(d.renderAngle??d.angle??0);group.rotation.z=0;group.children[1].scale.set(r*1.25,r*1.25,1);group.children[1].position.z=r*.8+2;
   }));
   for(const [id,group] of this.meshes){if(!live.has(id)){this.scene.remove(group);group.children[1].material.dispose();this.meshes.delete(id);}}
   this.updateDepartures(now,effects,colors);
   this.soul.update(now,effects,colors,this.width,this.height,this.targets,motions,this.scaleX,this.scaleY);
   this.surfaceActive=this.soul.active;
   for(let i=0;i<this.slots.length;i++){
     const svg=this.slots[i].querySelector('.bottle'),path=svg?.querySelector('.liquid-body');
     if(!path){this.surfaces[i]=null;this.releaseVessel(i);continue;}
     let surface=this.surfaces[i];if(!surface||surface.svg!==svg){surface=new LiquidSurface();surface.svg=svg;surface.fill=Number(svg.dataset.fill)||8;this.surfaces[i]=surface;this.releaseVessel(i);}
     let vessel=this.vessels[i];if(!vessel){const mask=bottleMask(svg),solver=new PavelFluid(this.renderer,{width:48,height:64,dyeWidth:96,dyeHeight:128,mask});const mesh=new THREE.Mesh(this.liquidGeometry,fluidMaterial(solver,true,mask));mesh.frustumCulled=false;this.scene.add(mesh);vessel={solver,mesh,until:now};this.vessels[i]=vessel;}
     const pouring=effects.find(e=>e.slot===i),base=Number(svg.dataset.fill)||8,capacity=Number(svg.dataset.capacity)||1,delivered=pouring?.delivered||0;
     this.slots[i].dataset.flow=String(Math.floor(delivered*10));
     const fill=base+delivered*86/capacity,angle=motions[i]?.angle||0;
     if(pouring){const increment=Math.max(0,delivered-(pouring.lastDelivery||0));pouring.lastDelivery=delivered;if(increment){surface.impact(Math.min(.7,increment*5));const level=1-(75-fill*.54)/82,color=new THREE.Color(colors[pouring.color].hex);vessel.solver.setLevel(level);vessel.solver.inject({x:.5+Math.sin(t*7.)*.045,y:Math.max(.05,level-.035),vx:Math.sin(t*6.)*8,vy:-24,color,radius:.0014,amount:increment*18});}vessel.until=now+1400;}
     surface.impact(Math.min(.2,Math.abs(angle-(surface.angle||0))*5),angle>0?.8:.2);surface.angle=angle;
     const samples=surface.step(dt,fill,-angle*.6),curve=samples.map(([x,y],j)=>(j?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' ');
     path.setAttribute('d',curve+' L56 82H4Z');svg.querySelector('.meniscus')?.setAttribute('d',curve);
     const level=1-(75-surface.fill*.54)/82;vessel.solver.setLevel(level);
     if(now<vessel.until||surface.energy>.025){vessel.solver.step(dt,{time:t});this.surfaceActive=true;}
     const r=this.targets[i],motion=motions[i];if(r?.width){const offset=r.height*.42;vessel.mesh.scale.set(r.width,r.height,1);vessel.mesh.position.set(r.left+r.width/2+offset*Math.sin(angle),this.height-r.top-r.height/2-offset*(1-Math.cos(angle))-(motion?.lift||0),90);vessel.mesh.rotation.z=-angle;}
     const uniforms=vessel.mesh.material.uniforms;uniforms.uDye.value=vessel.solver.texture;uniforms.uLevel.value=level;uniforms.uTilt.value=angle*.44;
     this.surfaceActive||=surface.energy>.025;
   }
   this.splashes=[];const pouring=new Set(effects.map(e=>e.slot));for(let i=0;i<this.slots.length;i++)this.slots[i].classList.toggle('pouring',pouring.has(i));
   this.renderer.setRenderTarget(null);this.renderer.autoClear=true;this.renderer.render(this.scene,this.camera);this.renderCount++;this.dirty=false;
 }
 updateDepartures(now,effects,colors){
  const active=new Set();for(const e of effects){const p=Math.max(0,(now-e.start)/e.duration);if(p>=POP_END||e.stored)continue;active.add(e);
   let pop=this.departures.get(e);if(!pop){
    const material=this.material(colors[e.color].hex,true).clone();material.uniforms.uPopFade={value:1};material.fragmentShader=material.fragmentShader.replace('uniform vec3 uTint;','uniform vec3 uTint;uniform float uPopFade;').replace('vec4(col,.96)','vec4(col,uPopFade)');
    const gem=new THREE.Mesh(this.geometries[e.shape??0],material);gem.frustumCulled=false;this.scene.add(gem);
    const ringMat=new THREE.ShaderMaterial({vertexShader:fluidVertex,fragmentShader:`varying vec2 vUv;uniform vec3 tint;uniform float phase;void main(){float r=length((vUv-.5)*2.);float ring=exp(-pow((r-(.14+phase*.75))/.045,2.))*(1.-phase);gl_FragColor=vec4(tint*1.6,ring*.8);}`,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,uniforms:{tint:{value:new THREE.Color(colors[e.color].hex)},phase:{value:0}}});
    const ring=new THREE.Mesh(this.liquidGeometry,ringMat);ring.frustumCulled=false;this.scene.add(ring);pop={gem,ring};this.departures.set(e,pop);
   }
   const pose=soulPose(p,e.from,e.to,e.gemId),r=e.radius*this.scaleX,scale=Math.max(.001,pose.popScale);
   pop.gem.scale.set(r*(1+pose.squash)*scale,r*(e.aspect||1)*(1-pose.squash)*this.scaleY/this.scaleX*scale,r*.72*scale);
   pop.gem.position.set(e.from.x*this.scaleX,this.height-e.from.y*this.scaleY-pose.squash*r*.45,30);pop.gem.rotation.z=-(e.angle||0);pop.gem.material.uniforms.uPopFade.value=Math.min(1,pose.popScale*2);
   pop.ring.scale.set(r*4,r*1.6,1);pop.ring.position.set(e.from.x*this.scaleX,this.height-244*this.scaleY,86);pop.ring.material.uniforms.phase.value=Math.min(1,p/POP_END);
  }
  for(const [e,pop]of this.departures)if(!active.has(e)){this.scene.remove(pop.gem,pop.ring);pop.gem.material.dispose();pop.ring.material.dispose();this.departures.delete(e);}
 }
 releaseVessel(i){const vessel=this.vessels[i];if(!vessel)return;this.scene.remove(vessel.mesh);vessel.mesh.material.dispose();vessel.solver.dispose();this.vessels[i]=null;}

 reset(){this.soul.clear();for(const pop of this.departures.values()){this.scene.remove(pop.gem,pop.ring);pop.gem.material.dispose();pop.ring.material.dispose();}this.departures.clear();for(let i=0;i<this.vessels.length;i++)this.releaseVessel(i);this.surfaces=[];this.surfaceActive=false;this.previousTime=0;this.dirty=true;this.splashes=[];this.seen=new WeakSet();for(const group of this.meshes.values()){this.scene.remove(group);group.children[1].material.dispose();}this.meshes.clear();}
}
try{window.potionFluid=new LiquidScene();document.documentElement.dataset.liquid='three';document.documentElement.dataset.fluidEngine='pavel-dobryakov';document.documentElement.dataset.fluidBuild='swirl7';}catch(error){document.querySelector('.fluid-layer')?.remove();document.documentElement.dataset.liquid='canvas';console.warn('Liquid rendering uses the Canvas fallback.',error.message);}
