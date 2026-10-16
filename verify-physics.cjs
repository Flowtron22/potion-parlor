const fs=require('fs'),vm=require('vm');
const context={console,window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/vendor/matter.min.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/physics.js','utf8'),context);
vm.runInContext(`
const assert=(ok,message)=>{if(!ok)throw Error(message)};
const gem=(id,x,y,r,shape=0)=>({id,color:id%6,x,y,radius:r,drawRadius:r,aspect:1,shape,seed:1});
const a=gem(0,130,60,12),b=gem(1,130,150,20,1),c=gem(2,250,70,10,2),cols=[[a,b,c]];a.angle=0;b.angle=Math.PI/4;
const world=new GemPhysics();world.reset(cols);const masses=[...world.bodies.values()].map(b=>b.mass);assert(masses[1]>masses[0],'Size must affect mass');
for(let t=0;t<5000;t+=1000/60)world.step(t,cols);
assert(a.y>80&&c.y>150,'Bodies must fall under gravity');
assert(cols.flat().every(d=>Number.isFinite(d.x+d.y+d.angle)&&d.x>=25&&d.x<=335&&d.y<=246),'Bodies escaped jar');
const bodies=[...world.bodies.values()];for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){const collision=Matter.Collision.collides(bodies[i],bodies[j]);assert(!collision||collision.depth<1.3,'Persistent gem penetration');}
const before=a.y;cols[0]=[a,c];world.step(5016,cols);for(let t=5033;t<7000;t+=1000/60)world.step(t,cols);assert(a.y>before+8,'Removing support must make upper gem fall');assert(world.bodies.size===2,'Removed gem retained physics body');
world.nudge();let spin=0,movement=0;const startX=a.x;for(let t=7016;t<8000;t+=1000/60){world.step(t,cols);spin=Math.max(spin,Math.abs(a.angle));movement=Math.max(movement,Math.abs(a.x-startX));}assert(movement>2,'Nudge must move the pile');assert(spin>.05,'Gems must rotate');
assert(world.grab({x:a.x,y:a.y}),'Grab must select a physical gem');world.move({x:180,y:80});for(let t=8016;t<8500;t+=1000/60)world.step(t,cols);assert(a.y<180,'Elastic dragging must lift a gem');world.release();assert(world.drag===null,'Drag constraint leaked');
const saved=JSON.parse(JSON.stringify(cols));world.reset(saved);for(const d of saved.flat()){const body=world.bodies.get(d.id);assert(Math.abs(body.position.x-d.x)<.001&&Math.abs(body.position.y-d.y)<.001,'Position restore failed');}
// Fixed substeps should produce equivalent results at 30 and 60 Hz.
function run(fps){const d=gem(9,170,60,14,4),columns=[[d]],w=new GemPhysics();w.reset(columns);w.lastTime=1;for(let i=1;i<=fps*3;i++)w.step(1+i*1000/fps,columns);return d;}
const p=run(30),q=run(60);assert(Math.hypot(p.x-q.x,p.y-q.y)<1,'Frame rate changed physics');
`,context);
const elements={};function element(){return{innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},contains(){return true}},setAttribute(){},addEventListener(){},focus(){}};}
context.document={getElementById:id=>elements[id]??=(id==='game'?{...element(),getContext:()=>({setTransform(){}})}:element()),addEventListener(){}};context.window.addEventListener=()=>{};context.performance={now:()=>0};context.devicePixelRatio=1;context.requestAnimationFrame=()=>0;
vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
vm.runInContext(`
for(let level=1;level<=10;level++){
 newGame(level);for(let t=1;t<5000;t+=1000/60)physics.step(t,state.columns);
 assert(physics.bodies.size===state.total,'Physics/puzzle count mismatch');
 for(const body of physics.bodies.values()){assert(Number.isFinite(body.position.x+body.position.y),'Unstable pile');assert(body.bounds.min.x>23&&body.bounds.max.x<337&&body.bounds.max.y<247,'Pile escaped walls');}
 const savedPositions=new Map(state.columns.flat().map(d=>[d.id,{x:d.x,y:d.y,angle:d.angle}]));
 choose(0);tick(1000);physics.step(5017,state.columns);undo();
 for(const d of state.columns.flat()){const saved=savedPositions.get(d.id);assert(Math.hypot(d.x-saved.x,d.y-saved.y)<.001&&Math.abs(d.angle-saved.angle)<.001,'Game undo changed physical positions');}
}
`,context);
console.log('PASS: gravity, size-based mass, collisions, bounds, support removal, rotation, shake, elastic dragging, restore, 30/60 Hz consistency.');
