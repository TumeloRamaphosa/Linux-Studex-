import json,tempfile,threading,unittest,urllib.request,urllib.error
from pathlib import Path
from server import make_server

class ServerTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.server=make_server(Path(self.tmp.name)/'inbox.sqlite',port=0)
        self.origin='http://127.0.0.1:'+str(self.server.server_port)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
    def tearDown(self):self.server.shutdown();self.server.server_close();self.thread.join(2);self.tmp.cleanup()
    def request(self,path,body,token=None,origin=None):
        headers={'Origin':self.origin if origin is None else origin,'Content-Type':'application/json'}
        if token:headers['Authorization']='Bearer '+token
        r=urllib.request.Request(self.origin+path,json.dumps(body).encode(),headers=headers,method='POST')
        with urllib.request.urlopen(r,timeout=3) as x:return json.load(x)
    def create(self):return self.request('/api/voice/sessions',{'mode':'demo','audio_consent':False,'summary_consent':True,'lead_consent':False})
    def test_http_session_to_signed_callback_and_idempotent_end(self):
        a=self.create();base='/api/voice/sessions/'+a['session_id']
        reply=self.request(base+'/turn',{'text':'synthetic'},a['token']);self.assertFalse(reply['live_audio'])
        end=self.request(base+'/end',{},a['token']);self.assertEqual(end['callback']['projection'],'pending_review')
        self.assertEqual(end,self.request(base+'/end',{},a['token']))
    def test_origin_extra_fields_and_live_sdp_denied(self):
        with self.assertRaises(urllib.error.HTTPError) as e:self.request('/api/voice/sessions',{},origin='https://evil.invalid')
        self.assertEqual(e.exception.code,403);e.exception.close()
        a=self.create()
        with self.assertRaises(urllib.error.HTTPError) as e:self.request('/api/voice/sessions/'+a['session_id']+'/sdp',{'sdp':'v=0'},a['token'])
        self.assertEqual(e.exception.code,423);e.exception.close()
    def test_no_arbitrary_files_and_no_public_binding(self):
        with self.assertRaises(ValueError):make_server(Path(self.tmp.name)/'other.sqlite',host='0.0.0.0')
        with self.assertRaises(urllib.error.HTTPError) as e:urllib.request.urlopen(self.origin+'/../../CRM-integrations/hermes-config.synthetic.json')
        self.assertEqual(e.exception.code,404);e.exception.close()

if __name__=='__main__':unittest.main()
