import test from 'node:test';
import assert from 'node:assert/strict';
import {BrowserVoiceTransport} from './live-webrtc.mjs';
const session=()=>({transport:'webrtc-proxy',provider_connected:true,audio_consent:true,expires_at:Date.now()/1000+30,session_id:'synthetic'});
const audio=()=>({pause(){},play:async()=>{},srcObject:null});
test('mock sessions cannot request microphone or SDP',async()=>{
 let requested=0;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>{requested++;}}}});
 const v=new BrowserVoiceTransport({audioElement:audio(),postSdp:async()=>{throw Error('not allowed');}});
 await assert.rejects(v.connect({...session(),transport:'mock'}));assert.equal(requested,0);
});
test('end while microphone permission is pending stops eventual tracks',async()=>{
 let resolve,stopped=0;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(r=>{resolve=r;})}}});
 const v=new BrowserVoiceTransport({audioElement:audio(),postSdp:async()=>{throw Error('not allowed');}});
 const connecting=v.connect(session());v.disconnect();resolve({getTracks:()=>[{stop(){stopped++;}}]});await connecting;assert.equal(stopped,1);assert.equal(v.media,null);
});
test('SDP rejection closes microphone and peer connection',async()=>{
 let stopped=0,closed=0;const track={stop(){stopped++;}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track]})}}});
 globalThis.RTCPeerConnection=class {addTrack(){}createDataChannel(){return {close(){}};}async createOffer(){return {sdp:'synthetic'};}async setLocalDescription(){}close(){closed++;}};
 const v=new BrowserVoiceTransport({audioElement:audio(),postSdp:async()=>{throw Error('unconfigured');}});
 await assert.rejects(v.connect(session()),/unconfigured/);assert.equal(stopped,1);assert.equal(closed,1);assert.equal(v.pc,null);
});
test('mute disables track, cancels response and end releases media',()=>{
 let stopped=0,sent=[];const track={enabled:true,stop(){stopped++;}};
 const v=new BrowserVoiceTransport({audioElement:audio()});v.media={getAudioTracks:()=>[track],getTracks:()=>[track]};v.channel={readyState:'open',send:x=>sent.push(JSON.parse(x)),close(){}};
 v.mute(true);assert.equal(track.enabled,false);assert.equal(sent[0].type,'response.cancel');v.disconnect();assert.equal(stopped,1);
});
