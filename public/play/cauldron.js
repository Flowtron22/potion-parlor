// Cache the ironwork once: the rounded ironwork matches the curved physics walls.
globalThis.PotionCauldron={
 image:null,
 draw(ctx){
  if(!this.image){
   const image=document.createElement('canvas');image.width=720;image.height=580;
   const g=image.getContext('2d');g.scale(2,2);
   const gradient=(x1,y1,x2,y2,stops)=>{const fill=g.createLinearGradient(x1,y1,x2,y2);for(const [at,color] of stops)fill.addColorStop(at,color);return fill;};
   // Forged side handles and three small feet, behind the bowl.
   g.strokeStyle='#111f20';g.lineWidth=9;
   for(const x of [57,303]){g.beginPath();g.ellipse(x,60,13,22,x<180?.4:-.4,0,Math.PI*2);g.stroke();g.strokeStyle='#72867b';g.lineWidth=2;g.stroke();g.strokeStyle='#111f20';g.lineWidth=9;}
   g.fillStyle=gradient(0,255,0,284,[[0,'#52665a'],[.35,'#243c33'],[1,'#10241f']]);
   for(const x of [83,255]){g.beginPath();g.moveTo(x,253);g.lineTo(x+17,257);g.lineTo(x+22,281);g.quadraticCurveTo(x+11,286,x+2,279);g.closePath();g.fill();}
   const body=()=>{g.beginPath();g.moveTo(65,29);g.bezierCurveTo(43,60,12,97,12,140);g.bezierCurveTo(12,224,67,276,180,276);g.bezierCurveTo(293,276,348,224,348,140);g.bezierCurveTo(348,97,317,60,295,29);g.closePath();};
   const inside=()=>{g.beginPath();g.moveTo(70,28);for(const [x,y]of GemPhysics.outline.slice(1))g.lineTo(x,y);g.closePath();};
   g.save();g.shadowColor='#051711';g.shadowBlur=10;g.shadowOffsetY=5;body();g.fillStyle='#132a25';g.fill();g.restore();
   body();g.fillStyle=gradient(8,0,352,0,[[0,'#4a6559'],[.06,'#344e43'],[.16,'#1a322b'],[.53,'#152d26'],[.84,'#1a322b'],[.95,'#3e594c'],[1,'#263e35']]);g.fill();g.lineWidth=1.5;g.strokeStyle='#8da48a88';g.stroke();
   // The full round cutaway exposes the gems all the way down the bowl.
   inside();g.fillStyle=gradient(0,28,0,260,[[0,'#091d19'],[.2,'#19372c'],[.75,'#17362b'],[1,'#0c241b']]);g.fill();g.strokeStyle='#8ca68a55';g.lineWidth=1.5;g.stroke();
   g.strokeStyle='#9da77844';g.beginPath();g.moveTo(72,248);g.quadraticCurveTo(180,283,288,248);g.stroke();
   // A thick rolled bronze lip replaces the glass jar's corner clips.
   g.beginPath();g.ellipse(180,28,122,12,0,0,Math.PI*2);g.fillStyle=gradient(0,10,0,42,[[0,'#a69b70'],[.25,'#d3bf85'],[.45,'#6e7150'],[.8,'#384a35'],[1,'#78815a']]);g.fill();g.lineWidth=1;g.strokeStyle='#d2c48c88';g.stroke();
   g.beginPath();g.ellipse(180,26,111,7,0,0,Math.PI*2);g.fillStyle='#0d241d';g.fill();g.strokeStyle='#526c4b';g.stroke();g.beginPath();g.ellipse(180,30,117,8,0,.08,Math.PI-.08);g.strokeStyle='#c7b77c88';g.stroke();
   // Rivets and a restrained alchemical seal on the lower iron band.
   for(const x of [89,271]){g.beginPath();g.arc(x,260,2.5,0,Math.PI*2);g.fillStyle='#a19b68';g.fill();}
   g.strokeStyle='#baa97899';g.lineWidth=1.1;g.beginPath();g.moveTo(180,260);g.lineTo(186,266);g.lineTo(180,272);g.lineTo(174,266);g.closePath();g.stroke();
   this.image=image;
  }
  ctx.drawImage(this.image,0,0,360,290);
 }
};
