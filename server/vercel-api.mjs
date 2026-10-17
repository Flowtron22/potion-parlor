// Vercel runs Node.js; the existing shared D1 leaderboard remains on Sites.
// Forward only this game's anonymous cookie, never other application cookies.
const DEFAULT_BACKEND='https://potion-parlor-joran.pedr0kantor.chatgpt.site';
const json=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
export function createBackendProxy({backend=process.env.POTION_BACKEND_URL||DEFAULT_BACKEND,fetcher=globalThis.fetch}={}){
 return async function proxy(request,path){
  const incoming=new URL(request.url),origin=request.headers.get('Origin');
  // Next can use an internal localhost URL while Host retains the public host.
  const scheme=request.headers.get('X-Forwarded-Proto')?.split(',')[0].trim()||incoming.protocol.slice(0,-1);
  const publicOrigin=new URL(scheme+'://'+(request.headers.get('Host')||incoming.host)).origin;
  if(origin&&origin!==publicOrigin)return json('Invalid origin',403);
  try{
   const target=new URL('/api/'+path,backend);if(!['http:','https:'].includes(target.protocol)||target.origin===incoming.origin)throw Error('Invalid backend');
   if(path==='leaderboard')target.searchParams.set('level',incoming.searchParams.get('level')||'1');
   const headers=new Headers({'Accept':'application/json','Origin':target.origin});
   const player=request.headers.get('Cookie')?.match(/(?:^|;\s*)(potion_player=[a-f0-9-]{36})(?:;|$)/)?.[1];
   if(player)headers.set('Cookie',player);
   let body;
   if(request.method==='POST'){
    if(Number(request.headers.get('Content-Length')||0)>24000)return json('Request too large',413);
    body=await request.text();if(body.length>24000)return json('Request too large',413);
    headers.set('Content-Type','application/json');
   }
   const response=await fetcher(target,{method:request.method,headers,body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
   if(!response.headers.get('Content-Type')?.includes('application/json'))throw Error('Backend unavailable');
   const result=await response.text(),output=new Headers({'Content-Type':'application/json','Cache-Control':'no-store'});
   const cookies=response.headers.getSetCookie?.()||[response.headers.get('Set-Cookie')||''];
   for(let cookie of cookies)if(cookie.startsWith('potion_player=')){
    if(incoming.protocol==='http:'&&['localhost','127.0.0.1'].includes(incoming.hostname))cookie=cookie.replace(/;\s*Secure/ig,'');
    output.append('Set-Cookie',cookie);
   }
   return new Response(result,{status:response.status,headers:output});
  }catch{return json('Leaderboard service unavailable. Try again shortly.',503);}
 };
}
const proxy=createBackendProxy();
export const start=request=>proxy(request,'runs');
export const submit=request=>proxy(request,'scores');
export const leaderboard=request=>proxy(request,'leaderboard');
