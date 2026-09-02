import { COTTAGE, cottageLocal, cottageWorld, riverX, terrainHeight } from './land.js';
import { random, clamp } from './math.js';

// Generated locally: no audio downloads, microphone access or background player.
// Context creation/resume stays inside the Enter VR / Look around click handlers.
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
function makeNoise(context,kind) {
  const seconds=kind==='wind'?13:kind==='water'?11:7;
  const buffer=context.createBuffer(1,Math.floor(context.sampleRate*seconds),context.sampleRate);
  const data=buffer.getChannelData(0),rng=random({wind:732,water:184,fire:593}[kind]);
  let low=0,envelope=0,peak=.0001;
  for(let i=0;i<data.length;i++){
    const white=rng()*2-1;
    low=low*.986+white*.014;
    if(kind==='fire'){
      if(rng()<.00022)envelope=.25+rng()*.75;
      envelope*=.992;
    }
    const fade=Math.min(1,i/(context.sampleRate*.07),(data.length-i-1)/(context.sampleRate*.07));
    const sample=(kind==='wind'?low*4:kind==='water'?white*.64+low*2:white*envelope)*fade;
    data[i]=sample;peak=Math.max(peak,Math.abs(sample));
  }
  for(let i=0;i<data.length;i++)data[i]*=.5/peak;
  return buffer;
}

function position(node,x,y,z) {
  if(node.positionX){node.positionX.value=x;node.positionY.value=y;node.positionZ.value=z;}
  else node.setPosition(x,y,z);
}

export function createAmbience(onUnavailable=()=>{}) {
  let context,master,wind,water,river,fire,active=false,enabled=true,suspendTimer;
  let birds=[],lastMix=-1;
  const rng=random(177);
  const spatial=(x,y,z,ref=2)=>{
    const p=context.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';
    p.refDistance=ref;p.rolloffFactor=1.7;p.maxDistance=70;p.coneOuterGain=1;
    position(p,x,y,z);p.connect(master);return p;
  };
  const loop=(kind,filterType,frequency,gain,destination)=>{
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),volume=context.createGain();
    source.buffer=makeNoise(context,kind);source.loop=true;
    filter.type=filterType;filter.frequency.value=frequency;filter.Q.value=.45;volume.gain.value=gain;
    source.connect(filter);filter.connect(volume);volume.connect(destination);source.start();return volume;
  };
  const initialise=()=>{
    const AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AudioContextClass)throw new Error('Audio is unavailable');
    context=new AudioContextClass({latencyHint:'interactive'});
    master=context.createGain();master.gain.value=0;master.connect(context.destination);
    wind=loop('wind','lowpass',1400,.15,master);
    river=spatial(riverX(22),.3,22,2.6);
    water=loop('water','lowpass',2100,.22,river);
    const hearth=cottageWorld(-1.65,-1.26);
    fire=spatial(hearth.x,COTTAGE.y+.8,hearth.z,1.2);
    loop('fire','highpass',360,.2,fire);
    birds=[[27,15],[-43,17],[-21,-15]].map(([x,z],i)=>({
      panner:spatial(x,terrainHeight(x,z)+5,z,3),
      next:context.currentTime+2+i*3.1,base:2200+i*430,
    }));
  };
  const silence=()=>{
    if(!context)return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(0,context.currentTime,.025);
    clearTimeout(suspendTimer);
    suspendTimer=setTimeout(()=>{if(!active||!enabled)void context.suspend().catch(()=>{});},180);
  };
  const start=async()=>{
    active=true;
    if(!enabled)return false;
    clearTimeout(suspendTimer);
    try{
      if(!context)initialise();
      await context.resume();
      if(active&&enabled){
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setTargetAtTime(.48,context.currentTime,.2);
      }
      return true;
    }catch{
      enabled=false;silence();onUnavailable();return false;
    }
  };
  const stop=()=>{active=false;silence();};
  const setEnabled=value=>{
    enabled=value;
    if(enabled&&active)void start();else if(!enabled)silence();
  };
  const chirp=(bird,indoors)=>{
    const now=context.currentTime,count=2+Math.floor(rng()*3);
    for(let i=0;i<count;i++){
      const oscillator=context.createOscillator(),gain=context.createGain();
      const at=now+i*(.13+rng()*.06),pitch=bird.base+(rng()-.5)*460;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(pitch,at);
      oscillator.frequency.exponentialRampToValueAtTime(pitch*1.28,at+.047);
      oscillator.frequency.exponentialRampToValueAtTime(pitch*.96,at+.135);
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(indoors?.014:.063,at+.017);
      gain.gain.exponentialRampToValueAtTime(.0001,at+.148);
      oscillator.connect(gain);gain.connect(bird.panner);
      oscillator.start(at);oscillator.stop(at+.16);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    }
    bird.next=now+7+rng()*10;
  };
  const update=(elapsed,eye,forward,up)=>{
    if(!active||!enabled||!context||context.state!=='running')return;
    const listener=context.listener;
    position(listener,eye.x,eye.y,eye.z);
    if(listener.forwardX){
      listener.forwardX.value=forward.x;listener.forwardY.value=forward.y;listener.forwardZ.value=forward.z;
      listener.upX.value=up.x;listener.upY.value=up.y;listener.upZ.value=up.z;
    }else listener.setOrientation(forward.x,forward.y,forward.z,up.x,up.y,up.z);
    const z=clamp(eye.z,-85,85);
    position(river,riverX(z),.3,z);
    const local=cottageLocal(eye.x,eye.z),indoors=Math.abs(local.x)<3.4&&Math.abs(local.z)<3;
    if(elapsed-lastMix>.2||elapsed<lastMix){
      wind.gain.setTargetAtTime((.135+Math.sin(elapsed*.19)*.025)*(indoors?.23:1),context.currentTime,.35);
      water.gain.setTargetAtTime(indoors?.07:.22,context.currentTime,.35);
      lastMix=elapsed;
    }
    for(const bird of birds)if(context.currentTime>bird.next)chirp(bird,indoors);
  };
  const dispose=()=>{
    stop();clearTimeout(suspendTimer);
    if(context)void context.close().catch(()=>{});
  };
  return {start,stop,setEnabled,update,dispose};
}
