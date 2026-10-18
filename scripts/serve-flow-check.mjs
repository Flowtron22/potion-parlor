// Local-only GPU regression fixture. Serve only the fixture and its module assets.
import http from 'node:http';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const assets=new Map([
 ['/tests/fixtures/flow-gpu.html','text/html'],
 ['/tests/fixtures/soul-gpu.html','text/html'],
 ['/public/play/soul-field.mjs','application/javascript'],
 ['/public/play/soul-motion.mjs','application/javascript'],
 ['/public/play/vendor/pavel-fluid/post.mjs','application/javascript'],
 ['/public/play/pavel-fluid.mjs','application/javascript'],
 ['/public/play/vendor/three.module.min.js','application/javascript'],
 ['/public/play/vendor/three.core.min.js','application/javascript'],
 ['/public/play/vendor/pavel-fluid/shaders.mjs','application/javascript'],
]);
const port=Number(process.argv[2]||4180);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Use an unprivileged local port');
http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(pathname==='/'){res.writeHead(302,{Location:'/tests/fixtures/flow-gpu.html'}).end();return;}
 if(!assets.has(pathname)){res.writeHead(404).end();return;}
 try{const path=fileURLToPath(new URL('..'+pathname,import.meta.url));const body=await fs.readFile(path);res.writeHead(200,{'Content-Type':assets.get(pathname),'Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log(`GPU flow check: http://127.0.0.1:${port}/tests/fixtures/flow-gpu.html`));

