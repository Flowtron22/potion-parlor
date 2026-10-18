// Isolated local end-to-end preview: in-memory SQLite, real game and API handlers.
import http from 'node:http';
import fs from 'node:fs/promises';
import {createLeaderboardAPI} from '../server/leaderboard-api.mjs';
import {testDatabase,losingEvents} from '../verify-survival.mjs';
import {boards} from '../verify-blocked.mjs';
const {DB}=testDatabase(),api=createLeaderboardAPI(DB,boards);
for(const [name,title] of [['Juniper','Arcane Sage'],['Moss','Alchemist']]){
 const r=await api.start(new Request('http://127.0.0.1:4191/api/runs',{method:'POST',body:JSON.stringify({level:1})})),ticket=await r.json();
 await api.submit(new Request('http://127.0.0.1:4191/api/scores',{method:'POST',headers:{Cookie:r.headers.get('Set-Cookie').split(';')[0]},body:JSON.stringify({ticket:ticket.id,name,title,events:losingEvents(boards[0])})}));
}
const root=new URL('../public/',import.meta.url),types={'.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.html':'text/html'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:4191');res.setHeader('Cache-Control','no-store');
 if(url.pathname.startsWith('/api/')){let body='';for await(const chunk of req)body+=chunk;const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body}:{})}),handler={runs:api.start,scores:api.submit,leaderboard:api.leaderboard}[url.pathname.slice(5)];if(!handler){res.writeHead(404).end();return;}const r=await handler(request);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
 const file=new URL('.'+(url.pathname==='/'?'/play/index.html':url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname),root);if(!file.href.startsWith(root.href)){res.writeHead(404).end();return;}
 const data=await fs.readFile(file);res.setHeader('Content-Type',types[file.pathname.slice(file.pathname.lastIndexOf('.'))]||'application/octet-stream');res.end(data);
 }catch(e){console.error(e);res.writeHead(500).end();}}).listen(4191,'127.0.0.1',()=>console.log('Isolated run-score check: http://127.0.0.1:4191/play/'));
