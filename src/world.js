import * as THREE from 'three';
import { makeTerrain, makeHills } from './terrain.js';
import { treeLayout, makeTrees, makeGrass, makeFlowers } from './vegetation.js';
import { makeCottage, makeBridge, makeStonesAndGarden } from './props.js';
import { makeSky, makeLife } from './atmosphere.js';
import { makeUndergrowth } from './undergrowth.js';
import { makeGrove } from './grove.js';
import { makeGarden } from './garden.js';
import { makeClearing } from './clearing.js';
import { makeHighland } from './highland.js';
import { ORCHARD_TREES } from './land.js';

export function createWorld() {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#a5c6b7');
  const colliders=[],trees=treeLayout();
  const plantingTrees=[...trees,...ORCHARD_TREES.map(([x,z,s])=>({x,z,s}))];
  makeSky(scene);makeHills(scene);makeTerrain(scene,plantingTrees);
  makeTrees(scene,trees,colliders);
  const grass=makeGrass(scene,plantingTrees);
  const flowerCount=makeFlowers(scene);
  const cottage=makeCottage(scene,colliders);
  makeBridge(scene,colliders);makeStonesAndGarden(scene,colliders);
  const undergrowth=makeUndergrowth(scene,trees);
  makeGrove(scene,colliders);
  const garden=makeGarden(scene,colliders),clearing=makeClearing(scene,colliders);
  const highland=makeHighland(scene,colliders),life=makeLife(scene,cottage.smoke);
  const animateLife=t=>{life(t);highland.animate(t);};
  return {scene,colliders,grass,flowerCount:flowerCount+undergrowth.lupines+clearing.bluebells+highland.blossoms,
    garden,undergrowth,details:highland.details,animateLife};
}
