// Visible, counted stored ingredients need a visible origin for every pour.
globalThis.PotionEssenceFX={
 flights:new Map(),
 reset(){for(const node of this.flights.values())node.remove();this.flights.clear();},
 update(now,effects,colors){
  const active=effects.filter(e=>e.stored&&(now-e.start)<e.duration),live=new Set(active);
  for(const [effect,node] of this.flights)if(!live.has(effect)){node.remove();this.flights.delete(effect);}
  if(!active.length)return;
  const game=document.querySelector('.game'),board=document.getElementById('game').getBoundingClientRect(),parent=game.getBoundingClientRect(),slots=document.querySelectorAll('#rack .slot');
  // Collect layout before writing styles to avoid per-emitter layout thrashing.
  const poses=active.map(e=>{
   const svg=slots[e.slot]?.querySelector('.bottle');if(!svg)return null;
   const slot=slots[e.slot].getBoundingClientRect(),css=getComputedStyle(svg),w=parseFloat(css.width),h=parseFloat(css.height),padding=parseFloat(getComputedStyle(slots[e.slot]).paddingBottom)||13;
   const source={x:board.left-parent.left+e.from.x*board.width/360,y:board.top-parent.top+e.from.y*board.height/290},target={x:slot.left-parent.left+slot.width/2,y:slot.bottom-parent.top-padding-h+(Number(svg.dataset.mouthY)||17)*h/82};
   const p=Math.max(0,Math.min(1,(now-e.start)/e.duration));
   const pose=window.potionSoulPose?.(p,source,target,e.gemId)||{x:source.x+(target.x-source.x)*p,y:source.y+(target.y-source.y)*p,delivered:Math.max(0,(p-.78)/.22)};
   const next=window.potionSoulPose?.(Math.min(.78,p+.01),source,target,e.gemId)||target;
   return{e,pose,p,angle:p>=.78?90:Math.atan2(next.y-pose.y,next.x-pose.x)*180/Math.PI};
  });
  for(const item of poses){if(!item)continue;const {e,pose,p,angle}=item;let node=this.flights.get(e);
   if(!node){node=document.createElement('i');node.className='essence-flight';node.setAttribute('aria-hidden','true');node.dataset.essenceGem=e.gemId;node.style.setProperty('--essence',colors[e.color].hex);game.append(node);this.flights.set(e,node);}
   node.style.transform=`translate(${pose.x}px,${pose.y}px) rotate(${angle}deg) scale(${p>=.78?Math.max(.05,1-pose.delivered):1})`;
   node.style.opacity=String(Math.min(1,p/.08)*Math.max(0,1-pose.delivered));
  }
 }
};
