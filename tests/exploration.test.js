import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';
import { Walker, resolveCollision } from '../src/locomotion.js';
import { COTTAGE, COTTAGE_FLOOR, cottageLocal, cottageWorld, groundHeight, LANDING, WOODLAND_PATH } from '../src/land.js';

const world=createWorld();
world.scene.updateMatrixWorld(true);
const input={strafe:0,forward:1,run:false,jump:false};
const forward={x:-Math.sin(COTTAGE.rotation),z:-Math.cos(COTTAGE.rotation)};

test('the cottage doorway is visibly open and a standing player can enter and leave',()=>{
  const p=cottageWorld(-.8,4.5),walker=new Walker(p.x,p.z,world.colliders);
  for(let i=0;i<145;i++)walker.step(1/72,input,forward);
  const inside=cottageLocal(walker.x,walker.z);
  assert.ok(inside.z<.4,'walk through the doorway');
  assert.ok(Math.abs(inside.x+.8)<.01);
  assert.ok(Math.abs(walker.y-COTTAGE.y-COTTAGE_FLOOR)<1e-5);
  for(let i=0;i<145;i++)walker.step(1/72,{...input,forward:-1},forward);
  assert.ok(cottageLocal(walker.x,walker.z).z>4.2,'walk back out');
  const origin=cottageWorld(-.8,4.4);
  const ray=new THREE.Raycaster(new THREE.Vector3(origin.x,COTTAGE.y+1.95,origin.z),new THREE.Vector3(forward.x,0,forward.z));
  const hits=ray.intersectObject(world.scene.getObjectByName('The meadow cottage'));
  assert.ok(hits.length>0&&hits[0].distance>6,'no plaster or trim blocks the doorway');
});

test('the cottage side walls and window sills still block the player',()=>{
  for(const [x,z,direction] of [[2.8,1.9,[1,0]],[-2.8,-.8,[-1,0]],[.8,-2.1,[0,-1]]]){
    const p=cottageWorld(x,z),walker=new Walker(p.x,p.z,world.colliders);
    const c=Math.cos(COTTAGE.rotation),s=Math.sin(COTTAGE.rotation);
    for(let i=0;i<180;i++)walker.step(1/72,{...input,run:true},{x:c*direction[0]+s*direction[1],z:-s*direction[0]+c*direction[1]});
    const local=cottageLocal(walker.x,walker.z);
    assert.ok(Math.abs(local.x)<3.2&&local.z>-2.66);
  }
});

test('the waterside landing has a supported approach without invisible rock collisions',()=>{
  const walker=new Walker(LANDING.approachX-.5,LANDING.z,world.colliders);
  for(let i=0;i<210;i++)walker.step(1/72,input,{x:1,z:0});
  assert.ok(walker.x>LANDING.x-.5,'reach the platform');
  assert.ok(Math.abs(walker.z-LANDING.z)<.02);
  assert.ok(Math.abs(walker.y-LANDING.y)<.002);
  let previous=groundHeight(LANDING.approachX-.2,LANDING.z);
  for(let x=LANDING.approachX-.2;x<LANDING.x;x+=.035){
    const height=groundHeight(x,LANDING.z);
    assert.ok(Math.abs(height-previous)<.1,'no abrupt step on the approach');previous=height;
  }
});

test('the woodland trail centre remains clear of trees, logs and benches',()=>{
  for(let i=1;i<WOODLAND_PATH.length;i++){
    const [ax,az]=WOODLAND_PATH[i-1],[bx,bz]=WOODLAND_PATH[i];
    const count=Math.ceil(Math.hypot(bx-ax,bz-az)*5);
    for(let j=0;j<=count;j++){
      const x=ax+(bx-ax)*j/count,z=az+(bz-az)*j/count;
      const p=resolveCollision(x,z,world.colliders);
      assert.ok(Math.hypot(p.x-x,p.z-z)<.015,`clear trail at ${x.toFixed(2)}, ${z.toFixed(2)}`);
    }
  }
});
