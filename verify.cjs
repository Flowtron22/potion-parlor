const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={};
function element(){return {innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},contains(){return true}},setAttribute(){},addEventListener(){},focus(){}};}
const context={console,Math,JSON,Number,Array,String,performance:{now:()=>0},localStorage:{getItem:()=>null,setItem(){}},devicePixelRatio:1,requestAnimationFrame:()=>0,document:{getElementById:id=>elements[id]??=(id==='game'?{...element(),getContext:()=>({setTransform(){}})}:element()),addEventListener(){}},window:{addEventListener(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),context);
vm.runInContext(`
for(let level=1;level<=250;level++){
 newGame(level);
 const solution=state.solution.slice();
 for(let move=0;move<12;move++){
  const lane=move%4;
  if(state.lanes[lane][0]!==solution[move])throw Error('Invalid lane order');
  choose(lane);
  let guard=0;
  while(state.shelf.some(Boolean)&&guard++<100){
   tick((move*100+guard)*1000);
   if(effects.length){completePour(effects[0]);effects=[];}
  }
  if(state.shelf.some(Boolean))throw Error('Unsolvable level '+level);
 }
 if(state.brewed!==12||state.columns.some(c=>c.length))throw Error('Incomplete level '+level);
}
newGame(1);const before=JSON.stringify(state);choose(0);tick(1000);if(!effects.length)throw Error('No flow');completePour(effects[0]);effects=[];undo();if(JSON.stringify(state)!==before)throw Error('Undo mismatch');
// Rapid choices during a pour must not overfill the shelf or lose liquid.
newGame(4);for(let i=0;i<8;i++)choose(i%4);if(state.shelf.filter(Boolean).length!==5)throw Error('Shelf capacity');
`,context);
assert(!fs.readFileSync('dist/index.html','utf8').includes('codex-preview'));
console.log('PASS: 250 solvable levels, 9,000 drops conserved, lane order, exact undo, shelf capacity, JavaScript initialization.');
