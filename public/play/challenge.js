globalThis.PotionChallenge={
 day:(date=new Date())=>date.toISOString().slice(0,10),
 level(date=new Date()){return 6+(Math.floor(Date.parse(this.day(date))/86400000)*17%25);},
 ruleset(daily=false,date=new Date()){return 'survival-v8'+(daily?'-daily-'+this.day(date):'');}
};
