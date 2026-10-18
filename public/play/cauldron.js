// Cache the ironwork once: the physics and liquid keep their existing coordinates.
globalThis.PotionCauldron={
 image:null,
 draw(ctx){
  if(!this.image){
   const image=document.createElement('canvas');image.width=720;image.height=580;
   const g=image.getContext('2d');g.scale(2,2);
   const gradient=(x1,y1,x2,y2,stops)=>{const fill=g.createLinearGradient(x1,y1,x2,y2);for(const [at,color] of stops)fill.addColorStop(at,color);return fill;};
   // Forged side handles and three small feet, behind the bowl.
   g.strokeStyle='#111f20';g.lineWidth=9;
   for(const x of [15,345]){g.beginPath();g.ellipse(x,91,10,23,0,0,Math.PI*2);g.stroke();g.strokeStyle='#72867b';g.lineWidth=2;g.stroke();g.strokeStyle='#111f20';g.lineWidth=9;}
   g.fillStyle=gradient(0,255,0,284,[[0,'#52665a'],[.35,'#243c33'],[1,'#10241f']]);
   for(const x of [61,282]){g.beginPath();g.moveTo(x,253);g.lineTo(x+17,257);g.lineTo(x+22,281);g.quadraticCurveTo(x+11,286,x+2,279);g.closePath();g.fill();}
   const body=()=>{g.beginPath();g.moveTo(30,28);g.bezierCurveTo(18,55,8,96,8,144);g.bezierCurveTo(8,207,8,235,24,253);g.quadraticCurveTo(40,270,85,270);g.lineTo(275,270);g.quadraticCurveTo(320,270,336,253);g.bezierCurveTo(352,235,352,207,352,144);g.bezierCurveTo(352,96,342,55,330,28);g.closePath();};
   g.save();g.shadowColor='#051711';g.shadowBlur=10;g.shadowOffsetY=5;body();g.fillStyle='#132a25';g.fill();g.restore();
   body();g.fillStyle=gradient(8,0,352,0,[[0,'#4a6559'],[.06,'#344e43'],[.16,'#1a322b'],[.53,'#152d26'],[.84,'#1a322b'],[.95,'#3e594c'],[1,'#263e35']]);g.fill();g.lineWidth=1.5;g.strokeStyle='#8da48a88';g.stroke();
   // Dark open interior, with broad curved shoulders around the gem chamber.
   g.save();body();g.clip();g.fillStyle=gradient(0,27,0,250,[[0,'#091d19'],[.12,'#19372c'],[.8,'#17362b'],[1,'#0c241b']]);g.beginPath();g.roundRect(25,27,310,220,19);g.fill();
   g.strokeStyle='#8ca68a38';g.lineWidth=2;g.beginPath();g.moveTo(25,48);g.bezierCurveTo(13,106,14,204,27,237);g.moveTo(335,48);g.bezierCurveTo(347,106,346,204,333,237);g.stroke();
   g.fillStyle=gradient(0,245,0,271,[[0,'#354c3b'],[.35,'#263f31'],[1,'#172c25']]);g.fillRect(10,247,340,27);g.strokeStyle='#9da77844';g.lineWidth=1;g.beginPath();g.moveTo(29,251);g.quadraticCurveTo(180,264,331,251);g.stroke();g.restore();
   // A thick rolled bronze lip replaces the glass jar's corner clips.
   g.beginPath();g.ellipse(180,26,161,15,0,0,Math.PI*2);g.fillStyle=gradient(0,10,0,42,[[0,'#a69b70'],[.25,'#d3bf85'],[.45,'#6e7150'],[.8,'#384a35'],[1,'#78815a']]);g.fill();g.lineWidth=1;g.strokeStyle='#d2c48c88';g.stroke();
   g.beginPath();g.ellipse(180,24,149,8,0,0,Math.PI*2);g.fillStyle='#0d241d';g.fill();g.strokeStyle='#526c4b';g.stroke();g.beginPath();g.ellipse(180,28,155,10,0,.08,Math.PI-.08);g.strokeStyle='#c7b77c88';g.stroke();
   // Rivets and a restrained alchemical seal on the lower iron band.
   for(const x of [45,315]){g.beginPath();g.arc(x,255,2.5,0,Math.PI*2);g.fillStyle='#a19b68';g.fill();}
   g.strokeStyle='#baa97899';g.lineWidth=1.1;g.beginPath();g.moveTo(180,252);g.lineTo(186,259);g.lineTo(180,266);g.lineTo(174,259);g.closePath();g.stroke();
   this.image=image;
  }
  ctx.drawImage(this.image,0,0,360,290);
 }
};
