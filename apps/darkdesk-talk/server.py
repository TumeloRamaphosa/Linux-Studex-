"""Loopback review server; no provider keys, external media or site deployment."""
import argparse,json,os,re,socket
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from sessions import Sessions,Denied
from bridge.hermes_receiver import unique_pairs,reject_constant

ROOT=Path(__file__).resolve().parent
ASSETS={'/':'index.html','/index.html':'index.html','/widget.js':'widget.js','/live-webrtc.mjs':'live-webrtc.mjs','/style.css':'style.css'}
def make_server(db_path,host='127.0.0.1',port=0):
    if host!='127.0.0.1':raise ValueError('public binding disabled')
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*a):pass
        def setup(self):super().setup();self.connection.settimeout(5)
        def output(self,status,body,kind='application/json'):
            raw=json.dumps(body).encode() if kind=='application/json' else body
            self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(raw)))
            self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Referrer-Policy','no-referrer');self.send_header('Permissions-Policy','camera=(), microphone=(self)')
            self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'self'; object-src 'none'; base-uri 'none'")
            self.end_headers();self.wfile.write(raw)
        def valid_host(self):return self.headers.get('Host')=='127.0.0.1:'+str(self.server.server_port)
        def do_GET(self):
            if not self.valid_host():self.output(403,{'error':'host_denied'});return
            if self.path=='/api/voice/capabilities':self.output(200,{'mode':'demo','live_connected':False,'transport':'mock','microphone':'local meter only','duration_cap_seconds':120});return
            asset=ASSETS.get(self.path)
            if not asset:self.output(404,{'error':'not_found'});return
            p=ROOT/asset
            if not p.is_file():self.output(404,{'error':'asset_pending'});return
            kind='text/html; charset=utf-8' if asset.endswith('html') else ('text/css; charset=utf-8' if asset.endswith('css') else 'text/javascript; charset=utf-8')
            self.output(200,p.read_bytes(),kind)
        def do_POST(self):
            if not self.valid_host() or self.headers.get('Origin')!=self.server.sessions.origin:self.output(403,{'error':'origin_denied'});return
            try:
                lengths=self.headers.get_all('Content-Length',[])
                if len(lengths)!=1 or self.headers.get('Transfer-Encoding'):raise ValueError('ambiguous body')
                n=int(lengths[0])
                if not 0<n<=4096 or self.headers.get('Content-Type','').split(';')[0]!='application/json':raise ValueError('bounded JSON required')
                raw=self.rfile.read(n)
                if len(raw)!=n:raise ValueError('incomplete body')
                x=json.loads(raw,object_pairs_hook=unique_pairs,parse_constant=reject_constant)
                if not isinstance(x,dict):raise ValueError('object required')
                origin=self.headers['Origin'];manager=self.server.sessions
                if self.path=='/api/voice/sessions':self.output(201,manager.create(origin,x));return
                m=re.fullmatch(r'/api/voice/sessions/([a-f0-9]{32})/(turn|end|sdp)',self.path)
                if not m:self.output(404,{'error':'not_found'});return
                sid,action=m.groups();auth=self.headers.get('Authorization','')
                token=auth[7:] if auth.startswith('Bearer ') else ''
                if action=='turn' and set(x)=={'text'}:r=manager.turn(origin,sid,token,x['text'])
                elif action=='end' and not x:r=manager.end(origin,sid,token)
                elif action=='sdp' and set(x)=={'sdp'}:r=manager.offer(origin,sid,token,x['sdp'])
                else:raise ValueError('unexpected fields')
                self.output(200,r)
            except Denied as e:self.output(423 if 'WebRTC' in str(e) else 403,{'error':str(e)})
            except (ValueError,UnicodeError,socket.timeout):self.output(400,{'error':'request_rejected'})
            except Exception:self.output(503,{'error':'preview_unavailable'})
    server=ThreadingHTTPServer((host,port),Handler)
    server.sessions=Sessions(db_path,'http://127.0.0.1:'+str(server.server_port))
    return server

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=0);a=p.parse_args()
    state=ROOT/'state';state.mkdir(exist_ok=True,mode=0o700);os.chmod(state,0o700)
    server=make_server(state/'preview-inbox.sqlite',port=a.port)
    receipt={'preview_url':'http://127.0.0.1:'+str(server.server_port),'mode':'demo','public':False,'provider_connected':False,'pid':os.getpid(),'note':'Mac-local review server; no audio uploaded or live agent connected'}
    (ROOT/'preview-running.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt),flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
