/** Browser-safe adaptation of studex-rileyjarvis 0e4f08d WebRTC pattern.
 * Not enabled by the preview server. Uses Coms-owned SDP proxy, not a provider
 * key or Electron IPC. No tool execution, camera, recording or external URL.
 */
export class BrowserVoiceTransport {
 constructor({audioElement,onEvent=()=>{},postSdp}){this.audio=audioElement;this.onEvent=onEvent;this.postSdp=postSdp;this.epoch=0;this.connecting=false;}
 async connect(session){
  if(session.transport!=='webrtc-proxy'||session.provider_connected!==true||session.audio_consent!==true)throw new Error('Verified live media session required');
  if(this.connecting||this.pc)throw new Error('Existing media session must end first');
  const remaining=Math.min(120000,session.expires_at*1000-Date.now());if(remaining<=0)throw new Error('Expired media session');
  this.connecting=true;const attempt=++this.epoch;this.timer=setTimeout(()=>this.disconnect(),remaining);
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(attempt!==this.epoch){media.getTracks().forEach(t=>t.stop());return;}
   this.media=media;this.pc=new RTCPeerConnection({iceServers:[]});media.getTracks().forEach(t=>this.pc.addTrack(t,media));
   this.pc.ontrack=e=>{this.audio.srcObject=e.streams[0];this.audio.play().catch(()=>this.onEvent({type:'audio.playback_blocked'}));};
   this.pc.onconnectionstatechange=()=>this.onEvent({type:'transport.status',state:this.pc?.connectionState||'closed'});
   this.channel=this.pc.createDataChannel('oai-events');
   this.channel.onmessage=e=>{if(typeof e.data!=='string'||e.data.length>16384)return;try{const x=JSON.parse(e.data);if(typeof x.type==='string'&&!x.type.includes('function_call'))this.onEvent(x);}catch{}};
   const offer=await this.pc.createOffer();await this.pc.setLocalDescription(offer);
   const answer=await this.postSdp(session.session_id,offer.sdp);if(attempt!==this.epoch)return;
   if(!answer||typeof answer.sdp!=='string'||answer.sdp.length>131072)throw new Error('Invalid SDP answer');
   await this.pc.setRemoteDescription({type:'answer',sdp:answer.sdp});
  }catch(e){if(attempt===this.epoch)this.disconnect();throw e;}
  finally{if(attempt===this.epoch)this.connecting=false;}
 }
 mute(value){this.media?.getAudioTracks().forEach(t=>{t.enabled=!value;});if(value)this.interrupt();}
 interrupt(){if(this.channel?.readyState==='open')this.channel.send(JSON.stringify({type:'response.cancel'}));this.audio.pause();}
 disconnect(){this.epoch++;this.connecting=false;clearTimeout(this.timer);this.media?.getTracks().forEach(t=>t.stop());this.media=null;this.channel?.close();this.channel=null;this.pc?.close();this.pc=null;this.audio.pause();this.audio.srcObject=null;}
}
