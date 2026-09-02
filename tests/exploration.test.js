import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';
import { Walker, resolveCollision } from '../src/locomotion.js';
import { COTTAGE, COTTAGE_FLOOR, cottageLocal, cottageWorld, groundHeight, terrainHeight, LANDING, WOODLAND_PATH, GARDEN, GARDEN_PATH, CLEARING, CLEARING_PATH, HIGHLAND, HIGHLAND_PATH, WINDMILL, WINDMILL_PATH, ORCHARD_TREES } from '../src/land.js';

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

function clearRoute(line) {
  for(let i=1;i<line.length;i++){
    const [ax,az]=line[i-1],[bx,bz]=line[i],count=Math.ceil(Math.hypot(bx-ax,bz-az)*8);
    for(let j=0;j<=count;j++){
      const x=ax+(bx-ax)*j/count,z=az+(bz-az)*j/count,p=resolveCollision(x,z,world.colliders);
      assert.ok(Math.hypot(p.x-x,p.z-z)<.012,`unobstructed route at ${x.toFixed(2)}, ${z.toFixed(2)}`);
    }
  }
}

test('the garden loop and both entrances remain walkable between the planting beds',()=>{
  clearRoute(GARDEN_PATH);
  const walker=new Walker(GARDEN.x,3.6,world.colliders);
  for(let i=0;i<480;i++)walker.step(1/72,input,{x:0,z:-1});
  assert.ok(walker.z<-11,'walk the full garden aisle and leave through the rear');
  assert.ok(Math.abs(walker.x-GARDEN.x)<.01);
  assert.ok(Math.abs(walker.y-groundHeight(walker.x,walker.z))<.02);
});

test('the arbour has standing headroom through its wood, leaves and hanging flowers',()=>{
  const parts=['The cottage kitchen garden','Leaves over the garden arbour','Hanging wisteria flowers'].map(name=>world.scene.getObjectByName(name));
  for(const offset of [-.65,0,.65]){
    const ray=new THREE.Raycaster(new THREE.Vector3(GARDEN.x+offset,GARDEN.y+2.05,2),new THREE.Vector3(0,0,-1),0,4.2);
    assert.equal(ray.intersectObjects(parts).length,0,`clear headroom at aisle offset ${offset}`);
  }
});

test('the well has an accessible approach and a complete walking loop around its walls',()=>{
  clearRoute(CLEARING_PATH);
  const loop=Array.from({length:65},(_,i)=>[CLEARING.x+Math.cos(i*Math.PI/32)*2.85,CLEARING.z+Math.sin(i*Math.PI/32)*2.85]);
  clearRoute(loop);
  const walker=new Walker(-49,12,world.colliders);
  for(let i=0;i<255;i++)walker.step(1/72,input,{x:-1,z:0});
  assert.ok(walker.x<-56.7,'reach the well apron from the woodland trail');
  assert.ok(Math.abs(walker.y-groundHeight(walker.x,walker.z))<.02);
  const water=world.scene.getObjectByName('Water inside the woodland well');
  const walls=world.scene.getObjectByName('Stone walls of the woodland well');
  for(let i=0;i<112;i++){
    const angle=i*Math.PI/56;
    const ray=new THREE.Raycaster(new THREE.Vector3(CLEARING.x,CLEARING.y+.54,CLEARING.z),new THREE.Vector3(Math.sin(angle),0,Math.cos(angle)),0,1.3);
    const hits=ray.intersectObject(walls);
    assert.ok(hits.length&&hits[0].distance<=water.geometry.parameters.radius,
      'stone walls meet the water at every angle, including between the blocks');
  }
});

test('the ridge climb, orchard loop and windmill spur remain clear through their scenery',()=>{
  clearRoute(HIGHLAND_PATH);
  clearRoute(WINDMILL_PATH);
});

test('a player can climb over the ridge and walk the complete orchard circuit',()=>{
  const walker=new Walker(HIGHLAND_PATH[0][0],HIGHLAND_PATH[0][1],world.colliders);
  for(let i=1;i<HIGHLAND_PATH.length;i++){
    const target=HIGHLAND_PATH[i];
    for(let frame=0;frame<900&&Math.hypot(walker.x-target[0],walker.z-target[1])>.19;frame++){
      const dx=target[0]-walker.x,dz=target[1]-walker.z,length=Math.hypot(dx,dz);
      walker.step(1/72,{...input,run:true},{x:dx/length,z:dz/length});
    }
    assert.ok(Math.hypot(walker.x-target[0],walker.z-target[1])<.2,`reach orchard waypoint ${i}`);
    assert.ok(Math.abs(walker.y-groundHeight(walker.x,walker.z))<.025,'feet follow the shared terrain surface');
  }
});

test('the ridge creates a smooth climb and conceals the basin until the crest',()=>{
  let largestStep=0;
  for(let i=1;i<5;i++){
    const [ax,az]=HIGHLAND_PATH[i-1],[bx,bz]=HIGHLAND_PATH[i];
    const count=Math.ceil(Math.hypot(bx-ax,bz-az)*16);
    let previous=terrainHeight(ax,az);
    for(let j=1;j<=count;j++){
      const height=terrainHeight(ax+(bx-ax)*j/count,az+(bz-az)*j/count);
      largestStep=Math.max(largestStep,Math.abs(height-previous));previous=height;
    }
  }
  const start=terrainHeight(...HIGHLAND_PATH[0]);
  const crest=Math.max(...HIGHLAND_PATH.slice(0,4).map(point=>terrainHeight(...point)));
  const basin=terrainHeight(HIGHLAND.x,HIGHLAND.z);
  assert.ok(largestStep<.045,'the climb has no locomotion-sized ledges');
  assert.ok(crest>start+2.5,'the route visibly climbs away from the cottage meadow');
  assert.ok(crest>basin+.5,'the crest stands above and screens the orchard floor');
});

test('the windmill turns above standing head height and keeps a solid tower footprint',()=>{
  const rotor=world.scene.getObjectByName('Turning windmill rotor');
  const sails=world.scene.getObjectByName('Windmill sails and wooden lattice');
  assert.ok(rotor&&sails,'the windmill rotor is part of the live source scene');
  world.animateLife(0);const before=rotor.rotation.z;
  world.animateLife(3);world.scene.updateMatrixWorld(true);
  assert.ok(rotor.rotation.z>before+.25,'the sails turn gently over time');
  const position=sails.geometry.attributes.position,vertex=new THREE.Vector3();
  let lowest=Infinity;
  for(let i=0;i<position.count;i++)lowest=Math.min(lowest,vertex.fromBufferAttribute(position,i).applyMatrix4(sails.matrixWorld).y);
  assert.ok(lowest>terrainHeight(WINDMILL.x,WINDMILL.z)+2.35,'turning sails clear a standing visitor');
  const pushed=resolveCollision(WINDMILL.x,WINDMILL.z,world.colliders);
  assert.ok(Math.hypot(pushed.x-WINDMILL.x,pushed.z-WINDMILL.z)>2.45,'the tower cannot be walked through');
});

test('the hidden basin carries a complete, distance-cullable orchard composition',()=>{
  const orchard=world.scene.getObjectByName('The hidden orchard basin');
  const fruit=world.scene.getObjectByName('Red and golden orchard fruit');
  const wall=world.scene.getObjectByName('Old dry-stone orchard wall');
  assert.ok(orchard&&fruit&&wall,'orchard trees, harvest and boundary are all present');
  assert.ok(fruit.count>=ORCHARD_TREES.length*10,'fruit is distributed throughout the orchard rather than used as a token prop');
  assert.ok(world.details.some(detail=>detail.root===orchard&&detail.distance>=80),'dense basin scenery can be culled from the lower valley');
});
