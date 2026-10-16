import * as THREE from './vendor/three.module.min.js';

// A bounded surface effect, not a full fluid solver: merged liquid particles,
// moving highlights, ballistic splashes, and softly deforming reservoir drops.
const vertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`
 precision highp float;
 varying vec2 vUv;
 uniform vec2 uSize;
 uniform vec3 uColor;
 uniform vec4 uDrops[48];
 uniform float uTime;
 void main(){
   vec2 p=vec2(vUv.x,1.-vUv.y)*uSize;
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
   this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
   this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
   this.root.append(this.renderer.domElement);this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(0,360,400,0,.1,2000);this.camera.position.z=1000;
   this.scene.add(new THREE.AmbientLight(0xd7f7e9,2));
   const key=new THREE.DirectionalLight(0xffffff,3.5);key.position.set(-100,-150,500);this.scene.add(key);
   const rim=new THREE.DirectionalLight(0xa9e6dd,2);rim.position.set(300,80,200);this.scene.add(rim);
   this.geometry=new THREE.SphereGeometry(1,24,18);this.meshes=new Map();this.materials=new Map();this.textures=new Map();this.splashes=[];this.seen=new WeakSet();this.available=true;
   this.uniforms={uSize:{value:new THREE.Vector2()},uTime:{value:0},uColor:{value:new THREE.Color()},uDrops:{value:Array.from({length:48},()=>new THREE.Vector4(-9999,-9999,0,0))}};
   this.streamGeometry=new THREE.PlaneGeometry(1,1);this.streamMaterial=new THREE.ShaderMaterial({uniforms:this.uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,extensions:{derivatives:true}});
   this.stream=new THREE.Mesh(this.streamGeometry,this.streamMaterial);this.stream.position.z=80;this.stream.frustumCulled=false;this.scene.add(this.stream);
   this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;this.root.style.display='none';});
   this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.available=true;this.root.style.display='';});
   this.observer=new ResizeObserver(()=>this.measure());this.observer.observe(document.querySelector('.game'));this.measure();
 }
 measure(){
   const parent=document.querySelector('.game').getBoundingClientRect(),board=document.getElementById('game').getBoundingClientRect(),rack=document.getElementById('rack').getBoundingClientRect();
   this.width=board.width;this.height=rack.bottom-board.top;this.scaleX=board.width/360;this.scaleY=board.height/290;
   this.root.style.left=(board.left-parent.left-1)+'px';this.root.style.top=(board.top-parent.top-1)+'px';this.root.style.width=this.width+'px';this.root.style.height=this.height+'px';
   this.renderer.setSize(this.width,this.height);this.camera.right=this.width;this.camera.top=this.height;this.camera.bottom=0;this.camera.updateProjectionMatrix();this.uniforms.uSize.value.set(this.width,this.height);
   this.stream.scale.set(this.width,this.height,1);this.stream.position.set(this.width/2,this.height/2,80);
   this.targets=Array.from(document.querySelectorAll('.slot'),slot=>{const r=slot.getBoundingClientRect();return{x:r.left+r.width/2-board.left,y:r.top+9-board.top};});
 }
 material(color){
   if(!this.materials.has(color)){
     const material=new THREE.ShaderMaterial({uniforms:{uTint:{value:new THREE.Color(color)}},vertexShader:`varying vec3 vN; void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vN;uniform vec3 uTint;void main(){vec3 n=normalize(vN);vec3 l=normalize(vec3(-.5,.7,1.));float diffuse=max(dot(n,l),0.);float spec=pow(max(dot(n,normalize(l+vec3(0.,0.,1.))),0.),55.);float fresnel=pow(1.-abs(n.z),3.);vec3 col=uTint*(.45+.65*diffuse)+vec3(spec*.85)+vec3(.5,.85,.75)*fresnel*.25;gl_FragColor=vec4(col,.96);#include <colorspace_fragment>}`.replace(';#include',';\n#include'),transparent:true});
     this.materials.set(color,material);
   }return this.materials.get(color);
 }
 symbolTexture(color,symbol){
   if(!this.textures.has(color)){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.font='32px Georgia';g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgba(255,255,255,.8)';g.fillText(symbol,32,34);const texture=new THREE.CanvasTexture(c);this.textures.set(color,texture);}return this.textures.get(color);
 }
 update(now,columns,effects,colors){
   if(!this.available)return;
   const t=now/1000,live=new Set();
   columns.forEach((column,i)=>column.forEach(d=>{
     live.add(d.id);let group=this.meshes.get(d.id);
     if(!group){group=new THREE.Group();const sphere=new THREE.Mesh(this.geometry,this.material(colors[d.color].hex));group.add(sphere);const label=new THREE.Sprite(new THREE.SpriteMaterial({map:this.symbolTexture(colors[d.color].hex,colors[d.color].symbol),transparent:true,depthTest:false}));label.scale.set(18,18,1);label.position.z=24;group.add(label);group.userData.sphere=sphere;this.meshes.set(d.id,group);this.scene.add(group);}
     group.position.set((55+i*50)*this.scaleX,this.height-d.y*this.scaleY,15);
     const r=(21+Math.sin(d.seed)*2)*this.scaleX,wobble=Math.sin(t*2.4+d.seed)*.035;
     group.userData.sphere.scale.set(r*(1+wobble),r*(1-wobble)*this.scaleY/this.scaleX,r*.72);
     group.rotation.z=Math.sin(t*1.4+d.seed)*.035;group.children[1].scale.set(28*this.scaleX,28*this.scaleX,1);
   }));
   for(const [id,group] of this.meshes){if(!live.has(id)){this.scene.remove(group);group.children[1].material.dispose();this.meshes.delete(id);}}
   const drops=this.uniforms.uDrops.value;drops.forEach(d=>d.set(-9999,-9999,0,0));let k=0;
   for(const e of effects){
     const p=Math.min(1,(now-e.start)/e.duration),target=this.targets[e.slot]||{x:e.to.x*this.scaleX,y:this.height-30};
     const source={x:e.from.x*this.scaleX,y:e.from.y*this.scaleY},color=colors[e.color].hex;
     this.uniforms.uColor.value.set(color);
     // The source stretches into a neck, then becomes a continuous wavy jet.
     if(p<.3)drops[k++].set(source.x,source.y,18*this.scaleX*(1-p/.3),0);
     const end=Math.min(1,p/.32),start=Math.max(0,(p-.68)/.32);
     for(let j=0;j<32;j++){
       const q=start+(end-start)*j/31,inv=1-q;
       const x=inv*inv*source.x+2*inv*q*target.x+q*q*target.x+Math.sin(q*21-t*13)*2.2*Math.sin(q*Math.PI);
       const y=source.y+(target.y-source.y)*q;
       const radius=(4.8+Math.sin(q*15-t*12)*.25)*(1-q*.22)*this.scaleX;
       drops[k++].set(x,y,radius,0);
     }
     if(p>.32){
       const splash=(p-.32)/.68;
       for(let j=0;j<9;j++){const age=(splash+j/9)%1,v=(j-4)*22;drops[k++].set(target.x+v*age,target.y-38*age+45*age*age,(1-age)*2.8*this.scaleX,0);}
       drops[k++].set(target.x,target.y,5.5*this.scaleX,0);
       const slot=document.querySelectorAll('.slot')[e.slot];if(slot){slot.style.setProperty('--impact',String(Math.sin(t*32)*3));slot.classList.add('pouring');}
     }
     if(!this.seen.has(e)){this.seen.add(e);this.splashes.push({target,start:e.start+e.duration*.85,color,slot:e.slot});}
   }
   this.splashes=this.splashes.filter(s=>now-s.start<500);
   if(!effects.length){document.querySelectorAll('.slot.pouring').forEach(s=>{s.classList.remove('pouring');s.style.removeProperty('--impact');});}
   if(!effects.length&&this.splashes.length){const s=this.splashes[this.splashes.length-1],age=Math.max(0,(now-s.start)/500);this.uniforms.uColor.value.set(s.color);for(let j=0;j<9;j++){drops[k++].set(s.target.x+(j-4)*16*age,s.target.y-32*age+40*age*age,Math.max(0,(1-age)*2.2),0);}}
   this.uniforms.uTime.value=t;this.renderer.render(this.scene,this.camera);
 }
 reset(){this.splashes=[];this.seen=new WeakSet();for(const group of this.meshes.values()){this.scene.remove(group);group.children[1].material.dispose();}this.meshes.clear();}
}
try{window.potionFluid=new LiquidScene();document.documentElement.dataset.liquid='three';}catch(error){document.querySelector('.fluid-layer')?.remove();document.documentElement.dataset.liquid='canvas';console.warn('Liquid rendering uses the Canvas fallback.',error.message);}
