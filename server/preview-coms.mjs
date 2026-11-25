/** Dependency-free OS+CRM review host. Does NOT import legacy agents/sandbox. */
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {Gateway} from './coms/gateway.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');let gateway;
const server=http.createServer((req,res)=>{
 if(req.url==='/'||req.url==='/dashboard.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(path.join(ROOT,'dashboard.html')));return;}
 if(req.url==='/hero-bg.png'){const p=path.join(ROOT,'hero-bg.png');if(fs.existsSync(p)){res.setHeader('Content-Type','image/png');res.end(fs.readFileSync(p));return;}}
 if(req.url==='/talk-preview/'){res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width"><h1>Browser Talk is separate</h1><p>Run <code>python3 apps/darkdesk-talk/server.py --port 0</code> in this review checkout and open the printed loopback URL. It is a consent/session demo, not live voice. No automatic process or microphone start.</p><a href="/">Back to OS CRM</a>');return;}
 if(req.url.startsWith('/api/')&&!req.url.startsWith('/api/coms')){res.writeHead(423,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'legacy controls disabled in synthetic preview'}));return;}
 gateway.handle(req,res);
});
server.listen(Number(process.env.COMS_PREVIEW_PORT)||0,'127.0.0.1',()=>{const origin='http://127.0.0.1:'+server.address().port;gateway=new Gateway({origin,store:path.join(ROOT,'server/coms/.state/preview.json'),demo:true});const r={preview_url:origin,dashboard:origin+'/dashboard.html',crm:origin+'/coms/',mode:'synthetic-preview',legacy_enabled:false,live_calls:false,pid:process.pid};fs.mkdirSync(path.join(ROOT,'server/coms/.state'),{recursive:true,mode:0o700});fs.writeFileSync(path.join(ROOT,'server/coms/.state/preview-running.json'),JSON.stringify(r,null,2),{mode:0o600});console.log(JSON.stringify(r));});
