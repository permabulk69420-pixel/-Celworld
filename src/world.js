import * as THREE from 'three';
import { makeTerrain, makeHills } from './terrain.js';
import { treeLayout, makeTrees, makeGrass, makeFlowers } from './vegetation.js';
import { makeCottage, makeBridge, makeStonesAndGarden } from './props.js';
import { makeSky, makeLife } from './atmosphere.js';
import { makeUndergrowth } from './undergrowth.js';
import { makeGrove } from './grove.js';

export function createWorld() {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#a5c6b7');
  const colliders=[],trees=treeLayout();
  makeSky(scene);makeHills(scene);makeTerrain(scene,trees);
  makeTrees(scene,trees,colliders);
  const grass=makeGrass(scene,trees);
  const flowerCount=makeFlowers(scene);
  const cottage=makeCottage(scene,colliders);
  makeBridge(scene,colliders);makeStonesAndGarden(scene,colliders);
  const undergrowth=makeUndergrowth(scene,trees);
  makeGrove(scene,colliders);
  const animateLife=makeLife(scene,cottage.smoke);
  return {scene,colliders,grass,flowerCount:flowerCount+undergrowth.lupines,undergrowth,animateLife};
}
