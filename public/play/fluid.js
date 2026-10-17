import * as THREE from './vendor/three.module.min.js';

// Continuous glossy liquid jets and glossy gem rendering.
// This is an animated surface effect rather than a full volumetric fluid solver.
const vertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
// Analytic continuous jet: one smooth surface, with no sampled circles.
const fragment=`
 precision highp float;
 varying vec2 vUv;
 uniform vec2 uSize,uOffset,uSource,uTarget;
 uniform vec3 uColor;
 uniform float uTime,uProgress,uScale;
 const float PI=3.14159265;
 void main(){
  vec2 p=vec2(vUv.x,1.-vUv.y)*uSize+uOffset;
  float height=max(1.,uTarget.y-uSource.y);
  float head=smoothstep(0.,.29,uProgress);
  float tail=smoothstep(.72,1.,uProgress);
  float raw=(p.y-uSource.y)/height,q=clamp(raw,tail,head);
  float bend=q*(2.-q),phase=q*7.-uTime*6.;
  float wobble=sin(phase)*sin(q*PI)*.65*uScale;
  float x=mix(uSource.x,uTarget.x,bend)+wobble;
  float dx=(uTarget.x-uSource.x)*2.*(1.-q)+.65*uScale*(7.*cos(phase)*sin(q*PI)+PI*sin(phase)*cos(q*PI));
  float slope=dx/height;
  float side=(p.x-x)/sqrt(1.+slope*slope);
  float cap=(raw-q)*height;
  float width=mix(2.1,1.3,q)*uScale;
  width+=2.2*uScale*exp(-q*24.)*(1.-smoothstep(0.,.22,uProgress));
  float distanceToSurface=length(vec2(side,cap))-width;
  float aa=max(.35,fwidth(distanceToSurface));
  float alpha=1.-smoothstep(-aa,aa,distanceToSurface);
  if(alpha<.01||head-tail<.002)discard;
  float across=clamp(side/width,-1.,1.),z=sqrt(max(.001,1.-across*across));
  float highlight=exp(-pow((across+.38+sin(q*9.-uTime*8.)*.045)*7.,2.));
  float rim=pow(abs(across),3.);
  float reflection=.5+.5*sin(q*4.-uTime*4.);
  vec3 col=uColor*(.46+.53*z)+vec3(.8,.95,1.)*highlight*.62;
  col+=mix(uColor,vec3(.8,.94,1.),.45)*rim*(.2+reflection*.1);
  gl_FragColor=vec4(col,alpha*.94);
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
   this.streamGeometry=new THREE.PlaneGeometry(1,1);
   this.streams=Array.from({length:5},()=>{
     const uniforms={uSize:{value:new THREE.Vector2()},uOffset:{value:new THREE.Vector2()},uTime:{value:0},uColor:{value:new THREE.Color()},uSource:{value:new THREE.Vector2()},uTarget:{value:new THREE.Vector2()},uProgress:{value:0},uScale:{value:1}};
     const material=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,extensions:{derivatives:true}}),mesh=new THREE.Mesh(this.streamGeometry,material);
     mesh.position.z=80;mesh.frustumCulled=false;mesh.visible=false;this.scene.add(mesh);return{mesh,uniforms};
   });
   this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;this.root.style.display='none';});
   this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.available=true;this.root.style.display='';});
   this.observer=new ResizeObserver(()=>this.measure());this.observer.observe(document.querySelector('.game'));this.measure();
 }
 measure(){
   const parent=document.querySelector('.game').getBoundingClientRect(),board=document.getElementById('game').getBoundingClientRect(),rack=document.getElementById('rack').getBoundingClientRect();
   const width=board.width,height=rack.bottom-board.top,changed=width!==this.width||height!==this.height;this.width=width;this.height=height;this.scaleX=board.width/360;this.scaleY=board.height/290;
   if(changed){this.root.style.left=(board.left-parent.left-1)+'px';this.root.style.top=(board.top-parent.top-1)+'px';this.root.style.width=width+'px';this.root.style.height=height+'px';this.renderer.setSize(width,height);this.camera.right=width;this.camera.top=height;this.camera.bottom=0;this.camera.updateProjectionMatrix();}
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
   if(!animating&&!effects.length&&!this.splashes.length&&!this.dirty)return;
   const t=now/1000,live=new Set();
   columns.forEach((column,i)=>column.forEach(d=>{
     live.add(d.id);let group=this.meshes.get(d.id);
     if(!group){group=new THREE.Group();const sphere=new THREE.Mesh(this.geometries[d.shape],this.material(colors[d.color].hex));group.add(sphere);const label=new THREE.Sprite(new THREE.SpriteMaterial({map:this.symbolTexture(colors[d.color].hex,colors[d.color].symbol),transparent:true,depthTest:false}));group.add(label);group.userData.sphere=sphere;this.meshes.set(d.id,group);this.scene.add(group);}
     group.userData.sphere.material=this.material(colors[d.color].hex,!!d.available);group.position.set((d.renderX??d.x??55+i*50)*this.scaleX,this.height-(d.renderY??d.y)*this.scaleY,15);
     const r=d.drawRadius*this.scaleX,squash=d.impact||0;
     group.userData.sphere.scale.set(r*(1+squash),r*d.aspect*(1-squash)*this.scaleY/this.scaleX,r*.72);
     group.userData.sphere.rotation.z=-(d.renderAngle??d.angle??0);group.rotation.z=0;group.children[1].scale.set(r*1.25,r*1.25,1);group.children[1].position.z=r*.8+2;
   }));
   for(const [id,group] of this.meshes){if(!live.has(id)){this.scene.remove(group);group.children[1].material.dispose();this.meshes.delete(id);}}
   this.streams.forEach(s=>s.mesh.visible=false);
   for(const [index,e] of effects.entries()){
     const item=this.streams[index];if(!item)break;const {mesh:stream,uniforms}=item;stream.visible=true;
     uniforms.uTime.value=t;
     const p=Math.min(1,(now-e.start)/e.duration);let target=this.targets[e.slot]||{x:e.to.x*this.scaleX,y:this.height-30};
     const m=motions[e.slot];if(m)target={x:target.x+(target.neck||0)*Math.sin(m.angle),y:target.y+(target.neck||0)*(1-Math.cos(m.angle))+m.lift};
     const source={x:e.from.x*this.scaleX,y:e.from.y*this.scaleY},color=colors[e.color].hex;
     const left=Math.min(source.x,target.x)-42,top=Math.min(source.y,target.y)-42,w=Math.abs(source.x-target.x)+84,h=Math.abs(source.y-target.y)+84;uniforms.uSize.value.set(w,h);uniforms.uOffset.value.set(left,top);stream.scale.set(w,h,1);stream.position.set(left+w/2,this.height-top-h/2,80);
     uniforms.uColor.value.set(color);
     uniforms.uSource.value.set(source.x,source.y);uniforms.uTarget.value.set(target.x,target.y);
     uniforms.uProgress.value=p;uniforms.uScale.value=this.scaleX;

   }
   this.splashes=[];const pouring=new Set(effects.map(e=>e.slot));for(let i=0;i<this.slots.length;i++)this.slots[i].classList.toggle('pouring',pouring.has(i));
   this.renderer.render(this.scene,this.camera);this.renderCount++;this.dirty=false;
 }
 reset(){this.dirty=true;this.splashes=[];this.seen=new WeakSet();for(const group of this.meshes.values()){this.scene.remove(group);group.children[1].material.dispose();}this.meshes.clear();}
}
try{window.potionFluid=new LiquidScene();document.documentElement.dataset.liquid='three';}catch(error){document.querySelector('.fluid-layer')?.remove();document.documentElement.dataset.liquid='canvas';console.warn('Liquid rendering uses the Canvas fallback.',error.message);}
