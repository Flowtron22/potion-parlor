// Local-only preview of a real fourth-win promotion, isolated from game saves.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const root=new URL('../public/play/',import.meta.url);
http.createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  res.setHeader('Cache-Control','no-store');
  if(path==='/'){
   let html=await readFile(new URL('index.html',root),'utf8');
   html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/(href|src)="(?!https?:)([^"]+)"/g,'$1="/play/$2"');
   html=html.replace('</head>','<style>.game{display:none}#qaWin{font-size:16px;margin:15px 0}.qa-note{text-align:center;font-size:12px}</style></head>').replace('</main>','<p class="qa-note">Local animation check · isolated test save</p><button id="qaWin" class="primary">Complete fourth win</button></main>');
   html=html.replace('</body>',`<script src="/play/mastery.js?v=4"></script><script>localStorage.setItem('potion-mastery-v1',JSON.stringify({version:2,mana:50,free:1,records:{}}));const qaProfile=PotionMastery.create(localStorage);for(let level=1;level<=3;level++)qaProfile.award({level});</script><script src="/play/mastery-ui.js?v=4"></script><script>document.getElementById('qaWin').onclick=()=>{PotionTitles.finish(true,{level:4,medal:3,combo:4});document.getElementById('resultScore').textContent='12,000';document.getElementById('modalTitle').textContent='✧';document.getElementById('modal').classList.remove('hidden');document.getElementById('modalAction').textContent='Continue';};document.getElementById('modalAction').onclick=()=>document.getElementById('modal').classList.add('hidden');</script></body>`);
   res.setHeader('Content-Type','text/html');return res.end(html);
  }
  if(!path.startsWith('/play/')){res.writeHead(404);return res.end();}
  const file=new URL(path.slice(6),root);if(!file.href.startsWith(root.href)){res.writeHead(404);return res.end();}
  const data=await readFile(file);res.setHeader('Content-Type',path.endsWith('.css')?'text/css':path.endsWith('.js')?'application/javascript':'text/html');res.end(data);
 }catch{res.writeHead(404);res.end();}
}).listen(4182,'127.0.0.1',()=>console.log('Rank animation check: http://127.0.0.1:4182'));
