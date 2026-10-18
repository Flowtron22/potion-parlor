import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GemPhysics} from './server/physics.mjs';
const boards=JSON.parse(fs.readFileSync('server/levels.json','utf8'));
let curvedContacts=0,removed=0;
for(const board of boards){
 const world=new GemPhysics();world.reset(structuredClone(board.columns));world.settle(3600);
 assert(world.bottom().length>=6&&world.bottom().length<=8,'Opening floor access stays at 6–8');
 while(world.bodies.size){
  assert(world.settled,'Round bowl must settle after each removal');
  // Check actual collision vertices, allowing 3 pixels at segmented wall joints inside the thick iron rim.
  for(const body of world.bodies.values())for(const p of body.vertices)for(let i=0;i<GemPhysics.outline.length;i++){
   const a=GemPhysics.outline[i],b=GemPhysics.outline[(i+1)%GemPhysics.outline.length],dx=b[0]-a[0],dy=b[1]-a[1];
   assert((dx*(p.y-a[1])-dy*(p.x-a[0]))/Math.hypot(dx,dy)<3,'Gem escaped the round cauldron');
  }
  const floor=world.bottom();assert(floor.length,'No ingredient may get stranded on a curved wall');
  curvedContacts+=floor.filter(g=>Math.abs(g.x-180)>75&&g.y+g.drawRadius*g.aspect<243).length;
  const gem=floor[0];world.remove(gem.id);world.settle(3600);removed++;
 }
}
assert(curvedContacts>0,'Eligible gems must contact the curved lower wall, not a hidden rectangular floor');
console.log(`PASS: all ${boards.length} round bowls retain 6–8 initial contacts; ${removed} removals settle inside curved walls with no stranded gems.`);
