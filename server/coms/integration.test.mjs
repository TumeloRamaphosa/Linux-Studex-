import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Gateway,tmuxArgs} from './gateway.mjs';

async function fixture(run,options={}){
 const dir=mkdtempSync(path.join(tmpdir(),'coms-os-'));let gateway;
 const server=http.createServer((q,s)=>gateway.handle(q,s));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;gateway=new Gateway({origin,store:path.join(dir,'journal.json'),demo:true,...options});
 let cookie='',csrf='';
 async function api(route,body,extra={}){const response=await fetch(origin+route,{method:body===undefined?'GET':'POST',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json',...(csrf?{'X-Coms-CSRF':csrf}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,data,headers:response.headers};}
 const login=async()=>{const r=await api('/api/coms/session',{mode:'demo'});csrf=r.data.csrf;return r;};
 try{await run({gateway,origin,api,login,dir});}finally{server.closeAllConnections();await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});}
}
test('CRM requires scoped session and HttpOnly cookie',()=>fixture(async({api,login})=>{
 assert.equal((await api('/api/coms/snapshot')).status,401);const r=await login();assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);assert.equal((await api('/api/coms/snapshot')).data.studbud.sync,'not_connected');
}));
test('wrong origin and absent CSRF cannot mutate',()=>fixture(async({api,login})=>{
 await login();assert.equal((await api('/api/coms/onboarding',{request_id:'a',name:'Example',intent:'demo'},{Origin:'https://evil.invalid'})).status,403);
 assert.equal((await api('/api/coms/onboarding',{request_id:'a',name:'Example',intent:'demo'},{'X-Coms-CSRF':''})).status,403);
}));
test('onboarding is idempotent draft, not membership mutation',()=>fixture(async({api,login})=>{
 await login();const body={request_id:'draft-1',name:'Example',intent:'demo'};const a=await api('/api/coms/onboarding',body),b=await api('/api/coms/onboarding',body);assert.equal(a.status,201);assert.equal(a.data.id,b.data.id);assert.equal(a.data.state,'needs_review');assert.equal((await api('/api/coms/onboarding',{...body,intent:'changed'})).status,409);
 assert.equal((await api('/api/coms/onboarding',{...body,tenant_id:'other'})).status,400);
}));
test('mock phone lifecycle and task/call IDs persist and deduplicate',()=>fixture(async({api,login,gateway,origin,dir})=>{
 await login();const a=await api('/api/coms/calls',{request_id:'call-1',mode:'mock',client_ref:'fixture-studbud'});assert.equal(a.status,201);const id=a.data.id;assert.equal(a.data.mode,'mock');
 const step={request_id:'step-1',action:'connect'};assert.equal((await api('/api/coms/calls/'+id+'/control',step)).data.state,'connected');
 assert.equal((await api('/api/coms/calls/'+id+'/control',step)).data.state,'connected');
 assert.equal((await api('/api/coms/calls/'+id+'/control',{request_id:'step-2',action:'end'})).data.state,'ended');
 const g=new Gateway({origin,store:path.join(dir,'journal.json'),demo:true});assert.equal(g.journal.state.calls[id].task_id,a.data.task_id);
}));
test('live request and foreign call denied with no dispatch',()=>fixture(async({api,login})=>{
 await login();assert.equal((await api('/api/coms/calls',{request_id:'x',mode:'live',client_ref:'fixture-studbud'})).status,423);
 assert.equal((await api('/api/coms/calls/not-owned/control',{request_id:'x',action:'end'})).status,404);
}));
test('task cancellation is real for local work and never fakes remote cancel',()=>fixture(async({api,login})=>{
 await login();const a=(await api('/api/coms/calls',{request_id:'cancel-1',mode:'mock',client_ref:'fixture-studbud'})).data;
 const r=await api('/api/coms/tasks/'+a.task_id+'/cancel',{request_id:'cancel-2'});assert.equal(r.data.state,'cancelled');assert.equal((await api('/api/coms/snapshot')).data.calls[0].state,'cancelled');
}));
test('Jarvis/HERMES are blocked until verified configured adapters exist',()=>fixture(async({api,login})=>{
 await login();assert.equal((await api('/api/coms/jarvis',{request_id:'jarvis-1',task_id:'unknown',text:'test'})).status,423);
 const r=await api('/api/coms/adapters');assert.equal(r.data.hermes.state,'blocked');assert.equal(r.data.jarvis.state,'blocked');assert.equal(r.data.browser_voice.live_verified,false);
}));
test('non-demo login needs actual operator secret, no default auth',()=>fixture(async({api})=>{
 assert.equal((await api('/api/coms/session',{mode:'operator',secret:'wrong'})).status,401);
}, {demo:false,operatorSecret:'a'.repeat(40)}));
test('operator cannot choose arbitrary tenant/source identity',()=>fixture(async({api,login})=>{
 await login();assert.equal((await api('/api/coms/session',{mode:'demo',tenant_id:'other'})).status,400);
 assert.equal((await api('/api/coms/calls',{request_id:'c',mode:'mock',client_ref:'someone-else'})).status,400);
}));
test('tmux arguments preserve literal shell text and restrict destination',()=>{
 const args=tmuxArgs({command:'echo $(not-executed); `also-literal`',window:'main'});assert.equal(args.at(-2),'echo $(not-executed); `also-literal`');assert.equal(args[0],'send-keys');assert.throws(()=>tmuxArgs({command:'x',window:'main; bad'}));
});
