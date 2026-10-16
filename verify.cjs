const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={};function element(){return{innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},contains(){return true}},setAttribute(){},addEventListener(){},focus(){}};}
const context={console,CHECK_LEVELS:Math.max(5,Number(process.env.POTION_CHECK_LEVELS)||50),performance:{now:()=>0},devicePixelRatio:1,requestAnimationFrame:()=>0,document:{getElementById:id=>elements[id]??=(id==='game'?{...element(),getContext:()=>({setTransform(){}})}:element()),addEventListener(){}},window:{addEventListener(){}}};
vm.createContext(context);for(const path of ['dist/vendor/matter.min.js','dist/physics.js','dist/game.js'])vm.runInContext(fs.readFileSync(path,'utf8'),context);
vm.runInContext(`
const assert=(ok,message)=>{if(!ok)throw Error(message)};const floorCounts=new Set(),amounts=new Set();let poured=0;
for(let level=1;level<=CHECK_LEVELS;level++){
 if(level%5===1)console.log('Checking physical levels '+level+'–'+(level+4));
 newGame(level);physics.settle();const initial=physics.bottom().length;floorCounts.add(initial);amounts.add(state.total);assert(initial>=6&&initial<=8,'Expected 6-8 floor gems at level '+level);
 assert(state.columns.flat().every(d=>d.drawRadius>=23),'Gems were shrunk');
 assert(state.total===state.solution.reduce((n,b)=>n+b.capacity,0),'Bottle demand mismatch');
 for(let move=0;move<state.bottleCount;move++){
  const lane=move%4;assert(state.lanes[lane][0].id===state.solution[move].id,'Lane order');choose(lane);let guard=0;
  while(state.shelf.some(Boolean)&&guard++<20){
   physics.settle();tick((move*100+guard)*1000);
   if(effects.length){completePour(effects[0]);effects=[];poured++;}
  }
  assert(!state.shelf.some(Boolean),'No physical winning route at level '+level+' move '+move);
 }
 assert(state.brewed===state.bottleCount&&state.columns.flat().length===0,'Incomplete level '+level);
}
assert(amounts.size>=4,'Gem count variation lost');
// A matching color stacked above another gem must not pour.
newGame(1);const lower={id:900,color:3,shape:1,radius:28,drawRadius:28,aspect:1,x:180,y:220,angle:Math.PI/4,seed:0},upper={id:901,color:0,shape:1,radius:25,drawRadius:25,aspect:1,x:180,y:170,angle:Math.PI/4,seed:0};
state.columns=[[upper,lower]];state.shelf=[{id:90,color:0,capacity:1,shape:0,fill:0},null,null,null,null];state.total=2;resetPhysics();physics.settle();
assert(physics.bottom(3).length===1&&physics.bottom(0).length===0,'Stack setup');tick(1000);assert(effects.length===0,'Upper gem converted before reaching floor');
state.shelf[1]={id:91,color:3,capacity:1,shape:1,fill:0};tick(2000);assert(effects[0]?.color===3,'Floor gem not collected');completePour(effects[0]);effects=[];
tick(3000);assert(effects.length===0,'Gem collected while still falling');physics.settle();tick(4000);assert(effects[0]?.color===0,'Fallen gem did not unlock');effects=[];
// Arbitrary jar-body contact above the floor must not count as bottom contact.
const probe={id:903,color:2,shape:0,radius:25,drawRadius:25,aspect:1,x:52,y:100,seed:0};physics.reset([[probe]]);assert(physics.bottom().length===0,'Side-wall contact counted as bottom');
// Undo while a drop is in flight must preserve it.
newGame(1);physics.settle();choose(0);tick(10000);assert(effects.length===1,'No initial flow');const saved=JSON.parse(JSON.stringify(state));choose(1);undo();assert(JSON.stringify(state.shelf)===JSON.stringify(saved.shelf)&&effects.length===1,'Undo lost in-flight drop');for(const d of state.columns.flat()){const old=saved.columns.flat().find(g=>g.id===d.id);assert(old&&Math.hypot(d.x-old.x,d.y-old.y)<.001,'Undo moved a gem');}
assert(state.columns.flat().length+effects.length+state.shelf.reduce((n,b)=>n+(b?.fill||0),0)===state.total,'Liquid conservation');
console.log('PASS: '+CHECK_LEVELS+' physical winning routes; 6-8 floor gems; enlarged sizes; upper/airborne/side-wall rejection; falling unlocks; variable demand; undo conservation.');
`,context);
assert(!fs.readFileSync('dist/index.html','utf8').includes('codex-preview'));
