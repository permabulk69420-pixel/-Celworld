import * as THREE from 'three';
import { random, TAU, noise, smoothstep } from './math.js';
import { terrainHeight, reserved, pathDistance, riverDistance, riverWidth, COTTAGE, woodlandAmount, WILLOW } from './land.js';
import { paintedMaterial, grassMaterial } from './materials.js';
import { Sculpture, instances } from './geometry.js';

export function treeLayout() {
  const trees = [
    { x: 28, z: -29, s: 1.65, hero: true },
    { x: -22, z: -2, s: 1.24 },
    { x: -29, z: -26, s: 1.3 },
    { x: 27, z: 15, s: 1.05 },
    { x: -18, z: 33, s: 1.2 },
    { x: 45, z: -5, s: 1.08 },
  ];
  const rng = random(593);
  for (let i = 0; i < 180; i++) {
    const x = (rng() - .5) * 159, z = (rng() - .5) * 155;
    if (Math.hypot(x, z) < 44 || reserved(x, z, 5)) continue;
    if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 10)) continue;
    trees.push({ x, z, s: .76 + rng() * .85 });
    if (trees.length >= 48) break;
  }
  const birches=[[-39,23],[-44,33],[-53,26],[-54,17],[-45,16],[-44,9],[-53,6],[-48,-2],[-39,-7],[-34,-3],[-36,16],[-37,35]];
  birches.forEach(([x,z],i)=>trees.push({x,z,s:.9+(i%4)*.08,kind:'birch'}));
  trees.push({...WILLOW,kind:'willow'});
  return trees;
}

export function makeTrees(scene, trees, colliders) {
  const rng = random(9012);
  const trunks = new Sculpture(paintedMaterial());
  const lobes = [], edgeLeaves = [];
  const palette = ['#587e48', '#6d8e48', '#819e50', '#91ab59', '#74934b', '#a2b76a'];
  const canopy = new THREE.IcosahedronGeometry(1, 2);
  const p = canopy.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + .065 * Math.sin(x * 8 + z * 4) * Math.sin(y * 7 + x * 3);
    p.setXYZ(i, x * n, y * n, z * n);
  }
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p,i).normalize();
    canopy.attributes.normal.setXYZ(i,v.x,v.y,v.z);
  }
  for (const t of trees) {
    const { x, z, s } = t;
    const y = terrainHeight(x, z);
    if(t.kind==='willow')continue;
    if(t.kind==='birch'){
      const nodes=[[x,y,z],[x+.14*s,y+3.1*s,z-.13*s],[x-.16*s,y+6*s,z+.1*s],[x+.13*s,y+8.5*s,z]];
      for(let j=1;j<nodes.length;j++)trunks.beam(nodes[j-1],nodes[j],(.23-j*.044)*s,'#d7d7b4',(.19-j*.038)*s,9);
      for(let j=0;j<15;j++){
        const a=j*2.39996,h=(.35+j*.43)*s,r=(.205-j*.006)*s;
        trunks.box([x+Math.sin(a)*r,y+h,z+Math.cos(a)*r],[.15*s,.023*s,.009*s],'#727969',[0,a,.11]);
      }
      for(let j=0;j<5;j++){
        const a=j*2.39996;
        trunks.beam([x,y+(4.9+j*.37)*s,z],[x+Math.cos(a)*1.55*s,y+(6.45+j*.33)*s,z+Math.sin(a)*1.55*s],.065*s,'#b8bba1',.016*s,5);
      }
      for(let j=0;j<13;j++){
        const a=j*2.39996,r=Math.sqrt(j/12)*1.68*s,size=(.82+rng()*.45)*s;
        lobes.push({position:[x+Math.cos(a)*r,y+(8.2-(j/12)*1.4+rng()*.8)*s,z+Math.sin(a)*r],scale:[size,size*1.06,size*.87],rotation:[.1,rng()*TAU,.15],color:['#87a468','#a8b977','#779a61','#b3c585'][j%4]});
      }
      colliders.push({type:'circle',x,z,radius:.22*s});
      continue;
    }
    const lean = (rng() - .5) * .9 * s;
    trunks.beam([x, y, z], [x + lean * .4, y + 3.2 * s, z - .2 * s], .48 * s, '#685a37', .32 * s, 9);
    trunks.beam([x + lean * .4, y + 3 * s, z - .2 * s], [x + lean, y + 5.5 * s, z + .15 * s], .35 * s, '#796a3c', .14 * s, 8);
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU + .3;
      trunks.beam([x + Math.cos(a) * 1.15 * s, y + .06, z + Math.sin(a) * 1.15 * s], [x, y + .9 * s, z], .08 * s, '#76643d', .25 * s);
    }
    for (let b = 0; b < 5; b++) {
      const a = b / 5 * TAU + .38 + (rng() - .5) * .4;
      const end = [x + Math.cos(a) * 2.2 * s, y + (4.5 + rng() * .9) * s, z + Math.sin(a) * 2.2 * s];
      trunks.beam([x + lean * .5, y + (2.8 + rng()) * s, z], end, .21 * s, '#76613b', .075 * s);
      trunks.beam(end, [end[0] + Math.cos(a) * s, end[1] + .65 * s, end[2] + Math.sin(a) * s], .07 * s, '#827044', .025 * s);
    }
    // A spreading crown: overlapping irregular volumes, with small leaves breaking the silhouette.
    for (let k = 0; k < 17; k++) {
      const a = k * 2.39996;
      const outer = Math.sqrt(k / 16);
      const r = outer * (3.05 + rng() * .55) * s;
      const lx = x + lean + Math.cos(a) * r;
      const lz = z + Math.sin(a) * r * .84;
      const ly = y + (6.35 - outer * 1.1 + rng() * .8) * s;
      const size = (1.25 + rng() * .64) * s;
      const color = palette[Math.floor(rng() * (outer > .78 ? 4 : palette.length))];
      lobes.push({ position: [lx, ly, lz], scale: [size * 1.28, size * .79, size], rotation: [rng() * .35, rng() * TAU, .15], color });
      for (let j = 0; j < 15; j++) {
        const az = rng() * TAU, elev = (rng() - .5) * 2.35;
        const cs = Math.cos(elev);
        const px = lx + Math.cos(az) * cs * size * 1.25;
        const py = ly + Math.sin(elev) * size * .76;
        const pz = lz + Math.sin(az) * cs * size;
        const leafSize = (.17 + rng() * .25) * s;
        edgeLeaves.push({ position: [px, py, pz], scale: [leafSize, leafSize, leafSize], rotation: [rng() * TAU, rng() * TAU, rng() * TAU], color });
      }
    }
    colliders.push({ type: 'circle', x, z, radius: .52 * s });
  }
  trunks.finish(scene, 'Sculpted trunks and spreading roots');
  instances(scene, canopy, paintedMaterial({ leaf: true, wind: .06 }), lobes, 'Layered foliage');
  const leaf = new THREE.BufferGeometry();
  leaf.setAttribute('position', new THREE.Float32BufferAttribute([0,0,-1, -.48,0,-.18, -.3,.05,.45, 0,.08,1, .3,.05,.45, .48,0,-.18],3));
  leaf.setIndex([0,1,5, 1,2,5, 2,4,5, 2,3,4]);
  leaf.computeVertexNormals();
  instances(scene, leaf, paintedMaterial({ leaf: true, wind: .075, side: THREE.DoubleSide }), edgeLeaves, 'Individual canopy leaves');
}

export function makeGrass(scene, trees) {
  const rng = random(8767);
  const material = grassMaterial();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.5,0,0, .5,0,0, -.3,.52,.02, .3,.52,.02, 0,1,.09,
  ],3));
  geometry.setIndex([0,1,2, 1,3,2, 2,3,4]);
  const patches = [];
  let count = 0;
  const c = new THREE.Color(), base = new THREE.Color('#7c9d3a'), light = new THREE.Color('#9aaf4c'), forestGreen=new THREE.Color('#657e49');
  for (let gz = -6; gz <= 6; gz++) for (let gx = -6; gx <= 6; gx++) {
    const cx = gx * 12, cz = gz * 12;
    if (Math.hypot(cx, cz) > 90) continue;
    const offsets = [], blades = [], tints = [];
    for (let i = 0; i < 1750; i++) {
      const x = cx + (rng() - .5) * 12, z = cz + (rng() - .5) * 12;
      if (reserved(x, z, -.12) || riverDistance(x, z) < riverWidth(z) + .5) continue;
      if (Math.abs(x - COTTAGE.x) < 6 && Math.abs(z - COTTAGE.z) < 5) continue;
      if (trees.some(t => Math.hypot(x - t.x, z - t.z) < .6 * t.s)) continue;
      const field = noise(x * .115 + 10, z * .115 + 30);
      const forest = woodlandAmount(x,z);
      const height = (.24 + rng() * .51) * (.67 + field * .7) * (1-forest*.2);
      offsets.push(x, terrainHeight(x, z) - .022, z);
      blades.push(rng() * TAU, height, .062 + rng() * .085, (rng() - .5) * .16);
      c.copy(base).lerp(light, field * .75 + rng() * .2);
      c.lerp(forestGreen,forest*.35);
      c.multiplyScalar(.83 + rng() * .25);
      for (const tree of trees) {
        const d = Math.hypot((x - tree.x - tree.s * 1.8) / (tree.s * 3.9), (z - tree.z + tree.s * 1.4) / (tree.s * 3.2));
        if (d < 1.2) {
          const dapples = noise(x * 1.25 + 8, z * 1.25 - 12);
          c.multiplyScalar(1 - (1 - smoothstep(.25, 1.2, d)) * (.24 + .2 * smoothstep(.32, .72, dapples)));
          break;
        }
      }
      tints.push(c.r, c.g, c.b);
    }
    if (!offsets.length) continue;
    const g = new THREE.InstancedBufferGeometry();
    g.index = geometry.index;
    g.attributes.position = geometry.attributes.position;
    g.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
    g.setAttribute('blade', new THREE.InstancedBufferAttribute(new Float32Array(blades), 4));
    g.setAttribute('tint', new THREE.InstancedBufferAttribute(new Float32Array(tints), 3));
    g.instanceCount = offsets.length / 3;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, terrainHeight(cx,cz) + .5, cz), 12.5);
    const mesh = new THREE.Mesh(g, material);
    mesh.name = 'Meadow grass ' + gx + ',' + gz;
    scene.add(mesh);
    patches.push({ mesh, x: cx, z: cz });
    count += g.instanceCount;
  }
  return { patches, count };
}

function flowerGeometry(color, petals = 6) {
  const dummy = new THREE.Group(), sculpt = new Sculpture(paintedMaterial({ side: THREE.DoubleSide }));
  sculpt.beam([0,0,0],[.02,.57,0],.012,'#557333',.007,4);
  const leaf = new THREE.BufferGeometry();
  leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,.18,0, -.16,.29,.02, -.08,.35,0, 0,.24,0, .18,.36,-.01, .11,.39,0],3));
  leaf.computeVertexNormals();
  sculpt.add(leaf, '#688540');
  for (let i = 0; i < petals; i++) {
    const a = i / petals * TAU;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0, -.049,.015,.09, -.034,.032,.18, .034,.032,.18, .049,.015,.09],3));
    g.setIndex([0,1,4, 1,2,3, 1,3,4]);
    g.computeVertexNormals();
    sculpt.add(g,color,[.02,.57,0],[1,1,1],[.12,a,0]);
  }
  sculpt.ellipsoid([.02,.586,0],[.051,.025,.051],'#d8aa40',0);
  const mesh = sculpt.finish(dummy, 'flower prototype');
  return mesh.geometry;
}
export function makeFlowers(scene) {
  const rng = random(691);
  const groups = [[],[],[]];
  for (let i = 0; i < 3800; i++) {
    const x = (rng() - .5) * 118, z = (rng() - .5) * 115;
    if (reserved(x,z,.3)) continue;
    const field = noise(x * .13 + 4,z * .13 + 33);
    if (field < .43 && pathDistance(x,z) > 3.3) continue;
    const kind = field > .7 ? 2 : rng() > .3 ? 0 : 1;
    const scale = .65 + rng() * .7;
    groups[kind].push({position:[x,terrainHeight(x,z),z],scale:[scale,scale,scale],rotation:[(rng()-.5)*.18,rng()*TAU,(rng()-.5)*.25]});
  }
  ['#f8f0cc','#eec363','#dd947c'].forEach((color,i) => instances(scene,flowerGeometry(color,i===2?5:7),paintedMaterial({wind:.025,rooted:true,side:THREE.DoubleSide}),groups[i],'Wildflowers '+i));
  return groups.reduce((sum,g)=>sum+g.length,0);
}
