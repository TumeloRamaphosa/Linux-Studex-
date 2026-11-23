import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {HermesJarvisAdapters} from './providers.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
export const STUDBUD='6af7dcfdb7fe32e3c836c7a1';
export const stable=x=>JSON.stringify(x&&typeof x==='object'?Array.isArray(x)?x.map(v=>JSON.parse(stable(v))):Object.fromEntries(Object.keys(x).sort().map(k=>[k,JSON.parse(stable(x[k]))])):x);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const same=(a,b)=>{const x=Buffer.from(hash(a)),y=Buffer.from(hash(b));return crypto.timingSafeEqual(x,y);};
const id=()=>crypto.randomUUID();
export class Denied extends Error{constructor(status,message){super(message);this.status=status;}}
function need(ok,status,message){if(!ok)throw new Denied(status,message);}
function fields(x,keys){need(x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join('|')===[...keys].sort().join('|'),400,'unexpected or missing fields');}
function ident(x){need(typeof x==='string'&&/^[A-Za-z0-9_.-]{1,100}$/.test(x),400,'bounded identifier required');return x;}
function text(x,max=500){need(typeof x==='string'&&x.trim().length>0&&x.length<=max,400,'bounded text required');return x.trim();}
function scopeKey(s){return s.tenant_id+':'+s.client_id;}
function cookie(req){return (req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('coms_session='))?.slice(13)||'';}
export function tmuxArgs(body){fields(body,['command','window']);text(body.command,2000);need(['main','cashclaw','hermes','openhuman','cursor','farm'].includes(body.window),400,'operator window denied');need(!body.command.includes('\0'),400,'invalid command');return ['send-keys','-t','linux-studex:'+body.window,'--',body.command,'Enter'];}

export class Journal{
 constructor(file){this.file=file;this.state={version:1,requests:{},drafts:{},tasks:{},calls:{},events:{}};if(file&&fs.existsSync(file)){need(!fs.lstatSync(file).isSymbolicLink(),500,'journal symlink denied');const s=JSON.parse(fs.readFileSync(file,'utf8'));need(s.version===1,500,'journal version unsupported');this.state=s;}}
 change(fn){const next=structuredClone(this.state),result=fn(next);const raw=stable(next);need(raw.length<=2_000_000,503,'journal capacity reached');if(this.file){fs.mkdirSync(path.dirname(this.file),{recursive:true,mode:0o700});const tmp=this.file+'.'+id()+'.tmp';const fd=fs.openSync(tmp,'wx',0o600);try{fs.writeFileSync(fd,raw);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(tmp,this.file);}this.state=next;return structuredClone(result);}
}
export class Gateway{
 constructor({origin,store,demo=false,operatorSecret='',scope={tenant_id:'synthetic-team',client_id:'synthetic-client'},clock=()=>Date.now(),adapters=null,callbackKey='',callbackSource='hermes-configured',legacyEnabled=false}={}){
  need(typeof origin==='string'&&/^https?:\/\//.test(origin),500,'operator origin required');Object.values(scope).forEach(ident);
  this.origin=origin;this.demo=demo;this.secret=operatorSecret;this.scope=Object.freeze({...scope});this.clock=clock;this.sessions=new Map();this.logins=new Map();this.journal=new Journal(store);this.adapters=adapters||new HermesJarvisAdapters();this.callbackKey=callbackKey;this.callbackSource=callbackSource;this.legacyEnabled=legacyEnabled;
 }
 setOrigin(origin){this.origin=origin;}
 host(req){need(req.headers.host===new URL(this.origin).host,403,'host denied');}
 originCheck(req){this.host(req);need(req.headers.origin===this.origin,403,'origin denied');}
 login(req,body){
  this.originCheck(req);const ip=req.socket?.remoteAddress||'unknown',now=this.clock(),attempts=(this.logins.get(ip)||[]).filter(t=>t>now-60_000);need(attempts.length<5,429,'login rate limited');this.logins.set(ip,[...attempts,now]);need(this.logins.size<=100,503,'login capacity');
  let role;
  if(body?.mode==='demo'){fields(body,['mode']);need(this.demo&&['127.0.0.1','localhost','[::1]'].includes(new URL(this.origin).hostname)&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip),403,'synthetic preview disabled');role='demo';}
  else{fields(body,['mode','secret']);need(body.mode==='operator'&&this.secret.length>=32&&typeof body.secret==='string'&&same(body.secret,this.secret),401,'operator authorization required');role='operator';}
  for(const [k,s] of this.sessions)if(s.expires<=now)this.sessions.delete(k);need(this.sessions.size<100,429,'session limit');
  const token=crypto.randomBytes(32).toString('hex'),csrf=crypto.randomBytes(24).toString('hex');this.sessions.set(hash(token),{csrf,role,scope:this.scope,expires:now+900_000});return {token,csrf,role,scope:this.scope};
 }
 authorize(req,{mutating=false,operatorOnly=false}={}){
  this.host(req);if(req.headers.origin)need(req.headers.origin===this.origin,403,'origin denied');
  const bearer=(req.headers.authorization||'').startsWith('Bearer ')?req.headers.authorization.slice(7):'';
  if(bearer&&this.secret.length>=32&&same(bearer,this.secret))return {role:'operator',scope:this.scope,csrf:null};
  const s=this.sessions.get(hash(cookie(req)));need(s&&s.expires>this.clock(),401,'session required');
  if(operatorOnly)need(s.role==='operator',403,'operator role required');
  if(mutating){this.originCheck(req);need(typeof req.headers['x-coms-csrf']==='string'&&same(req.headers['x-coms-csrf'],s.csrf),403,'CSRF required');}return s;
 }
 legacyGuard(req){need(this.legacyEnabled,423,'legacy operator controls disabled');return this.authorize(req,{mutating:!['GET','HEAD'].includes(req.method),operatorOnly:true});}
 operation(scope,request,kind,body,work){ident(request);const key=scopeKey(scope)+':'+request,digest=hash(stable({kind,body}));return this.journal.change(s=>{const old=s.requests[key];if(old){need(old.digest===digest,409,'idempotency conflict');return old.result;}need(Object.keys(s.requests).length<1000,503,'request capacity');const result=work(s);s.requests[key]={digest,result};return result;});}
 owned(table,key,scope){const r=table[key];need(r&&r.scope===scopeKey(scope),404,'assigned record not found');return r;}
 clients(scope){return this.demo?[{id:'fixture-studbud',name:'Example StudBud enquiry (synthetic)',company:'Example Company',stage:'Inquiry',source:'fixture:studbud-member',source_app_id:STUDBUD,source_verified:false,scope:scopeKey(scope)}]:[];}
 descriptor(){return {studbud:{app_id:STUDBUD,sync:'not_connected',url:'https://app.base44.com/apps/'+STUDBUD+'/editor/preview',authority:'Existing Members/Consents/Courses; no record dump or write connector'},...this.adapters.describe(),browser_voice:{state:'separate_demo_available',live_verified:false,path:'/talk-preview/'},cashclaw:{state:'repo_agent_definition_only',marketplace_enabled:false}};}
 snapshot(scope){const s=this.journal.state,select=t=>Object.values(t).filter(x=>x.scope===scopeKey(scope));return {mode:this.demo?'synthetic-preview':'operator-staging',clients:this.clients(scope),drafts:select(s.drafts),tasks:select(s.tasks),calls:select(s.calls),...this.descriptor()};}
 onboarding(scope,b){fields(b,['request_id','name','intent']);text(b.name,120);text(b.intent);return this.operation(scope,b.request_id,'onboarding',b,s=>{const task_id='os-'+id(),r={id:'draft-'+id(),task_id,scope:scopeKey(scope),name:b.name,intent:b.intent,state:'needs_review',canonical_write:false,source_app_id:STUDBUD,source:'operator_proposal',created_at:new Date(this.clock()).toISOString()};s.drafts[r.id]=r;s.tasks[task_id]={id:task_id,scope:r.scope,operation:'onboarding.review',state:'needs_review',source:'local-staging',canonical_task_id:null,result_ref:r.id};return r;});}
 createCall(scope,b){fields(b,['request_id','mode','client_ref']);need(b.mode==='mock',423,'live dialing disabled');need(this.clients(scope).some(x=>x.id===b.client_ref),400,'client projection not verified/available');return this.operation(scope,b.request_id,'call.mock',b,s=>{const task_id='os-'+id(),call_id='call-'+id();const r={id:call_id,task_id,scope:scopeKey(scope),client_ref:b.client_ref,mode:'mock',state:'ringing',source:'local-mock',history:[{state:'ringing',at:new Date(this.clock()).toISOString()}]};s.calls[call_id]=r;s.tasks[task_id]={id:task_id,call_id,scope:r.scope,operation:'call.mock',state:'running',source:'local-mock',canonical_task_id:null,callback_seq:0};return r;});}
 control(scope,key,b){fields(b,['request_id','action']);return this.operation(scope,b.request_id,'call.control:'+key,b,s=>{const r=this.owned(s.calls,key,scope);need(r.mode==='mock'&&s.tasks[r.task_id].source==='local-mock',423,'remote/live controls unavailable');need(!['ended','cancelled'].includes(r.state),409,'call already terminal');if(b.action==='connect'){need(r.state==='ringing',409,'invalid call transition');r.state='connected';}else if(b.action==='end')r.state='ended';else throw new Denied(400,'control denied');r.history.push({state:r.state,at:new Date(this.clock()).toISOString()});s.tasks[r.task_id].state=r.state==='ended'?'needs_review':'running';return r;});}
 cancel(scope,key,b){fields(b,['request_id']);return this.operation(scope,b.request_id,'task.cancel:'+key,b,s=>{const t=this.owned(s.tasks,key,scope);need(t.source==='local-mock'||t.source==='local-staging',423,'remote cancel contract unverified; not cancelled');need(!['completed','cancelled'].includes(t.state),409,'task already terminal');t.state='cancelled';if(t.call_id){const c=this.owned(s.calls,t.call_id,scope);need(c.state!=='ended',409,'call already ended');c.state='cancelled';c.history.push({state:'cancelled',at:new Date(this.clock()).toISOString()});}return t;});}
 async dispatchMock(scope,key,b){
  fields(b,['request_id']);need(this.adapters.config.hermes?.verified,423,'HERMES contract/auth not verified');
  const requestKey=scopeKey(scope)+':'+ident(b.request_id),existing=this.journal.state.requests[requestKey];
  const digest=hash(stable({kind:'hermes.dispatch:'+key,body:b}));
  if(existing){need(existing.digest===digest,409,'idempotency conflict');return existing.result;}
  const attempt=this.operation(scope,b.request_id,'hermes.dispatch:'+key,b,s=>{const t=this.owned(s.tasks,key,scope);need(t.operation==='call.mock'&&t.source==='local-mock'&&t.state==='running'&&s.calls[t.call_id].history.length===1,423,'only assigned undispatched mock tasks');t.source='hermes-dispatched';t.state='dispatching';t.approved_refs={'coms-mock-policy':hash('Synthetic mock call. No real audio or customer action.')};return {task_id:key,call_id:t.call_id,state:'dispatching'};});
  try{const remote=await this.adapters.submitMock({operation:'call.mock',task_id:key,call_id:attempt.call_id,tenant_id:scope.tenant_id,client_id:scope.client_id});need(remote.task_id===key,502,'remote task correlation failed');return this.journal.change(s=>{const t=s.tasks[key];if(!t.callback_seq)t.state='awaiting_verified_result';const r={...attempt,state:t.state,source:'hermes-mock',real_call:false};s.requests[requestKey].result=r;return r;});}
  catch{return this.journal.change(s=>{const t=s.tasks[key];if(!t.callback_seq)t.state='unknown';const r={...attempt,state:t.state,next_action:'Reconcile assigned task status; do not resubmit or redial.'};s.requests[requestKey].result=r;return r;});}
 }
 acceptCallback(raw,signature){
  need(this.callbackKey.length>=32,423,'callback key/contract not configured');need(Buffer.isBuffer(raw)&&raw.length<=8192,400,'bounded raw callback required');
  const expected='sha256='+crypto.createHmac('sha256',this.callbackKey).update(raw).digest('hex');need(typeof signature==='string'&&/^sha256=[0-9a-f]{64}$/.test(signature)&&same(signature,expected),401,'invalid callback signature');
  const x=JSON.parse(raw);fields(x,['source_id','tenant_id','client_id','task_id','call_id','event_id','seq','state','sent_at','result']);
  need(x.source_id===this.callbackSource&&x.tenant_id===this.scope.tenant_id&&x.client_id===this.scope.client_id,403,'callback scope mismatch');
  ident(x.event_id);need(Number.isInteger(x.sent_at)&&Math.abs(this.clock()/1000-x.sent_at)<=300,400,'stale callback');need(Number.isInteger(x.seq)&&x.seq>0,400,'callback sequence invalid');
  need(['started','progress','completed','failed','cancelled'].includes(x.state),400,'callback state invalid');fields(x.result,['summary','citations']);text(x.result.summary,1000);need(x.result.citations&&typeof x.result.citations==='object'&&!Array.isArray(x.result.citations)&&Object.keys(x.result.citations).length<=5,400,'citations invalid');
  const {sent_at,...immutable}=x,digest=hash(stable(immutable)),eventKey=scopeKey(this.scope)+':'+x.event_id;
  return this.journal.change(s=>{
   const t=this.owned(s.tasks,x.task_id,this.scope);need(t.source==='hermes-dispatched'&&t.call_id===x.call_id,403,'unassigned callback');
   need(Object.entries(x.result.citations).every(([k,v])=>t.approved_refs?.[k]===v),400,'source version mismatch');
   if(s.events[eventKey]){need(s.events[eventKey].digest===digest,409,'callback replay conflict');return s.events[eventKey].receipt;}
   need(!['completed','failed','cancelled'].includes(t.remote_state),409,'remote task terminal');need(x.seq===t.callback_seq+1&&(t.callback_seq!==0||x.state==='started')&&(t.callback_seq===0||x.state!=='started'),409,'callback lifecycle/order');
   if(x.state==='completed')need(Object.keys(x.result.citations).length>0,400,'completion evidence required');
   t.callback_seq=x.seq;t.remote_state=x.state;t.state=['completed','failed','cancelled'].includes(x.state)?'needs_review':'running';t.result={summary:x.result.summary,citations:x.result.citations,review_state:'pending_review'};
   const call=this.owned(s.calls,x.call_id,this.scope);call.source='hermes-bridge-mock';call.reported_state=x.state;call.history.push({state:'reported_'+x.state,source:'signed-mock-result',at:new Date(this.clock()).toISOString()});
   const receipt={event_id:x.event_id,task_id:x.task_id,call_id:x.call_id,projection:'pending_review',real_call:false,canonical_write:false,digest};s.events[eventKey]={digest,receipt};return receipt;
  });
 }
 async jarvis(scope,b){
  fields(b,['request_id','task_id','text']);need(this.adapters.jarvisReady,423,'Jarvis read-only contract/credential unverified');text(b.text);this.owned(this.journal.state.tasks,b.task_id,scope);
  const key=scopeKey(scope)+':'+ident(b.request_id),digest=hash(stable({kind:'jarvis:'+b.task_id,body:b})),old=this.journal.state.requests[key];
  if(old){need(old.digest===digest,409,'idempotency conflict');return old.result;}
  this.operation(scope,b.request_id,'jarvis:'+b.task_id,b,()=>({task_id:b.task_id,state:'requesting',source:'jarvis'}));
  try{const result=await this.adapters.askJarvis(b.text);return this.journal.change(s=>{const r={...result,task_id:b.task_id};s.requests[key].result=r;s.tasks[b.task_id].result={...r,review_state:'pending_review'};return r;});}
  catch{return this.journal.change(s=>{const r={task_id:b.task_id,state:'unknown',source:'jarvis',next_action:'Reconcile request; no automatic inference retry.'};s.requests[key].result=r;return r;});}
 }
 async handle(req,res){
  const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));};
  try{
   this.host(req);const route=req.url.split('?')[0];
   if(req.method==='GET'&&['/coms/','/coms/app.js','/coms/style.css'].includes(route)){const name=route==='/coms/'?'index.html':route.split('/').at(-1);res.setHeader('Content-Type',name.endsWith('js')?'text/javascript':name.endsWith('css')?'text/css':'text/html');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'");res.end(fs.readFileSync(path.join(HERE,'public',name)));return;}
   let raw=Buffer.alloc(0),body;
   if(req.method==='POST'){need(!req.headers['transfer-encoding']&&Number(req.headers['content-length'])>0&&Number(req.headers['content-length'])<=8192,400,'bounded body required');for await(const part of req){raw=Buffer.concat([raw,part]);need(raw.length<=8192,400,'body too large');}body=JSON.parse(raw);}
   if(route==='/api/coms/session'&&req.method==='POST'){const s=this.login(req,body);res.setHeader('Set-Cookie','coms_session='+s.token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=900'+(this.origin.startsWith('https:')?'; Secure':''));reply(201,{csrf:s.csrf,role:s.role,scope:s.scope});return;}
   if(route==='/api/coms/callbacks/hermes'&&req.method==='POST'){reply(202,this.acceptCallback(raw,req.headers['x-studex-signature']));return;}
   const actor=this.authorize(req,{mutating:req.method!=='GET'}),scope=actor.scope;
   if(route==='/api/coms/session'&&req.method==='GET'){reply(200,{csrf:actor.csrf,role:actor.role,scope});return;}
   if(route==='/api/coms/snapshot'&&req.method==='GET'){reply(200,this.snapshot(scope));return;}
   if(route==='/api/coms/adapters'&&req.method==='GET'){reply(200,this.descriptor());return;}
   if(route==='/api/coms/onboarding'&&req.method==='POST'){reply(201,this.onboarding(scope,body));return;}
   if(route==='/api/coms/calls'&&req.method==='POST'){reply(201,this.createCall(scope,body));return;}
   let m=route.match(/^\/api\/coms\/calls\/([A-Za-z0-9_.-]+)\/control$/);if(m&&req.method==='POST'){reply(200,this.control(scope,m[1],body));return;}
   m=route.match(/^\/api\/coms\/tasks\/([A-Za-z0-9_.-]+)\/cancel$/);if(m&&req.method==='POST'){reply(200,this.cancel(scope,m[1],body));return;}
   m=route.match(/^\/api\/coms\/tasks\/([A-Za-z0-9_.-]+)$/);if(m&&req.method==='GET'){reply(200,this.owned(this.journal.state.tasks,m[1],scope));return;}
   m=route.match(/^\/api\/coms\/tasks\/([A-Za-z0-9_.-]+)\/dispatch$/);if(m&&req.method==='POST'){need(actor.role==='operator',403,'operator role required');reply(200,await this.dispatchMock(scope,m[1],body));return;}
   if(route==='/api/coms/jarvis'&&req.method==='POST'){reply(200,await this.jarvis(scope,body));return;}
   reply(404,{error:'route not found'});
  }catch(e){reply(e.status||400,{error:e.status?e.message:'request rejected'});}
 }
}
