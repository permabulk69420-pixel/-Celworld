import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readHeadPose } from '../src/xr-pose.js';

test('current XR head pose keeps room-scale offset and rotated locomotion origin',()=>{
  const rig=new THREE.Group();rig.position.set(20,3,-10);rig.rotation.y=Math.PI/2;rig.updateMatrixWorld(true);
  const ref={},head=new THREE.Vector3(),orientation=new THREE.Quaternion();
  const tracked={position:{x:1,y:1.7,z:-2},orientation:{x:0,y:0,z:0,w:1}};
  const frame={getViewerPose(reference){assert.equal(reference,ref);return {transform:tracked};}};
  assert.equal(readHeadPose(frame,ref,rig,head,orientation),true);
  assert.ok(head.distanceTo(new THREE.Vector3(18,4.7,-11))<1e-9);
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(orientation);
  assert.ok(forward.distanceTo(new THREE.Vector3(-1,0,0))<1e-9);
  tracked.position.x=1.4;tracked.position.z=-2.2;
  readHeadPose(frame,ref,rig,head,orientation);
  assert.ok(head.distanceTo(new THREE.Vector3(17.8,4.7,-11.4))<1e-9);
});
test('tracking loss does not invent a new head position',()=>{
  const head=new THREE.Vector3(4,5,6),orientation=new THREE.Quaternion();
  assert.equal(readHeadPose({getViewerPose:()=>null},{},new THREE.Group(),head,orientation),false);
  assert.deepEqual(head.toArray(),[4,5,6]);
});
