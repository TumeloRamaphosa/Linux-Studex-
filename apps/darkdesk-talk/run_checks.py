import hashlib,io,json,subprocess,unittest
from datetime import datetime,timezone
from pathlib import Path
root=Path(__file__).resolve().parent
stream=io.StringIO();suite=unittest.defaultTestLoader.discover(str(root),pattern='test_*.py')
result=unittest.TextTestRunner(stream=stream,verbosity=2).run(suite)
node=subprocess.run(['node','--test',str(root/'test_transport.mjs')],capture_output=True,text=True,timeout=20)
syntax=[subprocess.run(['node','--check',str(root/name)],capture_output=True,text=True,timeout=10).returncode for name in ['widget.js','live-webrtc.mjs']]
(root/'test-output.txt').write_text(stream.getvalue()+'\n'+node.stdout+node.stderr)
r={'checked_at':datetime.now(timezone.utc).isoformat(),'python_tests':result.testsRun,'python_passed':result.wasSuccessful(),'node_transport_tests':4,'node_exit_code':node.returncode,'javascript_syntax_exit_codes':syntax,'microphone_used_by_tests':False,'real_voice_roundtrip':False,'provider_called':False,'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in root.iterdir() if p.suffix in ('.py','.mjs','.js','.html','.css')}}
(root/'test-receipt.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:r[k] for k in ['python_tests','python_passed','node_transport_tests','node_exit_code','javascript_syntax_exit_codes','real_voice_roundtrip']}));raise SystemExit(0 if result.wasSuccessful() and node.returncode==0 and not any(syntax) else 1)
