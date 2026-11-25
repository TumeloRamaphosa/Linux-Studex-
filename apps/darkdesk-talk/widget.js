const $=id=>document.getElementById(id);
let session=null,stream=null,context=null,frame=null,expiry=null,muted=false,epoch=0,reply='',busy=false,micPending=false;
const voices=()=>window.speechSynthesis?.getVoices().filter(v=>v.localService===true)||[];
function view(state,message){$('status').textContent=state;$('activity').textContent=message;}
async function api(path,body,token){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{const r=await fetch(path,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})},body:JSON.stringify(body),signal:controller.signal});const data=await r.json();if(!r.ok)throw new Error(data.error||'Request failed');return data;}finally{clearTimeout(timer);}
}
function buttons(){
 const active=Boolean(session);$('connect').disabled=active||busy;$('choices').disabled=active||busy;
 $('end').disabled=!active&&!busy;$('send').disabled=!active||busy;$('prompt').disabled=!active||busy;
 $('mic').disabled=!active||!$('audio-consent').checked||Boolean(stream)||busy||micPending;
 $('mute').disabled=!stream;$('mute').textContent=muted?'Unmute':'Mute';
 $('speak').disabled=!active||!reply||voices().length===0;
}
function stopMic(){
 if(frame)cancelAnimationFrame(frame);frame=null;
 if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;
 if(context)context.close().catch(()=>{});context=null;muted=false;micPending=false;
 $('level').value=0;$('mic-state').textContent='Off';buttons();
}
function stopLocalAudio(){stopMic();window.speechSynthesis?.cancel();}
async function endSession(reason='Session ended.'){
 epoch++;clearTimeout(expiry);expiry=null;stopLocalAudio();
 const old=session;session=null;busy=false;reply='';$('prompt').value='';buttons();view('Disconnected',reason);
 if(old){try{const r=await api('/api/voice/sessions/'+old.session_id+'/end',{},old.token);$('result').textContent=r.callback?'Synthetic summary saved locally for Coms review. No cloud write or lead created.':'Ended without saving a summary. No audio was recorded.';}catch{$('result').textContent='Local capture stopped. Server acknowledgement unavailable; no automatic retry or live action.';}}
}
$('connect').addEventListener('click',async()=>{
 const attempt=++epoch;busy=true;$('result').textContent='';buttons();view('Connecting demo','Creating a short-lived, scoped preview session…');
 try{const created=await api('/api/voice/sessions',{mode:'demo',audio_consent:$('audio-consent').checked,summary_consent:$('summary-consent').checked,lead_consent:false});
  if(attempt!==epoch){api('/api/voice/sessions/'+created.session_id+'/end',{},created.token).catch(()=>{});return;}
  session=created;busy=false;view('Connected · demo','Demo session connected. The live talking agent is not connected.');
  expiry=setTimeout(()=>endSession('Two-minute preview limit reached.'),Math.max(0,Math.min(120000,created.expires_at*1000-Date.now())));buttons();
 }catch(e){if(attempt===epoch){busy=false;view('Connection failed',e.message);buttons();}}
});
$('mic').addEventListener('click',async()=>{
 if(!session||!$('audio-consent').checked||micPending)return;
 micPending=true;buttons();
 const attempt=epoch;
 try{const mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  if(attempt!==epoch||!session){mic.getTracks().forEach(t=>t.stop());return;}
  stream=mic;context=new AudioContext();await context.resume();
  if(attempt!==epoch||!stream)return;
  const analyser=context.createAnalyser();analyser.fftSize=256;context.createMediaStreamSource(stream).connect(analyser);
  const values=new Uint8Array(analyser.fftSize);
  function meter(){if(!stream)return;analyser.getByteTimeDomainData(values);const rms=Math.sqrt(values.reduce((a,x)=>a+((x-128)/128)**2,0)/values.length);$('level').value=muted?0:Math.min(100,rms*250);frame=requestAnimationFrame(meter);}meter();
  $('mic-state').textContent='Local only';view('Connected · demo','Microphone meter active locally. No recording, recognition or upload.');buttons();
 }catch(e){if(attempt===epoch){stopMic();view('Mic unavailable',e.name==='NotAllowedError'?'Microphone permission denied. Demo text controls still work.':'Microphone unavailable. No audio was sent.');}}
 finally{if(attempt===epoch){micPending=false;buttons();}}
});
$('mute').addEventListener('click',()=>{if(!stream)return;muted=!muted;stream.getAudioTracks().forEach(t=>{t.enabled=!muted;});window.speechSynthesis?.cancel();$('mic-state').textContent=muted?'Muted':'Local only';buttons();});
$('end').addEventListener('click',()=>endSession());
async function send(){
 if(!session||busy)return;const text=$('prompt').value.trim();if(!text)return;
 busy=true;buttons();view('Processing · demo','Testing the local response path. No model is being called.');
 const current=session,attempt=epoch;
 try{const r=await api('/api/voice/sessions/'+current.session_id+'/turn',{text},current.token);if(attempt!==epoch)return;reply=r.text;$('response').textContent=reply;$('prompt').value='';view('Connected · demo','Simulated response received. You can play it with an available local voice.');}
 catch(e){if(attempt===epoch)view('Response failed',e.message);}
 finally{if(attempt===epoch){busy=false;buttons();}}
}
$('send').addEventListener('click',send);$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();send();}});
$('speak').addEventListener('click',()=>{
 const local=voices().find(v=>v.lang.startsWith('en'))||voices()[0];if(!local||!reply||!session)return;
 window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(reply);utterance.voice=local;utterance.lang=local.lang;
 utterance.onstart=()=>view('Speaking · local demo','Playing a simulated reply using a browser-reported local voice.');
 utterance.onend=()=>{if(session)view('Connected · demo','Local playback finished. This was not a live agent response.');};
 utterance.onerror=()=>{if(session)view('Playback unavailable','Local speech playback failed; response text remains available.');};
 window.speechSynthesis.speak(utterance);
});
window.speechSynthesis?.addEventListener('voiceschanged',()=>{buttons();$('speech-note').textContent=voices().length?'Local voice available. Playback is optional and starts only when you press the button.':'No browser-reported local voice available. No cloud voice fallback is used.';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopLocalAudio();if(session)view('Connected · demo','Audio stopped because the tab is hidden. Enable the mic again when ready.');}});
window.addEventListener('pagehide',()=>{stopLocalAudio();session=null;clearTimeout(expiry);});
buttons();
