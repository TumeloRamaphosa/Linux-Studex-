"""Small preview session boundary; live media/provider routes fail closed.

Reuses existing Coms signed receiver. No customer identity or provider secrets
are accepted from the browser. This is not a production public session broker.
"""
import hashlib,hmac,json,secrets,sys,threading,time,uuid
from pathlib import Path
from bridge.hermes_receiver import Receiver,sign

KNOWLEDGE='Preview only. No approved prices, customer action, external inference or live voice.'
REFS={'darkdesk-demo-knowledge':hashlib.sha256(KNOWLEDGE.encode()).hexdigest()}
class Denied(ValueError):pass
class Sessions:
    def __init__(self,path,origin,clock=time.time):
        self.origin=origin;self.clock=clock;self.sessions={};self.starts=[];self.lock=threading.RLock()
        self.key=secrets.token_bytes(32)
        self.principal={'source_id':'darkdesk-preview','tenant_id':'synthetic-tenant','client_id':'synthetic-client'}
        self.receiver=Receiver(path,self.principal,self.key,clock=clock)
    def create(self,origin,body):
        with self.lock:
            if origin!=self.origin:raise Denied('origin denied')
            if not isinstance(body,dict) or set(body)!={'mode','audio_consent','summary_consent','lead_consent'}:raise Denied('explicit scoped consent fields required')
            if body['mode']!='demo' or any(type(body[k]) is not bool for k in ('audio_consent','summary_consent','lead_consent')) or body['lead_consent']:raise Denied('only demo; no lead enrolment or live media')
            now=self.clock();self.starts=[t for t in self.starts if t>now-60]
            self.sessions={k:v for k,v in self.sessions.items() if v['created']>now-600}
            if len(self.starts)>=5 or sum(not x['ended'] and x['expires']>now for x in self.sessions.values())>=2:raise Denied('preview session limit')
            sid=uuid.uuid4().hex;token=secrets.token_urlsafe(32)
            self.sessions[sid]={'created':now,'expires':now+120,'token_hash':hashlib.sha256(token.encode()).digest(),'turns':0,'ended':False,'summary':body['summary_consent'],'audio_consent':body['audio_consent'],'receipt':None}
            self.starts.append(now)
            return {'session_id':sid,'token':token,'expires_at':now+120,'duration_cap_seconds':120,'mode':'demo','transport':'mock','recording':False,'provider_connected':False,'source_refs':REFS}
    def authorized(self,origin,sid,token,allow_expired=False):
        if origin!=self.origin or not isinstance(token,str):raise Denied('origin/token denied')
        s=self.sessions.get(sid)
        if not s or not hmac.compare_digest(hashlib.sha256(token.encode()).digest(),s['token_hash']):raise Denied('invalid session')
        if not allow_expired and (s['ended'] or self.clock()>=s['expires']):raise Denied('session ended/expired')
        return s
    def turn(self,origin,sid,token,text):
        with self.lock:
            s=self.authorized(origin,sid,token)
            if not isinstance(text,str) or not 0<len(text)<=500 or s['turns']>=10:raise Denied('turn limit')
            s['turns']+=1
            return {'session_id':sid,'mode':'demo','live_audio':False,'text':'This is a simulated DarkDesk reply. Live voice, approved pricing and customer actions are not connected.','source_refs':REFS,'turn':s['turns']}
    def offer(self,origin,sid,token,sdp):
        self.authorized(origin,sid,token)
        raise Denied('live WebRTC backend unconfigured; no audio forwarded')
    def end(self,origin,sid,token):
        with self.lock:
            s=self.authorized(origin,sid,token,allow_expired=True)
            if s['ended']:return s['receipt']
            receipt={'session_id':sid,'state':'ended','audio_recorded':False,'lead_created':False,'callback':None}
            if s['summary']:
                task='preview-'+sid;call='browser-'+sid
                self.receiver.assign(task,call,REFS)
                for seq,state in [(1,'started'),(2,'completed')]:
                    x={**self.principal,'task_id':task,'call_id':call,'event_id':task+'-'+str(seq),'seq':seq,'state':state,'sent_at':int(self.clock()),'result':{'summary':'Synthetic browser preview '+state+'; no microphone audio, typed text or customer data stored.','citations':REFS}}
                    raw=json.dumps(x,separators=(',',':')).encode()
                    receipt['callback']=self.receiver.accept(raw,sign(raw,self.key))
            s['ended']=True;s['receipt']=receipt
            return receipt
