"""Coms-owned mock callback inbox/outbox. Proposed wire format, not HERMES verified.

No cloud writer, dialler or generic action executor. Operator assignment only.
HMAC covers raw bytes; signed sent_at is delivery freshness, not event identity.
"""
import hashlib,hmac,json,os,re,sqlite3,time
from contextlib import contextmanager
from pathlib import Path

class Rejected(ValueError):pass
def sign(raw,key):return 'sha256='+hmac.new(key,raw,hashlib.sha256).hexdigest()
def encode(x):return json.dumps(x,sort_keys=True,separators=(',',':'),allow_nan=False)
def identifier(x):
    if not isinstance(x,str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,100}',x):raise Rejected('invalid identifier')
    return x
def unique_pairs(pairs):
    result={}
    for k,v in pairs:
        if k in result:raise Rejected('duplicate JSON key')
        result[k]=v
    return result
def reject_constant(x):raise Rejected('nonfinite JSON number')

class Receiver:
    def __init__(self,path,principal,key,clock=time.time):
        if not isinstance(key,bytes) or len(key)<32:raise Rejected('explicit scoped key of at least32bytes required')
        if not isinstance(principal,dict) or set(principal)!={'source_id','tenant_id','client_id'}:raise Rejected('operator principal required')
        for v in principal.values():identifier(v)
        self.path=Path(path);self.principal=dict(principal);self.key=key;self.clock=clock
        if self.path.is_symlink():raise Rejected('database symlink denied')
        fd=os.open(self.path,os.O_CREAT|os.O_WRONLY,0o600);os.close(fd)
        os.chmod(self.path,0o600)
        with self.db() as d:
            d.executescript('''CREATE TABLE IF NOT EXISTS assignments(scope TEXT,task TEXT,call TEXT,refs TEXT,seq INTEGER,state TEXT,PRIMARY KEY(scope,task));
            CREATE TABLE IF NOT EXISTS inbox(scope TEXT,event TEXT,digest TEXT,receipt TEXT,PRIMARY KEY(scope,event));
            CREATE TABLE IF NOT EXISTS outbox(scope TEXT,event TEXT,payload TEXT,state TEXT,PRIMARY KEY(scope,event));''')
        self.scope=encode(self.principal)
    @contextmanager
    def db(self):
        d=sqlite3.connect(self.path,timeout=5)
        try:d.execute('BEGIN IMMEDIATE');yield d;d.commit()
        except Exception:d.rollback();raise
        finally:d.close()
    def assign(self,task,call,refs,operation='call.mock'):
        if operation!='call.mock':raise Rejected('only mock assignments enabled')
        identifier(task);identifier(call)
        if not isinstance(refs,dict) or not 1<=len(refs)<=5:raise Rejected('approved source manifest required')
        for k,v in refs.items():
            identifier(k)
            if not isinstance(v,str) or not re.fullmatch('[a-f0-9]{64}',v):raise Rejected('source hash required')
        with self.db() as d:
            old=d.execute('SELECT call,refs FROM assignments WHERE scope=? AND task=?',(self.scope,task)).fetchone()
            if old:
                if old!=(call,encode(refs)):raise Rejected('immutable assignment conflict')
                return
            d.execute('INSERT INTO assignments VALUES(?,?,?,?,0,?)',(self.scope,task,call,encode(refs),'pending'))
    def accept(self,raw,signature):
        if not isinstance(raw,bytes) or not 0<len(raw)<=16384:raise Rejected('bounded raw bytes required')
        if not isinstance(signature,str) or not re.fullmatch(r'sha256=[a-f0-9]{64}',signature) or not hmac.compare_digest(sign(raw,self.key),signature):raise Rejected('invalid signature')
        try:x=json.loads(raw,object_pairs_hook=unique_pairs,parse_constant=reject_constant)
        except (ValueError,UnicodeError) as e:raise Rejected('invalid JSON') from e
        required={'source_id','tenant_id','client_id','task_id','call_id','event_id','seq','state','sent_at','result'}
        if not isinstance(x,dict) or set(x)!=required:raise Rejected('invalid envelope fields')
        for k in ('source_id','tenant_id','client_id','task_id','call_id','event_id'):identifier(x[k])
        if any(x[k]!=v for k,v in self.principal.items()):raise Rejected('principal scope mismatch')
        if type(x['sent_at']) is not int or abs(self.clock()-x['sent_at'])>300:raise Rejected('stale/future delivery')
        if type(x['seq']) is not int or x['seq']<1:raise Rejected('invalid sequence')
        if x['state'] not in ('started','progress','completed','failed','cancelled'):raise Rejected('invalid state')
        result=x['result']
        if not isinstance(result,dict) or set(result)!={'summary','citations'}:raise Rejected('invalid result')
        if not isinstance(result['summary'],str) or not 0<len(result['summary'])<=1000:raise Rejected('bounded summary required')
        refs=result['citations']
        if not isinstance(refs,dict) or len(refs)>5:raise Rejected('bounded citations required')
        if x['state']=='completed' and not refs:raise Rejected('completion evidence required')
        # Retries may refresh signed delivery time; immutable event content stays fixed.
        immutable={k:v for k,v in x.items() if k!='sent_at'}
        digest=hashlib.sha256(encode(immutable).encode()).hexdigest()
        with self.db() as d:
            a=d.execute('SELECT call,refs,seq,state FROM assignments WHERE scope=? AND task=?',(self.scope,x['task_id'])).fetchone()
            if not a or a[0]!=x['call_id']:raise Rejected('unknown task/call assignment')
            approved=json.loads(a[1])
            if any(k not in approved or v!=approved[k] for k,v in refs.items()):raise Rejected('unknown/stale citation version')
            old=d.execute('SELECT digest,receipt FROM inbox WHERE scope=? AND event=?',(self.scope,x['event_id'])).fetchone()
            if old:
                if old[0]!=digest:raise Rejected('event replay conflict')
                return json.loads(old[1])
            if a[3] in ('completed','failed','cancelled') or x['seq']!=a[2]+1:raise Rejected('terminal/out-of-order event')
            if (a[2]==0 and x['state']!='started') or (a[2]>0 and x['state']=='started'):raise Rejected('invalid lifecycle transition')
            receipt={'event_id':x['event_id'],'task_id':x['task_id'],'call_id':x['call_id'],'digest':digest,'accepted_at':int(self.clock()),'projection':'pending_review','remote_crm_write':False,'cindy_notification':'not_delivered'}
            d.execute('INSERT INTO inbox VALUES(?,?,?,?)',(self.scope,x['event_id'],digest,encode(receipt)))
            d.execute('INSERT INTO outbox VALUES(?,?,?,?)',(self.scope,x['event_id'],encode(immutable),'pending_review'))
            d.execute('UPDATE assignments SET seq=?,state=? WHERE scope=? AND task=?',(x['seq'],x['state'],self.scope,x['task_id']))
            return receipt
    def counts(self):
        with self.db() as d:return {k:d.execute('SELECT COUNT(*) FROM '+k+' WHERE scope=?',(self.scope,)).fetchone()[0] for k in ('inbox','outbox')}
