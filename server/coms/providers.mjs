/** Explicit private adapter contracts; no discovery/probe/dispatch at startup. */
export class HermesJarvisAdapters{
 constructor(config={}){this.config=config;this.hermesReady=Boolean(config.hermes?.verified&&config.hermes?.origin&&config.hermes?.token?.length>=32);this.jarvisReady=Boolean(config.jarvis?.verifiedReadOnly&&config.jarvis?.origin&&config.jarvis?.token?.length>=32&&config.jarvis?.model);}
 describe(){return {hermes:{state:this.hermesReady?'configured_not_probed':'blocked',contract:'HERMES REST task bridge; media not implied',live_dial:false},jarvis:{state:this.jarvisReady?'configured_not_probed':'blocked',contract:'OpenAI-shaped JSON/text; not browser audio'}};}
 endpoint(value){const u=new URL(value);if(u.username||u.password||u.search||u.hash||!['http:','https:'].includes(u.protocol)||u.pathname!=='/')throw Error('exact private base origin required');if(u.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(u.hostname))throw Error('non-loopback adapter requires HTTPS/private routing');return u.origin;}
 async request(config,route,body){
  if(!config?.verified||typeof config.token!=='string'||config.token.length<32)throw Error('adapter contract/auth unverified');
  const base=this.endpoint(config.origin),response=await fetch(base+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(5000)});
  if(!response.ok){await response.body?.cancel();throw Error('adapter HTTP '+response.status);}
  const chunks=[];let size=0;
  for await(const chunk of response.body||[]){size+=chunk.byteLength;if(size>16384)throw Error('adapter response too large');chunks.push(Buffer.from(chunk));}
  return JSON.parse(Buffer.concat(chunks,size).toString('utf8'));
 }
 capabilities(){return this.request(this.config.hermes,'/v1/capabilities');}
 status(task){if(!/^[A-Za-z0-9_.-]{1,100}$/.test(task))throw Error('task identifier denied');return this.request(this.config.hermes,'/v1/tasks/'+encodeURIComponent(task));}
 submitMock(job){if(job.operation!=='call.mock')throw Error('live action denied');return this.request(this.config.hermes,'/v1/tasks',job);}
 cancel(){throw Error('HERMES cancellation endpoint not verified; no request sent');}
 async askJarvis(prompt){if(!this.jarvisReady)throw Error('read-only Jarvis unverified');const c={...this.config.jarvis,verified:true};const r=await this.request(c,'/v1/chat/completions',{model:c.model,stream:false,messages:[{role:'system',content:'Draft only. No tools, external actions or unverified commercial claims.'},{role:'user',content:prompt}]});const content=r.choices?.[0]?.message?.content;if(typeof content!=='string'||content.length>8000)throw Error('Jarvis response shape invalid');return {state:'needs_review',source:'jarvis',text:content,canonical_write:false};}
}
