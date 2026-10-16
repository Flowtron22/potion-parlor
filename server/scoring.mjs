// Shared, deterministic scoring. No wall-clock pressure or idle-time penalty.
export const PotionScore={
 fresh:()=>({score:0,combo:1,streak:0,placed:0,lastColor:-1,best:1,finished:false}),
 place(s){s.placed++;},
 gem(s){s.score+=100*s.combo;},
 clear(s,capacity,color,level){const cascade=s.placed===0&&s.streak>0;s.streak=s.lastColor===color?1:s.streak+1;s.combo=Math.min(8,1+Math.floor(s.streak/2)+(cascade?1:0));s.best=Math.max(s.best,s.combo);const variety=s.lastColor!==-1&&s.lastColor!==color?1.25:1;s.score+=Math.round((200+capacity*75)*s.combo*variety*(1+Math.min(level-1,29)*.04));s.lastColor=color;s.placed=0;},
 breakChain(s){s.streak=0;s.combo=1;s.placed=0;s.lastColor=-1;},
 finish(s,level){if(s.finished)return;s.finished=true;s.score+=1000+level*100+s.best*200;}
};

