const fs=require('fs'),vm=require('vm'),{execFileSync}=require('child_process'),{performance}=require('perf_hooks');
const matter=fs.readFileSync('dist/vendor/matter.min.js','utf8');
function bench(source){const c={console,window:{},performance};vm.createContext(c);vm.runInContext(matter,c);vm.runInContext(source,c);return vm.runInContext(`
(()=>{const d={id:1,color:0,shape:0,drawRadius:25,radius:25,aspect:1,x:180,y:210,seed:0},columns=[[d]],world=new GemPhysics();world.reset(columns);world.settle();let updates=0;const update=Matter.Engine.update;Matter.Engine.update=(...args)=>{updates++;return update(...args)};const start=performance.now();for(let i=0;i<3000;i++)world.step(100+i*1000/60,columns);return{updates,ms:performance.now()-start};})()
`,c);}
const before=bench(execFileSync('git',['show','HEAD:dist/physics.js'],{encoding:'utf8'})),after=bench(fs.readFileSync('dist/physics.js','utf8'));
if(after.updates!==0||before.updates<1000)throw Error('Settled world kept simulating');
console.log(JSON.stringify({idlePhysics:{before,after}},null,2));
const context={console,window:{},self:null};context.self=context;vm.createContext(context);context.importScripts=(...paths)=>{for(const path of paths)vm.runInContext(fs.readFileSync('dist/'+path,'utf8'),context);};let reply;context.postMessage=value=>{reply=value};vm.runInContext(fs.readFileSync('dist/level-worker.js','utf8'),context);vm.runInContext('self.onmessage({data:{id:42,level:1}})',context);if(reply?.id!==42||reply.error||reply.data?.total!==29)throw Error('Level worker failed');console.log('PASS: zero idle physics updates; actual worker entrypoint generates a valid level.');
