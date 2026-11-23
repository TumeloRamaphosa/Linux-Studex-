import json,tempfile,unittest
from pathlib import Path
from sessions import Sessions,Denied

ORIGIN='http://127.0.0.1:8769'
class SessionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.time=1000
        self.s=Sessions(Path(self.tmp.name)/'callback.sqlite',ORIGIN,clock=lambda:self.time)
    def tearDown(self):self.tmp.cleanup()
    def new(self,**extra):return self.s.create(ORIGIN,{'mode':'demo','audio_consent':False,'summary_consent':False,'lead_consent':False,**extra})
    def test_explicit_consent_and_origin(self):
        for origin,body in [('https://other.invalid',{}),(ORIGIN,{'mode':'live'}),(ORIGIN,{'mode':'demo','audio_consent':'yes'})]:
            with self.assertRaises(Denied):self.s.create(origin,body)
    def test_scoped_short_lived_token(self):
        a=self.new();b=self.new();self.assertNotEqual(a['token'],b['token'])
        with self.assertRaises(Denied):self.s.turn(ORIGIN,a['session_id'],b['token'],'test')
        with self.assertRaises(Denied):self.s.turn('https://other.invalid',a['session_id'],a['token'],'test')
        self.time+=121
        with self.assertRaises(Denied):self.s.turn(ORIGIN,a['session_id'],a['token'],'test')
    def test_demo_is_not_live_audio_or_a_sales_answer(self):
        a=self.new();r=self.s.turn(ORIGIN,a['session_id'],a['token'],'price')
        self.assertFalse(r['live_audio']);self.assertIn('simulated',r['text'])
        self.assertNotIn('2500',r['text']);self.assertEqual(a['transport'],'mock')
    def test_caps(self):
        a=self.new()
        for _ in range(10):self.s.turn(ORIGIN,a['session_id'],a['token'],'test')
        with self.assertRaises(Denied):self.s.turn(ORIGIN,a['session_id'],a['token'],'test')
        with self.assertRaises(Denied):self.s.turn(ORIGIN,a['session_id'],a['token'],'x'*501)
        self.new()
        with self.assertRaises(Denied):self.new()
    def test_end_without_summary_saves_no_callback(self):
        a=self.new();r=self.s.end(ORIGIN,a['session_id'],a['token'])
        self.assertEqual(r,self.s.end(ORIGIN,a['session_id'],a['token']))
        self.assertEqual(self.s.receiver.counts(),{'inbox':0,'outbox':0})
        with self.assertRaises(Denied):self.s.turn(ORIGIN,a['session_id'],a['token'],'test')
    def test_summary_opt_in_reuses_signed_receiver(self):
        a=self.new(summary_consent=True)
        self.s.turn(ORIGIN,a['session_id'],a['token'],'synthetic')
        r=self.s.end(ORIGIN,a['session_id'],a['token'])
        self.assertEqual(r['callback']['projection'],'pending_review')
        self.assertEqual(self.s.receiver.counts(),{'inbox':2,'outbox':2})
        self.s.end(ORIGIN,a['session_id'],a['token'])
        self.assertEqual(self.s.receiver.counts(),{'inbox':2,'outbox':2})
    def test_lead_and_recording_are_not_implied(self):
        with self.assertRaises(Denied):self.new(lead_consent=True)
        with self.assertRaises(Denied):self.new(record=True)
        a=self.new(audio_consent=True);self.assertFalse(a['recording']);self.assertFalse(a['provider_connected'])
    def test_live_media_fails_closed(self):
        a=self.new(audio_consent=True)
        with self.assertRaises(Denied):self.s.offer(ORIGIN,a['session_id'],a['token'],'v=0')

if __name__=='__main__':unittest.main()
