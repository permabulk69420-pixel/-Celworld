import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import { createWorld } from './world.js';
import { time, eye } from './materials.js';
import { SPAWN } from './land.js';
import { Walker, readXRInput, rotateOriginAroundHead, TURN_SPEED } from './locomotion.js';
import { readHeadPose } from './xr-pose.js';
import { createAmbience } from './ambience.js';

const canvas=document.querySelector('#world');
const welcome=document.querySelector('#welcome');
const enter=document.querySelector('#enter-vr');
const look=document.querySelector('#look-around');
const status=document.querySelector('#session-status');
const help=document.querySelector('#help');
const back=document.querySelector('#return');
const errorBox=document.querySelector('#error');
const params=new URLSearchParams(location.search);
const inspect=params.has('inspect');
let sessionStarting=false;

function fail(message,error){
  errorBox.textContent=message;errorBox.hidden=false;document.body.dataset.state='error';
  enter.disabled=true;enter.textContent='Unable to open the valley';look.hidden=true;
  if(error)console.error(error);
}
async function start(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NoToneMapping;
  renderer.xr.enabled=true;
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.xr.setFramebufferScaleFactor(.95);
  renderer.xr.setFoveation(.7);
  let shaderFailed=false;
  renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{
    shaderFailed=true;
    fail('The valley could not finish rendering. Please reload the page.',new Error([gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment)].join('\n')));
  };
  const {scene,colliders,grass,flowerCount,details=[],animateLife}=createWorld();
  const soundButton=document.querySelector('#sound-toggle');
  let soundEnabled=true;
  const ambience=createAmbience(()=>{soundButton.disabled=true;soundButton.textContent='Ambience unavailable';});
  soundButton.addEventListener('click',()=>{
    soundEnabled=!soundEnabled;ambience.setEnabled(soundEnabled);
    soundButton.setAttribute('aria-pressed',String(soundEnabled));soundButton.textContent=soundEnabled?'Ambience on':'Ambience off';
  });
  const rig=new THREE.Group();
  const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.06,900);
  rig.add(camera);scene.add(rig);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.07;
  controls.enablePan=false;controls.enabled=false;controls.minDistance=7;controls.maxDistance=65;
  controls.maxPolarAngle=Math.PI*.47;controls.minPolarAngle=.34;
  const restoreView=()=>{
    rig.position.set(0,0,0);rig.rotation.set(0,0,0);
    camera.fov=58;camera.aspect=innerWidth/innerHeight;camera.zoom=1;camera.updateProjectionMatrix();
    camera.position.set(18,9,35);controls.target.set(1.5,4.4,-16);
    camera.lookAt(controls.target);controls.update();
  };
  restoreView();
  const walker=new Walker(SPAWN.x,SPAWN.z,colliders);

  // Compact local hand silhouettes avoid controller models fetched from an external CDN.
  const handMaterial=new THREE.MeshBasicMaterial({color:'#dcd6b1'});
  const cuffMaterial=new THREE.MeshBasicMaterial({color:'#72896b'});
  for(let i=0;i<2;i++){
    const grip=renderer.xr.getControllerGrip(i);
    const palm=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.035,4,8),handMaterial);
    palm.rotation.x=-.55;palm.position.z=.013;
    const thumb=new THREE.Mesh(new THREE.SphereGeometry(.015,8,6),handMaterial);
    thumb.position.set(i===0?.027:-.027,.004,.011);thumb.scale.set(1,1.4,1);
    const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.027,.025,.021,8),cuffMaterial);
    cuff.position.set(0,-.044,.026);cuff.rotation.x=-.55;
    grip.add(palm,thumb,cuff);rig.add(grip);
  }
  const head=new THREE.Vector3(),direction=new THREE.Vector3(),headRotation=new THREE.Quaternion();
  const soundForward=new THREE.Vector3(),soundUp=new THREE.Vector3(),soundRotation=new THREE.Quaternion();
  let previous=0,elapsed=0,frameCounter=0,paused=false;
  let diagnostic;
  if(inspect){
    diagnostic=document.createElement('output');diagnostic.id='diagnostics';
    Object.assign(diagnostic.style,{position:'fixed',right:'15px',top:'15px',color:'white',background:'#15392ddd',padding:'12px',font:'12px monospace',whiteSpace:'pre',pointerEvents:'none'});
    document.body.append(diagnostic);
  }
  const stop=()=>{walker.stop();previous=0;};
  document.addEventListener('visibilitychange',stop);
  window.addEventListener('blur',stop);
  document.addEventListener('visibilitychange',()=>{
    // XR owns its visibility lifecycle; the desktop document can be hidden while
    // the headset is still presenting a visible immersive session.
    if(renderer.xr.isPresenting)return;
    if(document.hidden)ambience.stop();else if(controls.enabled)void ambience.start();
  });
  window.addEventListener('pagehide',()=>ambience.stop());
  window.addEventListener('resize',()=>{
    if(renderer.xr.isPresenting)return;
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();fail('The view was interrupted. Reload to return to the valley.');
    renderer.setAnimationLoop(null);
    ambience.stop();
  });
  look.addEventListener('click',()=>{
    void ambience.start();
    welcome.classList.add('dismissed');back.hidden=false;help.hidden=false;controls.enabled=true;
    help.replaceChildren();
    const hint=document.createElement('span');hint.textContent='Drag to look around · Pinch or scroll to get closer';help.append(hint);
  });
  back.addEventListener('click',()=>{
    ambience.stop();
    controls.enabled=false;restoreView();welcome.classList.remove('dismissed');help.hidden=true;back.hidden=true;
  });

  renderer.xr.addEventListener('sessionstart',()=>{
    void ambience.start();
    walker.reset(SPAWN.x,SPAWN.z);rig.position.set(SPAWN.x,walker.y,SPAWN.z);
    rig.rotation.set(0,-.2,0);camera.position.set(0,0,0);camera.rotation.set(0,0,0);
    controls.enabled=false;welcome.classList.add('dismissed');help.hidden=true;back.hidden=true;previous=0;
    document.body.dataset.mode='vr';
  });
  renderer.xr.addEventListener('sessionend',()=>{
    ambience.stop();
    stop();restoreView();welcome.classList.remove('dismissed');controls.enabled=false;paused=false;
    enter.textContent='Enter VR';enter.disabled=false;sessionStarting=false;document.body.dataset.mode='preview';
    renderer.setSize(innerWidth,innerHeight);
  });
  enter.addEventListener('click',async()=>{
    if(sessionStarting)return;
    sessionStarting=true;enter.disabled=true;status.textContent='';
    void ambience.start();
    let session;
    try{
      session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor']});
      session.addEventListener('visibilitychange',()=>{
        paused=session.visibilityState!=='visible';stop();
        if(paused)ambience.stop();else void ambience.start();
      });
      await renderer.xr.setSession(session);
      if(session.supportedFrameRates?.includes(72)){
        try{await session.updateTargetFrameRate(72);}catch{/* Browser keeps its supported default. */}
      }
    }catch(error){
      ambience.stop();
      if(session)await session.end().catch(()=>{});
      status.textContent=error.name==='NotAllowedError'?'Allow VR access in your headset, then try again.':'Could not enter VR. Try again from the Quest browser.';
      enter.disabled=false;sessionStarting=false;
    }
  });
  renderer.setAnimationLoop((timestamp,frame)=>{
    const dt=previous?Math.min((timestamp-previous)/1000,.05):1/72;previous=timestamp;elapsed+=dt;time.value=elapsed;
    if(renderer.xr.isPresenting){
      rig.updateMatrixWorld(true);
      const tracked=readHeadPose(frame,renderer.xr.getReferenceSpace(),rig,head,headRotation);
      const input=paused?{strafe:0,forward:0,turn:0,run:false,jump:false}:readXRInput(renderer.xr.getSession().inputSources);
      if(!paused&&tracked){
        const angle=-input.turn*TURN_SPEED*dt;
        if(angle){
          const origin=rotateOriginAroundHead(rig.position,head,angle);
          rig.position.x=origin.x;rig.position.z=origin.z;rig.rotation.y+=angle;
          headRotation.premultiply(new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP,angle));
        }
        direction.set(0,0,-1).applyQuaternion(headRotation);direction.y=0;direction.normalize();
        walker.x=head.x;walker.z=head.z;
        walker.step(dt,input,direction);
        rig.position.x+=walker.x-head.x;rig.position.z+=walker.z-head.z;rig.position.y=walker.y;
      }else walker.stop();
      eye.value.copy(head);
    }else{
      if(controls.enabled)controls.update();
      camera.getWorldPosition(eye.value);
    }
    for(const patch of grass.patches)patch.mesh.visible=Math.hypot(patch.x-eye.value.x,patch.z-eye.value.z)<73;
    for(const detail of details)detail.root.visible=Math.hypot(detail.x-eye.value.x,detail.z-eye.value.z)<detail.distance;
    animateLife(elapsed);
    if(renderer.xr.isPresenting)soundRotation.copy(headRotation);else camera.getWorldQuaternion(soundRotation);
    soundForward.set(0,0,-1).applyQuaternion(soundRotation);soundUp.set(0,1,0).applyQuaternion(soundRotation);
    ambience.update(elapsed,eye.value,soundForward,soundUp);
    renderer.render(scene,camera);
    frameCounter++;
    if(diagnostic&&frameCounter%30===0){
      diagnostic.textContent=[
        'CELWORLD 0.5 · '+(renderer.xr.isPresenting?'VR':'PREVIEW'),
        'draw calls: '+renderer.info.render.calls,
        'triangles: '+renderer.info.render.triangles.toLocaleString(),
        'grass blades: '+grass.count.toLocaleString(),
        'flowers: '+flowerCount.toLocaleString(),
        'shader errors: '+(shaderFailed?'YES':'0'),
      ].join('\n');
    }
  });
  let supported=false;
  if(window.isSecureContext&&navigator.xr){
    try{supported=await navigator.xr.isSessionSupported('immersive-vr');}catch{/* Preview remains available. */}
  }
  if(shaderFailed)return;
  if(supported){
    enter.textContent='Enter VR';enter.disabled=false;look.textContent='Look around';look.hidden=false;
    status.textContent='Left stick: move · Right stick: turn · Left grip: run · A: jump';
  }else{
    enter.hidden=true;look.className='primary';look.textContent='Look around';look.hidden=false;
    status.textContent='Open this page in your Quest browser to step inside.';
  }
  if(!shaderFailed)document.body.dataset.state='ready';
  document.body.dataset.mode='preview';
}
start().catch(error=>fail('3D graphics could not start in this browser. Try reloading, or open Celworld in your Quest browser.',error));
