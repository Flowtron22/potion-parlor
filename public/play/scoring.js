// Deterministic cascades: thinking time never breaks a chain; choosing a flask does.
globalThis.PotionScore={
 fresh:()=>({score:0,combo:1,wave:0,placed:0,lastColor:-1,best:1,clears:0,finished:false}),
 place(s){s.placed++;s.wave=0;s.combo=1;},
 burst(s,count){s.wave++;s.combo=Math.min(8,s.wave+count-1);s.best=Math.max(s.best,s.combo);s.score+=100*count*s.combo;},
 gem(){},
 clear(s,capacity,color,level,multiplier=s.combo){s.clears++;s.score+=Math.round((200+capacity*75)*multiplier*(1+Math.min(level-1,29)*.04));s.lastColor=color;},
 breakChain(s){s.wave=0;s.combo=1;},
 finish(s,level){if(s.finished)return;s.finished=true;s.score+=1000+level*100+s.best*200;},
 medal(s,rescued=false,target=5){return rescued?1:s.best>=target?3:s.best>=Math.max(2,target-1)?2:1;}
};

