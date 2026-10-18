'use strict';
// The physics world owns both motion and eligibility: only floor contacts can pour.
// No Matter bodies are stored in game state, so undo can restore clean JSON snapshots.
class GemPhysics {
 static outline=[[70,28],[58,49],[44,75],[32,105],[26,137],[30,170],[43,201],[64,226],[92,243],[125,253],[162,257],[198,257],[235,253],[268,243],[296,226],[317,201],[330,170],[334,137],[328,105],[316,75],[302,49],[290,28]];
 static arrange(gems,random=()=>.5){
  const spots=[];for(const [count,y] of [[5,213],[6,172],[7,131],[6,90],[5,49]])for(let col=0;col<count;col++)spots.push({x:180+(col-(count-1)/2)*44,y});
  gems.forEach((g,i)=>{const p=spots[i%spots.length];g.x=p.x+(random()-.5)*3;g.y=p.y+(random()-.5)*3;g.angle=(random()-.5)*.5;g.vx=g.vy=g.angularVelocity=0;g.sleeping=false;g.available=false;for(const key of ['prevX','prevY','prevAngle','renderX','renderY','renderAngle'])delete g[key];});return gems;
 }

 constructor(){
  this.engine=Matter.Engine.create({enableSleeping:true,positionIterations:8,velocityIterations:6});this.engine.gravity.y=.78;this.bodies=new Map();this.impacts=[];this.accumulator=0;this.lastTime=0;this.drag=null;this.impactClock=0;
  // Stable IDs keep collision-pair order independent of previous levels/worlds.
  const wall={isStatic:true,friction:0,restitution:.12};this.floorParts=[];this.walls=[];
  for(let i=0;i<GemPhysics.outline.length-1;i++){const a=GemPhysics.outline[i],b=GemPhysics.outline[i+1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);const part=Matter.Bodies.rectangle((a[0]+b[0])/2-dy/len*7,(a[1]+b[1])/2+dx/len*7,len,14,{...wall,id:i+1,angle:Math.atan2(dy,dx)});this.walls.push(part);if((a[1]+b[1])/2>=210)this.floorParts.push(part);}
  this.floor=this.floorParts[Math.floor(this.floorParts.length/2)];Matter.Composite.add(this.engine.world,[...this.walls,Matter.Bodies.rectangle(180,16,230,24,{...wall,id:40})]);this.quietSteps=0;this.settled=false;
  Matter.Events.on(this.engine,'collisionStart',event=>{for(const pair of event.pairs){const a=pair.bodyA,b=pair.bodyB,speed=Math.hypot(a.velocity.x-b.velocity.x,a.velocity.y-b.velocity.y);if(speed<.8)continue;const p=pair.collision.supports[0]||a.position;this.impacts.push({x:p.x,y:p.y,strength:Math.min(3,speed),life:1,color:a.plugin.gem?.color??b.plugin.gem?.color??2});for(const body of [a,b])if(body.plugin.gem)body.plugin.gem.impact=Math.min(.07,speed*.008);}});
 }
 makeBody(d,col){
  const r=d.drawRadius,ry=r*d.aspect,n=[20,4,6,10,20,3][d.shape],points=[];
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2-Math.PI/2;let x=Math.cos(a)*r,y=Math.sin(a)*ry;if(d.shape===4)x*=.76+.24*y/ry;points.push({x,y});}
  const heavy=d.material==='heavy';
  const body=Matter.Bodies.fromVertices(d.x??55+col*50,d.y??d.targetY,[points],{density:heavy?.0044:.0017,friction:heavy?.4:d.shape===0?.14:.32,frictionStatic:heavy?.7:.52,frictionAir:.013,restitution:heavy?.06:d.shape===0?.23:.13,sleepThreshold:55,plugin:{gem:d}},true);
  body.id=100+d.id;body.plugin.gem=d;Matter.Body.setAngle(body,d.angle??Math.sin(d.seed)*.08);Matter.Body.setVelocity(body,{x:d.vx||0,y:d.vy||0});Matter.Body.setAngularVelocity(body,d.angularVelocity||0);if(d.sleeping)Matter.Sleeping.set(body,true);return body;
 }
 reset(columns){
  this.release();for(const body of this.bodies.values())Matter.Composite.remove(this.engine.world,body);this.bodies.clear();Matter.Engine.clear(this.engine);this.impacts=[];this.accumulator=0;this.lastTime=0;this.quietSteps=0;this.settled=false;
  columns.forEach((column,i)=>column.forEach(d=>{const body=this.makeBody(d,i);this.bodies.set(d.id,body);Matter.Composite.add(this.engine.world,body);}));this.sync();
 }
 sync(){const alpha=this.settled?1:Math.max(0,Math.min(1,this.accumulator/(1000/120)));for(const body of this.bodies.values()){const d=body.plugin.gem;d.x=body.position.x;d.y=body.position.y;d.angle=body.angle;d.renderX=(d.prevX??d.x)+(d.x-(d.prevX??d.x))*alpha;d.renderY=(d.prevY??d.y)+(d.y-(d.prevY??d.y))*alpha;d.renderAngle=(d.prevAngle??d.angle)+(d.angle-(d.prevAngle??d.angle))*alpha;d.vx=body.velocity.x;d.vy=body.velocity.y;d.angularVelocity=body.angularVelocity;d.sleeping=body.isSleeping;d.available=this.settled&&this.canCollect(body);}}
 canCollect(body){return !this.drag&&body.bounds.max.y>=234&&Math.abs(body.velocity.y)<.35&&body.speed<.55&&Math.abs(body.angularVelocity)<.04&&this.floorParts.some(part=>!!Matter.Collision.collides(body,part));}
 bottom(color){return [...this.bodies.values()].filter(b=>(color===undefined||b.plugin.gem.color===color)&&this.canCollect(b)).sort((a,b)=>a.position.x-b.position.x||a.plugin.gem.id-b.plugin.gem.id).map(b=>b.plugin.gem);}
 advance(){
  if(this.settled&&!this.drag)return;
  for(const b of this.bodies.values()){const d=b.plugin.gem;d.prevX=b.position.x;d.prevY=b.position.y;d.prevAngle=b.angle;}
  // A shallow inward tilt helps angular gems clear seams on the curved side walls.
  // It never grants collection: a gem still has to reach the low floor contacts.
  for(const body of this.bodies.values())if(body.position.y>150&&body.position.y<224&&Math.abs(body.position.x-180)>80)Matter.Body.applyForce(body,body.position,{x:(180-body.position.x)*body.mass*.000002,y:0});
  Matter.Engine.update(this.engine,1000/120);
  const quiet=!this.drag&&[...this.bodies.values()].every(b=>b.isSleeping||(b.speed<.12&&Math.abs(b.angularVelocity)<.012));
  this.quietSteps=quiet?this.quietSteps+1:0;this.settled=this.quietSteps>=24;
  if(this.settled&&this.bodies.size&&![...this.bodies.values()].some(b=>this.canCollect(b))){
   // No low contact remains: let an angular bridge physically slide into the bowl.
   // This changes motion, never the collection test or ingredient supply.
   this.settled=false;this.quietSteps=0;
   for(const b of this.bodies.values())if(Math.abs(b.position.x-180)>60){Matter.Sleeping.set(b,false);const direction=b.position.x<180?1:-1;Matter.Body.setVelocity(b,{x:direction*.65,y:.15});Matter.Body.setAngularVelocity(b,direction*.012);}
  }
  if(this.settled)for(const b of this.bodies.values())Matter.Sleeping.set(b,true);
 }
 settle(maxSteps=720){for(let i=0;i<maxSteps&&!this.settled;i++)this.advance();this.sync();return this.settled;}
 remove(id){const body=this.bodies.get(id);if(!body)return;Matter.Composite.remove(this.engine.world,body);this.bodies.delete(id);this.quietSteps=0;this.settled=false;for(const b of this.bodies.values())Matter.Sleeping.set(b,false);this.sync();}
 reconcile(columns){const ids=new Set(columns.flat().map(d=>d.id));for(const [id,body] of this.bodies)if(!ids.has(id)){if(this.drag?.bodyB===body)this.release();this.remove(id);}}
 step(now,columns){
  let count=0;for(const column of columns)count+=column.length;if(count!==this.bodies.size)this.reconcile(columns);const elapsed=this.lastTime?Math.max(0,Math.min(50,now-this.lastTime)):1000/60;this.lastTime=now;
  if(this.settled&&!this.drag){this.accumulator=0;const changed=!!this.impacts.length;if(changed){this.impacts=this.impacts.filter(p=>(p.life-=elapsed/500)>0);for(const b of this.bodies.values())b.plugin.gem.impact=this.impacts.length?(b.plugin.gem.impact||0)*Math.exp(-elapsed/120):0;}return changed;}
  this.accumulator+=elapsed;
  while(this.accumulator>=1000/120){this.advance();this.accumulator-=1000/120;if(this.settled){this.accumulator=0;break;}}
  this.sync();for(const d of columns.flat())d.impact=(d.impact||0)*Math.exp(-elapsed/120);
  this.impacts=this.impacts.filter(p=>(p.life-=elapsed/500)>0).slice(-20);return true;
 }
 grab(point){
  this.release();const bodies=Matter.Query.point([...this.bodies.values()],point);if(!bodies.length)return false;const body=bodies[bodies.length-1];Matter.Sleeping.set(body,false);this.drag=Matter.Constraint.create({pointA:point,bodyB:body,pointB:{x:point.x-body.position.x,y:point.y-body.position.y},length:0,stiffness:.065,damping:.12});Matter.Composite.add(this.engine.world,this.drag);return true;
 }
 move(point){if(this.drag)this.drag.pointA={x:Math.max(30,Math.min(330,point.x)),y:Math.max(22,Math.min(238,point.y))};}
 release(){if(this.drag){Matter.Composite.remove(this.engine.world,this.drag);this.drag=null;}}
 nudge(){this.quietSteps=0;this.settled=false;for(const body of this.bodies.values()){Matter.Sleeping.set(body,false);const direction=body.position.x<180?1:-1,weight=1/Math.sqrt(Math.max(.45,body.mass));Matter.Body.setVelocity(body,{x:body.velocity.x+direction*1.4*weight,y:Math.min(body.velocity.y,0)-2.8*weight});Matter.Body.setAngularVelocity(body,direction*.018*weight);}this.impacts.push({x:180,y:243,strength:2,life:1,color:2});}
}
window.GemPhysics=GemPhysics;
