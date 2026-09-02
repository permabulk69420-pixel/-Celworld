import test from 'node:test';
import assert from 'node:assert/strict';
import { Walker, readXRInput, rotateOriginAroundHead, resolveCollision, WALK_SPEED, RUN_SPEED } from '../src/locomotion.js';
import { BRIDGE, bridgeHeight, groundHeight, terrainHeight, SPAWN } from '../src/land.js';

const idle={strafe:0,forward:0,run:false,jump:false};
test('Quest Touch sticks, grip and A are mapped by handedness, independent of source ordering',()=>{
  const buttons=Array.from({length:6},()=>({pressed:false}));
  const right={handedness:'right',gamepad:{axes:[0,0,.84,0],buttons:buttons.map((b,i)=>({pressed:i===4}))}};
  const left={handedness:'left',gamepad:{axes:[0,0,0,-1],buttons:buttons.map((b,i)=>({pressed:i===1}))}};
  const input=readXRInput([right,{handedness:'none'},left]);
  assert.equal(input.forward,1);assert.equal(input.strafe,0);
  assert.ok(input.turn>0);assert.equal(input.run,true);assert.equal(input.jump,true);
});
test('resting stick drift produces no motion',()=>{
  assert.deepEqual(readXRInput([{handedness:'left',gamepad:{axes:[0,0,.05,-.08],buttons:[]}}]),{strafe:0,forward:0,turn:0,run:false,jump:false});
});
test('turning preserves a physically offset headset position',()=>{
  const root={x:5,z:9},local={x:1.2,z:-.7},head={x:root.x+local.x,z:root.z+local.z};
  const angle=.8,c=Math.cos(angle),s=Math.sin(angle),result=rotateOriginAroundHead(root,head,angle);
  assert.ok(Math.abs(result.x+c*local.x+s*local.z-head.x)<1e-9);
  assert.ok(Math.abs(result.z-s*local.x+c*local.z-head.z)<1e-9);
});
test('diagonal motion is normalized and sprint is faster than walking',()=>{
  const walk=new Walker(0,0,[],()=>0),run=new Walker(0,0,[],()=>0);
  for(let i=0;i<144;i++){walk.step(1/72,{...idle,strafe:1,forward:1});run.step(1/72,{...idle,strafe:1,forward:1,run:true});}
  assert.ok(Math.hypot(walk.vx,walk.vz)<=WALK_SPEED+1e-8);
  assert.ok(Math.hypot(run.vx,run.vz)<=RUN_SPEED+1e-8);
  assert.ok(Math.hypot(run.x,run.z)>Math.hypot(walk.x,walk.z)*2);
});
test('holding jump yields one jump and a stable landing',()=>{
  const walker=new Walker(0,0,[],()=>0);let peak=0;
  for(let i=0;i<200;i++){walker.step(1/72,{...idle,jump:true});peak=Math.max(peak,walker.y);}
  assert.ok(peak>.7&&peak<1);assert.equal(walker.y,0);assert.equal(walker.grounded,true);
  walker.step(1/72,idle);walker.step(1/72,{...idle,jump:true});assert.ok(walker.y>0);
});
test('sprinting cannot tunnel through a narrow wall',()=>{
  const walker=new Walker(0,0,[{type:'box',x:0,z:-2,halfX:4,halfZ:.07,angle:0}],()=>0);
  for(let i=0;i<200;i++)walker.step(.05,{...idle,forward:1,run:true});
  assert.ok(walker.z>=-1.7-1e-8);
});
test('the full bridge crossing has a continuous supported floor',()=>{
  const start=BRIDGE.x-BRIDGE.halfLength-1;
  let previous=groundHeight(start,BRIDGE.z);
  for(let x=start;x<BRIDGE.x+BRIDGE.halfLength+1;x+=.05){
    const h=groundHeight(x,BRIDGE.z);
    assert.ok(Number.isFinite(h));assert.ok(Math.abs(h-previous)<.16,'floor step at '+x);previous=h;
    const bridge=bridgeHeight(x,BRIDGE.z);if(bridge!==null)assert.ok(h>=bridge-1e-9);
  }
});
test('spawn stands on dry ground, collisions never yield NaNs',()=>{
  assert.ok(terrainHeight(SPAWN.x,SPAWN.z)>.3);
  const p=resolveCollision(1,1,[{type:'circle',x:1,z:1,radius:1}]);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
});
