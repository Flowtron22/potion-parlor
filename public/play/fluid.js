import * as THREE from './vendor/three.module.min.js';
import {LiquidJet,LiquidSurface} from './liquid-physics.mjs';

// Screen-space density reconstruction of a position-based liquid simulation.
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`precision highp float;varying vec2 vUv;uniform sampler2D uField;uniform vec2 uTexel;
void main(){vec4 f=texture2D(uField,vUv);float density=f.a;if(density<.16)discard;
 vec2 grad=vec2(texture2D(uField,vUv+vec2(uTexel.x,0.)).a-texture2D(uField,vUv-vec2(uTexel.x,0.)).a,texture2D(uField,vUv+vec2(0.,uTexel.y)).a-texture2D(uField,vUv-vec2(0.,uTexel.y)).a);
 vec3 n=normalize(vec3(-grad*2.,.7));float light=max(0.,dot(n,normalize(vec3(-.5,.6,1.))));float shine=pow(max(0.,dot(n,normalize(vec3(-.25,.3,1.)))),28.);
 vec3 color=f.rgb/max(.001,density);color=color*(.58+light*.48)+vec3(.8,.95,1.)*shine*.62;
 float aa=max(.035,fwidth(density));gl_FragColor=vec4(color,smoothstep(.16-aa,.16+aa,density)*.96);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

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
   this.jets=new Map();this.surfaces=[];this.surfaceActive=false;this.previousTime=0;
   this.field=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});this.fieldScene=new THREE.Scene();this.compositeScene=new THREE.Scene();this.blurScene=new THREE.Scene();this.blurTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
   this.blurMaterial=new THREE.ShaderMaterial({uniforms:{uField:{value:this.field.texture},uDirection:{value:new THREE.Vector2()}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform sampler2D uField;uniform vec2 uDirection;void main(){vec4 sum=texture2D(uField,vUv)*.227027;sum+=(texture2D(uField,vUv+uDirection*1.384615)+texture2D(uField,vUv-uDirection*1.384615))*.316216;sum+=(texture2D(uField,vUv+uDirection*3.230769)+texture2D(uField,vUv-uDirection*3.230769))*.070270;gl_FragColor=sum;}`,depthTest:false,depthWrite:false});this.blurMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),this.blurMaterial);this.blurMesh.frustumCulled=false;this.blurScene.add(this.blurMesh);
   const max=2400;this.positions=new Float32Array(max*3);this.tints=new Float32Array(max*3);this.radii=new Float32Array(max);
   this.particleGeometry=new THREE.BufferGeometry();this.particleGeometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));this.particleGeometry.setAttribute('tint',new THREE.BufferAttribute(this.tints,3).setUsage(THREE.DynamicDrawUsage));this.particleGeometry.setAttribute('radius',new THREE.BufferAttribute(this.radii,1).setUsage(THREE.DynamicDrawUsage));this.particleGeometry.setDrawRange(0,0);
   this.particleMaterial=new THREE.ShaderMaterial({uniforms:{uPixelRatio:{value:this.renderer.getPixelRatio()}},vertexShader:`attribute vec3 tint;attribute float radius;varying vec3 vTint;uniform float uPixelRatio;void main(){vTint=tint;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=radius*2.*uPixelRatio;}`,fragmentShader:`varying vec3 vTint;void main(){float r=length(gl_PointCoord*2.-1.);if(r>1.)discard;float kernel=pow(1.-r*r,3.);gl_FragColor=vec4(vTint*kernel,kernel);}`,transparent:true,depthTest:false,depthWrite:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation});
   this.points=new THREE.Points(this.particleGeometry,this.particleMaterial);this.points.frustumCulled=false;this.fieldScene.add(this.points);
   this.compositeMaterial=new THREE.ShaderMaterial({uniforms:{uField:{value:this.field.texture},uTexel:{value:new THREE.Vector2(1,1)}},vertexShader:vertex,fragmentShader:fragment,transparent:true,depthTest:false,depthWrite:false});this.surfaceMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),this.compositeMaterial);this.surfaceMesh.frustumCulled=false;this.compositeScene.add(this.surfaceMesh);
   this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;this.root.style.display='none';});
   this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.available=true;this.root.style.display='';});
   this.observer=new ResizeObserver(()=>this.measure());this.observer.observe(document.querySelector('.game'));this.measure();
 }
 measure(){
   const parent=document.querySelector('.game').getBoundingClientRect(),board=document.getElementById('game').getBoundingClientRect(),rack=document.getElementById('rack').getBoundingClientRect();
   const width=board.width,height=rack.bottom-board.top,changed=width!==this.width||height!==this.height;this.width=width;this.height=height;this.scaleX=board.width/360;this.scaleY=board.height/290;
   if(changed){this.root.style.left=(board.left-parent.left-1)+'px';this.root.style.top=(board.top-parent.top-1)+'px';this.root.style.width=width+'px';this.root.style.height=height+'px';this.renderer.setSize(width,height);this.field.setSize(Math.ceil(width*this.renderer.getPixelRatio()),Math.ceil(height*this.renderer.getPixelRatio()));this.blurTarget.setSize(this.field.width,this.field.height);this.blurMesh.scale.set(width,height,1);this.blurMesh.position.set(width/2,height/2,90);this.compositeMaterial.uniforms.uTexel.value.set(1/this.field.width,1/this.field.height);this.surfaceMesh.scale.set(width,height,1);this.surfaceMesh.position.set(width/2,height/2,90);this.camera.right=width;this.camera.top=height;this.camera.bottom=0;this.camera.updateProjectionMatrix();}
   if(!this.slots.length)this.slots=Array.from(document.querySelectorAll('.slot'));
   this.targets=this.slots.map(slot=>{const svg=slot.querySelector('.bottle'),r=(svg||slot).getBoundingClientRect();return{x:r.left+r.width/2-board.left,y:svg?r.top+10*r.height/82-board.top:r.top+9-board.top,neck:svg?r.height*.798:0};});this.needsMeasure=false;this.dirty=true;
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
   if(!this.available)return;
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
   const active=new Set();let particleCount=0;const arrivals=Array(5).fill(0);
   for(const e of effects){
     active.add(e);let jet=this.jets.get(e);if(!jet){jet=new LiquidJet(e.gemId+1);this.jets.set(e,jet);}
     const p=Math.min(1,(now-e.start)/e.duration);let target=this.targets[e.slot]||{x:e.to.x*this.scaleX,y:this.height-30};
     const m=motions[e.slot];if(m)target={x:target.x+(target.neck||0)*Math.sin(m.angle),y:target.y+(target.neck||0)*(1-Math.cos(m.angle))+m.lift};
     const source={x:e.from.x*this.scaleX,y:e.from.y*this.scaleY};arrivals[e.slot]+=jet.step(dt,source,target,p,this.scaleX);
     e.delivered=jet.emitted?Math.max(e.delivered||0,(jet.emitted-jet.particles.length)/105):0;
     const color=new THREE.Color(colors[e.color].hex);
     // Reconstruct between neighboring material samples. This fills sub-particle
     // gaps without increasing simulation cost or exposing the particle lattice.
     for(let j=0;j<jet.particles.length;j++){
       const particle=jet.particles[j],next=jet.particles[j+1],distance=next?Math.hypot(next.x-particle.x,next.y-particle.y):0;
       const samples=distance>0&&distance<28*this.scaleX?Math.max(1,Math.ceil(distance/(0.7*this.scaleX))):1;
       for(let sample=0;sample<samples&&particleCount<2400;sample++){
         const q=sample/samples,i=particleCount++;this.positions[i*3]=particle.x+(next?next.x-particle.x:0)*q;this.positions[i*3+1]=this.height-particle.y-(next?next.y-particle.y:0)*q;this.positions[i*3+2]=80;this.tints.set([color.r,color.g,color.b],i*3);this.radii[i]=2.8*this.scaleX;
       }
     }

   }
   for(const e of this.jets.keys())if(!active.has(e))this.jets.delete(e);
   this.particleGeometry.setDrawRange(0,particleCount);for(const attr of Object.values(this.particleGeometry.attributes))attr.needsUpdate=true;
   this.surfaceActive=false;
   for(let i=0;i<this.slots.length;i++){
     const svg=this.slots[i].querySelector('.bottle'),path=svg?.querySelector('.liquid-body');if(!path){this.surfaces[i]=null;continue;}
     let surface=this.surfaces[i];if(!surface||surface.svg!==svg){surface=new LiquidSurface();surface.svg=svg;surface.fill=Number(svg.dataset.fill)||8;this.surfaces[i]=surface;}
     const pouring=effects.find(e=>e.slot===i),base=Number(svg.dataset.fill)||8,capacity=Number(svg.dataset.capacity)||1;
     this.slots[i].dataset.flow=String(Math.floor((pouring?.delivered||0)*10));
     const fill=base+(pouring?(pouring.delivered||0)*86/capacity:0);
     if(arrivals[i])surface.impact(Math.min(.7,arrivals[i]*.08));
     const angle=motions[i]?.angle||0;surface.impact(Math.min(.2,Math.abs(angle-(surface.angle||0))*5),angle>0?.8:.2);surface.angle=angle;
     const samples=surface.step(dt,fill,-angle*.6),curve=samples.map(([x,y],j)=>(j?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' ');
     path.setAttribute('d',curve+' L56 82H4Z');svg.querySelector('.meniscus')?.setAttribute('d',curve);
     this.surfaceActive||=surface.energy>.025;
   }
   this.splashes=[];const pouring=new Set(effects.map(e=>e.slot));for(let i=0;i<this.slots.length;i++)this.slots[i].classList.toggle('pouring',pouring.has(i));
   this.renderer.setRenderTarget(this.field);this.renderer.clear();if(particleCount){this.renderer.render(this.fieldScene,this.camera);this.blurMaterial.uniforms.uField.value=this.field.texture;this.blurMaterial.uniforms.uDirection.value.set(.8/this.field.width,0);this.renderer.setRenderTarget(this.blurTarget);this.renderer.render(this.blurScene,this.camera);this.blurMaterial.uniforms.uField.value=this.blurTarget.texture;this.blurMaterial.uniforms.uDirection.value.set(0,.8/this.field.height);this.renderer.setRenderTarget(this.field);this.renderer.render(this.blurScene,this.camera);}this.renderer.setRenderTarget(null);this.renderer.autoClear=true;this.renderer.render(this.scene,this.camera);this.renderer.autoClear=false;if(particleCount)this.renderer.render(this.compositeScene,this.camera);this.renderer.autoClear=true;this.renderCount++;this.dirty=false;
 }
 reset(){this.jets.clear();this.surfaces=[];this.surfaceActive=false;this.previousTime=0;this.dirty=true;this.splashes=[];this.seen=new WeakSet();for(const group of this.meshes.values()){this.scene.remove(group);group.children[1].material.dispose();}this.meshes.clear();}
}
try{window.potionFluid=new LiquidScene();document.documentElement.dataset.liquid='three';}catch(error){document.querySelector('.fluid-layer')?.remove();document.documentElement.dataset.liquid='canvas';console.warn('Liquid rendering uses the Canvas fallback.',error.message);}
