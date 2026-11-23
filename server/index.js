import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Gateway,tmuxArgs} from './coms/gateway.mjs';
import {configuration} from './coms/configuration.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PORT=Number(process.env.PORT)||4000,HOST=process.env.HOST||'127.0.0.1';
const config=configuration(process.env.COMS_ORIGIN||'http://127.0.0.1:'+PORT,ROOT);
const gateway=new Gateway(config),app=express();
app.disable('x-powered-by');

// No wildcard CORS, repo-root static serving, or startup agent/model probes.
app.use((req,res,next)=>{
 if(req.url.startsWith('/api/coms')||req.url.startsWith('/coms/')){void gateway.handle(req,res);return;}
 try{gateway.host(req);if(req.headers.origin&&req.headers.origin!==gateway.origin)throw Error('origin denied');next();}
 catch{res.status(403).json({error:'host/origin denied'});}
});
app.get(['/', '/dashboard.html'],(req,res)=>res.sendFile(path.join(ROOT,'dashboard.html')));
app.get('/hero-bg.png',(req,res)=>res.sendFile(path.join(ROOT,'hero-bg.png')));
app.get('/api/health',(req,res)=>res.json({status:'ok',legacy_operator_enabled:config.legacyEnabled,live_calls:false}));
app.get('/talk-preview/',(req,res)=>res.type('html').send('<meta name="viewport" content="width=device-width"><h1>Browser Talk is a separate media path</h1><p>For the isolated local demo, run <code>python3 apps/darkdesk-talk/server.py --port 0</code> and open its printed loopback URL. No process or microphone starts from this link. Live audio is not connected.</p><a href="/coms/">Back to CRM</a>'));

// Legacy tool/control routes are opt-in AND operator-authenticated. Synthetic
// Coms sessions never inherit shell, sandbox, wallet or broad MCP authority.
app.use('/api',(req,res,next)=>{try{gateway.legacyGuard(req);next();}catch(e){res.status(e.status||403).json({error:e.message});}});
app.use(express.json({limit:'8kb',strict:true}));

if(config.legacyEnabled){
 const load=async name=>(await import(name)).default;
 const [CashclawAgent,HermesAgent,OpenHumanAgent,CursorAgent,FarmAgent,AgentOrchestrator,SandboxManager,MCPServer,LLMMesh]=await Promise.all(['./agents/cashclaw.js','./agents/hermes.js','./agents/openhuman.js','./agents/cursor.js','./agents/farm.js','./lib/orchestrator.js','./lib/sandbox.js','./lib/mcp.js','./lib/llm-mesh.js'].map(load));
 const agents={cashclaw:new CashclawAgent(),hermes:new HermesAgent(),openhuman:new OpenHumanAgent(),cursor:new CursorAgent(),farm:new FarmAgent()};
 const orchestrator=new AgentOrchestrator();Object.values(agents).forEach(a=>orchestrator.register(a));
 const sandbox=new SandboxManager();orchestrator.sandboxManager=sandbox;
 const mesh=new LLMMesh();if(process.env.COMS_ALLOW_MODEL_PROBE==='1')await mesh.scan();
 const mcp=new MCPServer(orchestrator,sandbox,mesh);
 const routes=[['agents',agents],['status',agents],['orchestrate',orchestrator],['sandbox',sandbox],['mcp',mcp],['llm-mesh',mesh]];
 for(const [route,dependency] of routes){const factory=await load('./routes/'+route+'.js');app.use('/api/'+route,factory(dependency));}
 app.use('/api/network',(await load('./routes/network.js'))());
 app.post('/api/tmux',async(req,res)=>{
  try{const args=tmuxArgs(req.body);await promisify(execFile)('tmux',args,{timeout:5000,maxBuffer:16384});res.json({state:'sent_to_operator_window',execution_verified:false});}
  catch(e){res.status(e.status||503).json({error:e.status?e.message:'tmux unavailable; no durable queue or execution confirmed'});}
 });
}
app.use((req,res)=>res.status(404).json({error:'route not found'}));
app.use((err,req,res,next)=>res.status(400).json({error:'request rejected'}));
app.listen(PORT,HOST,()=>console.log(JSON.stringify({service:'Linux StudEx + Coms',host:HOST,port:PORT,legacy_enabled:config.legacyEnabled,live_calls:false})));
