import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {HermesJarvisAdapters} from './providers.mjs';

async function fixture(run, handler){
 const requests=[];const server=http.createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;requests.push({url:req.url,auth:req.headers.authorization,body:raw?JSON.parse(raw):null});handler(req,res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const adapters=new HermesJarvisAdapters({hermes:{origin,token:'fixture-only-request-secret-32-characters',verified:true},jarvis:{origin,token:'fixture-only-jarvis-secret-32-characters',verifiedReadOnly:true,model:'fixture-text-model'}});
 try{await run(adapters,requests);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
const json=(res,value)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};

test('actual loopback requests carry scoped auth and correlated mock IDs',async()=>fixture(async(a,r)=>{
 await a.capabilities();await a.status('assigned-task');const out=await a.submitMock({operation:'call.mock',task_id:'assigned-task',call_id:'assigned-call',tenant_id:'fixture-tenant',client_id:'fixture-client'});
 assert.equal(out.task_id,'assigned-task');assert.deepEqual(r.map(x=>x.url),['/v1/capabilities','/v1/tasks/assigned-task','/v1/tasks']);assert.ok(r.every(x=>x.auth==='Bearer fixture-only-request-secret-32-characters'));assert.equal(r[2].body.call_id,'assigned-call');
},(req,res)=>json(res,req.url==='/v1/tasks'?{task_id:'assigned-task'}:{state:'synthetic'})));

test('live requests and unverified cancellation never reach HTTP server',async()=>fixture(async(a,r)=>{
 assert.throws(()=>a.submitMock({operation:'call.request'}),/live action denied/);assert.throws(()=>a.cancel(),/not verified/);assert.equal(r.length,0);
},(_,res)=>json(res,{})));

test('HTTP errors are reported once without retry or upstream body leakage',async()=>fixture(async(a,r)=>{
 await assert.rejects(a.capabilities(),e=>e.message==='adapter HTTP 503');assert.equal(r.length,1);
},(_,res)=>{res.statusCode=503;res.end('private upstream diagnostics');}));

test('redirects are not followed to a different task or credential destination',async()=>fixture(async(a,r)=>{
 await assert.rejects(a.capabilities());assert.equal(r.length,1);
},(_,res)=>{res.statusCode=302;res.setHeader('Location','/unexpected');res.end();}));

test('Jarvis uses JSON text contract without delegated tools and returns review proposal',async()=>fixture(async(a,r)=>{
 const out=await a.askJarvis('Synthetic draft only');assert.equal(out.canonical_write,false);assert.equal(out.state,'needs_review');assert.equal(r[0].url,'/v1/chat/completions');assert.equal(r[0].body.stream,false);assert.equal(r[0].body.model,'fixture-text-model');assert.equal(r[0].body.tools,undefined);assert.equal(r[0].body.messages[1].content,'Synthetic draft only');
},(_,res)=>json(res,{choices:[{message:{content:'Fixture draft'}}]})));

test('UTF-8 byte limit rejects oversized multibyte JSON, not just character count',async()=>fixture(async a=>{
 await assert.rejects(a.capabilities(),/adapter response too large/);
},(_,res)=>json(res,{value:'🤖'.repeat(5000)})));

test('oversized streaming response is rejected before consuming its remainder',async()=>{
 let finished=false,timer;
 try{await fixture(async a=>{await assert.rejects(a.capabilities(),/adapter response too large/);assert.equal(finished,false);},(_,res)=>{res.setHeader('Content-Type','application/json');res.write('{"value":"'+'x'.repeat(20000));timer=setTimeout(()=>{finished=true;res.end('"}');},250);});}finally{clearTimeout(timer);}
});
