import {env} from 'cloudflare:workers';
import levels from './levels.json';
import {validateRun} from './validate.mjs';
import {PotionChallenge} from './challenge.mjs';
export const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export function player(request:Request){return request.headers.get('Cookie')?.match(/(?:^|;\s*)potion_player=([a-f0-9-]{36})(?:;|$)/)?.[1]||null;}
export async function body(request:Request){if(Number(request.headers.get('Content-Length')||0)>24000)throw Error('Request too large');const raw=await request.text();if(raw.length>24000)throw Error('Request too large');return JSON.parse(raw);}
export function originAllowed(request:Request){const origin=request.headers.get('Origin');return !origin||origin===new URL(request.url).origin;}
export async function start(request:Request){
 if(!originAllowed(request))return json({error:'Invalid origin'},403);
 try{const data=await body(request),daily=data.daily===true,level=daily?PotionChallenge.level():Number(data.level),ruleset=PotionChallenge.ruleset(daily);if(!Number.isInteger(level)||level<1||level>levels.length)return json({error:'Invalid level'},400);
 const id=player(request)||crypto.randomUUID(),now=Date.now(),recent=await env.DB!.prepare(`SELECT COUNT(*) AS n FROM runs WHERE player=? AND created>?`).bind(id,now-3600000).first<{n:number}>();
 if((recent?.n||0)>=90)return json({error:'Too many restarts. Try again later.'},429);
 const ticket=crypto.randomUUID();await env.DB!.prepare(`INSERT INTO runs(id,player,level,created,ruleset) VALUES(?,?,?,?,?)`).bind(ticket,id,level,now,ruleset).run();
 return json({id:ticket,level,ruleset},200,{'Set-Cookie':`potion_player=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`});
 }catch(error){console.error('Start run',error);return json({error:'Unable to start ranked run. Try restarting.'},503);}
}
export async function submit(request:Request){
 if(!originAllowed(request))return json({error:'Invalid origin'},403);
 try{const data=await body(request),id=player(request),name=String(data.name||'').normalize('NFKC').trim();
 if(!/^[\p{L}\p{N} _.-]{2,18}$/u.test(name))return json({error:'Use 2–18 letters or numbers for your name.'},400);
 const run=await env.DB!.prepare(`SELECT * FROM runs WHERE id=? AND player=?`).bind(String(data.ticket),id).first<{id:string;player:string;level:number;created:number;used:number;ruleset:string}>();
 if(!run||Date.now()-run.created>86400000)return json({error:'Run expired. Restart to rank a new run.'},400);
 if(!/^cascade-v4(?:-daily-\d{4}-\d{2}-\d{2})?$/.test(run.ruleset))return json({error:'The game was updated. Restart for a ranked run.'},400);
 if(run.used)return json({error:'This run was already submitted.'},409);
 let result;try{result=validateRun(levels[run.level-1],data.events);}catch(error){console.warn('Run validation:',error);return json({error:'This run could not be verified. Try a fresh run.'},400);}
 // Conditional insert makes ticket consumption atomic even with concurrent submissions.
 await env.DB!.batch([
  env.DB!.prepare(`INSERT OR IGNORE INTO scores(run,player,name,level,score,combo,created,ruleset) SELECT id,player,?,level,?,?,?,ruleset FROM runs WHERE id=? AND used=0`).bind(name,result.score,result.best,Date.now(),run.id),
  env.DB!.prepare(`UPDATE runs SET used=1 WHERE id=?`).bind(run.id)
 ]);
 const personal=await env.DB!.prepare(`SELECT MAX(score) AS best FROM scores WHERE ruleset=? AND level=? AND player=?`).bind(run.ruleset,run.level,run.player).first<{best:number}>();
 const rank=await env.DB!.prepare(`SELECT COUNT(*)+1 AS rank FROM (SELECT MAX(score) AS best FROM scores WHERE ruleset=? AND level=? GROUP BY player) WHERE best>?`).bind(run.ruleset,run.level,personal?.best||result.score).first<{rank:number}>();
 return json({score:result.score,rank:rank?.rank||1});
 }catch(error){console.error('Submit score',error);return json({error:'Connection unavailable. Try again.'},503);}
}
export async function leaderboard(request:Request){
 const params=new URL(request.url).searchParams,daily=params.get('daily')==='1',level=daily?PotionChallenge.level():Number(params.get('level')||1),ruleset=PotionChallenge.ruleset(daily);if(!Number.isInteger(level)||level<1||level>levels.length)return json({error:'Invalid level'},400);
 try{const rows=await env.DB!.prepare(`SELECT name,score,combo FROM (SELECT name,score,combo,created,ROW_NUMBER() OVER (PARTITION BY player ORDER BY score DESC,created ASC) AS n FROM scores WHERE ruleset=? AND level=?) WHERE n=1 ORDER BY score DESC,created ASC LIMIT 30`).bind(ruleset,level).all();return json({rows:rows.results});}catch(error){console.error('Leaderboard',error);return json({error:'Leaderboard unavailable. Try again.'},503);}
}

