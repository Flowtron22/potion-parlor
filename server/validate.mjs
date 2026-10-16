import {GemPhysics} from './physics.mjs';
import {PotionScore} from './scoring.mjs';
export function validateRun(board,events){
 if(!Array.isArray(events)||events.length!==board.total+board.bottleCount)throw Error('Incomplete run');
 const columns=structuredClone(board.columns),lanes=structuredClone(board.lanes),shelf=Array(board.slots).fill(null),world=new GemPhysics(),score=PotionScore.fresh();let brewed=0;world.reset(columns);world.settle();
 for(const event of events){if(event.type==='place'){const slot=shelf.indexOf(null);if(slot<0||!Number.isInteger(event.lane)||!lanes[event.lane]?.length)throw Error('Invalid bottle choice');shelf[slot]={...lanes[event.lane].shift(),fill:0};PotionScore.place(score);}else if(event.type==='pour'){const bottle=shelf[event.slot];if(!bottle)throw Error('Invalid shelf');const gem=world.bottom(bottle.color)[0];if(!gem||gem.id!==event.gem)throw Error('Invalid floor gem');world.remove(gem.id);world.settle();PotionScore.gem(score);bottle.fill++;if(bottle.fill===bottle.capacity){PotionScore.clear(score,bottle.capacity,bottle.color,board.level);shelf[event.slot]=null;brewed++;}}else throw Error('Invalid action');}
 if(world.bodies.size||brewed!==board.bottleCount)throw Error('Incomplete run');PotionScore.finish(score,board.level);return score;
}
