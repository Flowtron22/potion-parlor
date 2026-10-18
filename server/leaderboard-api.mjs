import {validateScore as validateRun} from './validate-blocked.mjs';
import {PotionChallenge} from './challenge.mjs';
const titles=['Squire','Apprentice','Herbalist','Potion Brewer','Alchemist','Rune Caster','Mage','Archmage','Oracle','Arcane Sage','Immortal Alchemist'];
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const player=request=>request.headers.get('Cookie')?.match(/(?:^|;\s*)potion_player=([a-f0-9-]{36})(?:;|$)/)?.[1]||null;
const originAllowed=request=>!request.headers.get('Origin')||request.headers.get('Origin')===new URL(request.url).origin;
async function body(request){if(Number(request.headers.get('Content-Length')||0)>24000)throw Error('Request too large');const raw=await request.text();if(raw.length>24000)throw Error('Request too large');return JSON.parse(raw);}
export function createLeaderboardAPI(DB,levels){
 const getRun=(ticket,id)=>DB.prepare('SELECT * FROM runs WHERE id=? AND player=?').bind(String(ticket),id).first();
 function valid(run){return run&&Date.now()-run.created<=86400000&&/^survival-v9(?:-daily-\d{4}-\d{2}-\d{2})?$/.test(run.ruleset);}
 async function start(request){
  if(!originAllowed(request))return json({error:'Invalid origin'},403);
  try{
   const data=await body(request),daily=data.daily===true,level=daily&&!data.previous?PotionChallenge.level():Number(data.level),ruleset=PotionChallenge.ruleset(daily);
   if(!Number.isInteger(level)||level<1||level>levels.length)return json({error:'Invalid level'},400);
   const id=player(request)||crypto.randomUUID(),now=Date.now();let previous=null,points=0,best=1;
   if(data.previous){
    previous=await getRun(data.previous.ticket,id);
    if(!valid(previous)||previous.ruleset!==ruleset||level!==previous.level%levels.length+1)return json({error:'This run cannot continue. Restart for a new run.'},400);
    const child=await DB.prepare('SELECT * FROM runs WHERE parent=? AND player=?').bind(previous.id,id).first();
    if(child&&!child.used)return json({id:child.id,level:child.level,ruleset:child.ruleset,points:child.points});
    if(previous.used)return json({error:'This run has already ended.'},409);
    let result;try{result=validateRun(levels[previous.level-1],data.previous.events);}catch{return json({error:'This win could not be verified.'},400);}
    points=previous.points+result.score;best=Math.max(previous.best_combo,result.best);
   }
   const recent=await DB.prepare('SELECT COUNT(*) AS n FROM runs WHERE player=? AND created>?').bind(id,now-3600000).first();
   if((recent?.n||0)>=90)return json({error:'Too many restarts. Try again later.'},429);
   const ticket=crypto.randomUUID();
   if(previous){
    await DB.batch([
     DB.prepare('INSERT INTO runs(id,player,level,created,ruleset,points,best_combo,parent) SELECT ?,player,?,?,ruleset,?,?,id FROM runs WHERE id=? AND used=0').bind(ticket,level,now,points,best,previous.id),
     DB.prepare('UPDATE runs SET used=1 WHERE id=?').bind(previous.id)
    ]);
    if(!await getRun(ticket,id))return json({error:'This run has already continued.'},409);
   }else await DB.prepare('INSERT INTO runs(id,player,level,created,ruleset) VALUES(?,?,?,?,?)').bind(ticket,id,level,now,ruleset).run();
   return json({id:ticket,level,ruleset,points},200,{'Set-Cookie':`potion_player=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`});
  }catch(error){console.error('Start run',error);return json({error:'Unable to start ranked run. Try restarting.'},503);}
 }
 async function submit(request){
  if(!originAllowed(request))return json({error:'Invalid origin'},403);
  try{
   const data=await body(request),id=player(request),name=String(data.name||'').normalize('NFKC').trim(),title=titles.includes(data.title)?data.title:'Squire';
   if(!/^[\p{L}\p{N} _.-]{2,18}$/u.test(name))return json({error:'Use 2–18 letters or numbers for your name.'},400);
   const run=await getRun(data.ticket,id);
   if(!valid(run))return json({error:'Run expired or game updated. Restart for a new run.'},400);
   const final=data.events?.at(-1)?.type==='end';
   if(run.used===1)return json({error:'This run has already continued.'},409);
   let points,best;
   if(run.used===2){
    if(!final)return json({error:'This run has ended.'},409);
    const saved=await DB.prepare('SELECT score,combo FROM scores WHERE run=? AND player=?').bind(run.id,id).first();if(!saved)return json({error:'Score is still syncing. Retry.'},503);
    await DB.prepare('UPDATE scores SET name=? WHERE run=? AND player=?').bind(name,run.id,id).run();points=saved.score;best=saved.combo;
   }else{
    let result;try{result=validateRun(levels[run.level-1],data.events,'defeat');}catch(error){console.warn('Score replay rejected',run.id,error.message);return json({error:'Score could not sync. Please retry.'},400);}
    points=run.points+result.score;best=Math.max(run.best_combo,result.best);
    const sql='INSERT INTO scores(run,player,name,title,level,score,combo,created,ruleset) SELECT id,player,?,?,level,?,?,?,ruleset FROM runs WHERE id=? AND used=0 ON CONFLICT(run) DO UPDATE SET name=excluded.name,title=excluded.title,score='+(final?'excluded.score,combo=excluded.combo':'MAX(scores.score,excluded.score),combo=MAX(scores.combo,excluded.combo) WHERE excluded.score>=scores.score');
    const write=DB.prepare(sql).bind(name,title,points,best,Date.now(),run.id);
    if(final){await DB.batch([write,DB.prepare('UPDATE runs SET used=2 WHERE id=? AND used=0').bind(run.id)]);const saved=await DB.prepare('SELECT score FROM scores WHERE run=? AND player=?').bind(run.id,id).first();points=saved.score;}
    else await write.run();
   }
   const personal=await DB.prepare('SELECT MAX(score) AS best FROM scores WHERE ruleset=? AND player=?').bind(run.ruleset,run.player).first();
   const rank=await DB.prepare('SELECT COUNT(*)+1 AS rank FROM (SELECT MAX(score) AS best FROM scores WHERE ruleset=? GROUP BY player) WHERE best>?').bind(run.ruleset,personal?.best??points).first();
   return json({score:points,rank:rank?.rank||1});
  }catch(error){console.error('Submit score',error);return json({error:'Connection unavailable. Try again.'},503);}
 }
 async function leaderboard(request){
  const params=new URL(request.url).searchParams,daily=params.get('daily')==='1',ruleset=PotionChallenge.ruleset(daily);
  try{
   const rows=await DB.prepare('SELECT player,name,title,score FROM (SELECT player,name,title,score,created,ROW_NUMBER() OVER (PARTITION BY player ORDER BY score DESC,created ASC) AS n FROM scores WHERE ruleset=?) WHERE n=1 ORDER BY score DESC,created ASC LIMIT 30').bind(ruleset).all();
   const id=player(request);return json({rows:rows.results.map((row,i)=>({name:row.name,title:row.title,score:row.score,position:i+1,you:row.player===id}))});
  }catch(error){console.error('Leaderboard',error);return json({error:'Leaderboard unavailable. Try again.'},503);}
 }
 return {start,submit,leaderboard};
}
