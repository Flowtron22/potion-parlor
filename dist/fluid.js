import * as THREE from './vendor/three.module.min.js';

// A bounded surface effect, not a full fluid solver: merged liquid particles,
// moving highlights, ballistic splashes, and softly deforming reservoir drops.
const vertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`
 precision highp float;
 varying vec2 vUv;
 uniform vec2 uSize;
 uniform vec2 uOffset;
 uniform vec3 uColor;
 uniform vec4 uDrops[48];
 uniform float uTime;
 void main(){
   vec2 p=vec2(vUv.x,1.-vUv.y)*uSize+uOffset;
   float field=0.;vec2 grad=vec2(0.);
   for(int i=0;i<48;i++){
     vec2 d=p-uDrops[i].xy;float r=uDrops[i].z;
     float d2=max(dot(d,d),.5);float rr=r*r;
     field+=rr/d2;grad+=-2.*rr*d/(d2*d2);
   }
   float edge=max(.002,fwidth(field)*1.2);
   float alpha=smoothstep(1.-edge,1.+edge,field);
   if(alpha<.01)discard;
   vec2 g=normalize(-grad+vec2(.00001));
   float rim=1./max(field,1.);
   vec3 n=normalize(vec3(g*rim,sqrt(max(.02,1.-rim*rim))));
   vec3 light=normalize(vec3(-.45,-.7,1.2));
   float diffuse=max(dot(n,light),0.);
   float spec=pow(max(dot(n,normalize(light+vec3(0.,0.,1.))),0.),48.);
   float stripe=pow(max(0.,1.-abs(n.x+.45)*2.4),12.)*.33;
   float fresnel=pow(1.-n.z,3.);
   vec3 col=uColor*(.43+.68*diffuse)+vec3(spec*.9+stripe)+uColor*fresnel*.4;
   col=mix(col,vec3(.85,1.,.96),fresnel*.24);
   gl_FragColor=vec4(col,alpha*.96);
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
   this.uniforms={uSize:{value:new THREE.Vector2()},uOffset:{value:new THREE.Vector2()},uTime:{value:0},uColor:{value:new THREE.Color()},uDrops:{value:Array.from({length:48},()=>new THREE.Vector4(-9999,-9999,0,0))}};
   this.streamGeometry=new THREE.PlaneGeometry(1,1);this.streamMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,extensions:{derivatives:true}});
   this.stream=new THREE.Mesh(this.streamGeometry,this.streamMaterial);this.stream.position.z=80;this.stream.frustumCulled=false;this.scene.add(this.stream);
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
   const drops=this.uniforms.uDrops.value;drops.forEach(d=>d.set(-9999,-9999,0,0));let k=0;
   for(const e of effects){
     const p=Math.min(1,(now-e.start)/e.duration);let target=this.targets[e.slot]||{x:e.to.x*this.scaleX,y:this.height-30};
     const m=motions[e.slot];if(m)target={x:target.x+(target.neck||0)*Math.sin(m.angle),y:target.y+(target.neck||0)*(1-Math.cos(m.angle))+m.lift};
     const source={x:e.from.x*this.scaleX,y:e.from.y*this.scaleY},color=colors[e.color].hex;
     const left=Math.min(source.x,target.x)-42,top=Math.min(source.y,target.y)-42,w=Math.abs(source.x-target.x)+84,h=Math.abs(source.y-target.y)+84;this.uniforms.uSize.value.set(w,h);this.uniforms.uOffset.value.set(left,top);this.stream.scale.set(w,h,1);this.stream.position.set(left+w/2,this.height-top-h/2,80);
     this.uniforms.uColor.value.set(color);
     // The source stretches into a neck, then becomes a continuous wavy jet.
     if(p<.3)drops[k++].set(source.x,source.y,Math.min(6,e.radius*.35)*this.scaleX*(1-p/.3),0);
     const end=Math.min(1,p/.32),start=Math.max(0,(p-.68)/.32);
     for(let j=0;j<32;j++){
       const q=start+(end-start)*j/31,inv=1-q;
       const x=inv*inv*source.x+2*inv*q*target.x+q*q*target.x+Math.sin(q*21-t*13)*.65*Math.sin(q*Math.PI);
       const y=source.y+(target.y-source.y)*q;
       const radius=(1.8+Math.sin(q*15-t*12)*.08)*(1-q*.18)*Math.sqrt(Math.max(.04,end-start))*this.scaleX;
       drops[k++].set(x,y,radius,0);
     }
     if(p>.32){
       const splash=(p-.32)/.68;
       for(let j=0;j<9;j++){const age=(splash+j/9)%1,v=(j-4)*9;drops[k++].set(target.x+v*age,target.y-18*age+22*age*age,(1-age)*1.2*this.scaleX,0);}
       drops[k++].set(target.x,target.y,1.8*this.scaleX,0);
       const slot=this.slots[e.slot];if(slot&&!slot.classList.contains('pouring'))slot.classList.add('pouring');
     }
     if(!this.seen.has(e)){this.seen.add(e);this.splashes.push({target,start:e.start+e.duration*.85,color,slot:e.slot});}
   }
   this.splashes=this.splashes.filter(s=>now-s.start<500);
   if(!effects.length)for(const s of this.slots)if(s.classList.contains('pouring'))s.classList.remove('pouring');
   if(!effects.length&&this.splashes.length){const s=this.splashes[this.splashes.length-1],age=Math.max(0,(now-s.start)/500);this.uniforms.uColor.value.set(s.color);for(let j=0;j<9;j++){drops[k++].set(s.target.x+(j-4)*7*age,s.target.y-16*age+20*age*age,Math.max(0,(1-age)*1.1),0);}}
   this.stream.visible=!!(effects.length||this.splashes.length);this.uniforms.uTime.value=t;this.renderer.render(this.scene,this.camera);this.renderCount++;this.dirty=false;
 }
 reset(){this.dirty=true;this.splashes=[];this.seen=new WeakSet();for(const group of this.meshes.values()){this.scene.remove(group);group.children[1].material.dispose();}this.meshes.clear();}
}
try{window.potionFluid=new LiquidScene();document.documentElement.dataset.liquid='three';}catch(error){document.querySelector('.fluid-layer')?.remove();document.documentElement.dataset.liquid='canvas';console.warn('Liquid rendering uses the Canvas fallback.',error.message);}
