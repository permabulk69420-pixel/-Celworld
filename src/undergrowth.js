import * as THREE from 'three';
import { random, noise, TAU } from './math.js';
import { terrainHeight, pathDistance, riverBankX, reserved, WATER_Y, COTTAGE, BRIDGE } from './land.js';
import { paintedMaterial } from './materials.js';
import { Sculpture, instances, spatialInstances } from './geometry.js';

function foldedLeaf(length, width, lift = .035) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, -width, lift * .35, length * .42,
    0, lift, length * .53, width, lift * .35, length * .42,
    0, lift * .45, length,
  ], 3));
  g.setIndex([0, 1, 2, 0, 2, 3, 1, 4, 2, 2, 4, 3]);
  g.computeVertexNormals();
  return g;
}

function fernGeometry() {
  const s = new Sculpture(paintedMaterial({ side: THREE.DoubleSide }));
  const rng = random(715);
  for (let frond = 0; frond < 6; frond++) {
    const angle = frond / 6 * TAU + .18;
    const reach = .67 + rng() * .34;
    const point = t => [Math.sin(angle) * t * reach, .07 + Math.sin(t * 2.15) * .54, Math.cos(angle) * t * reach];
    for (let j = 1; j <= 7; j++) {
      const t = j / 8, p = point(t), previous = point((j - 1) / 8);
      const stem = new THREE.BufferGeometry();
      const dx = Math.cos(angle) * .004, dz = -Math.sin(angle) * .004;
      stem.setAttribute('position', new THREE.Float32BufferAttribute([
        previous[0]-dx, previous[1], previous[2]-dz, previous[0]+dx, previous[1], previous[2]+dz,
        p[0]-dx, p[1], p[2]-dz, p[0]+dx, p[1], p[2]+dz,
      ], 3));
      stem.setIndex([0, 2, 1, 1, 2, 3]); stem.computeVertexNormals();
      s.add(stem, '#7e9c50');
      const length = (.06 + Math.sin(t * Math.PI) * .25) * reach;
      for (const side of [-1, 1]) {
        s.add(foldedLeaf(length, length * .23, .021), j % 3 ? '#648747' : '#88a554', p,
          [1, 1, 1], [-.15, angle + side * .95, side * .14]);
      }
    }
    s.add(foldedLeaf(.16, .033), '#8da955', point(.88), [1, 1, 1], [.15, angle, 0]);
  }
  return s.finish(new THREE.Group(), 'fern prototype').geometry;
}

function reedGeometry() {
  const s = new Sculpture(paintedMaterial({ side: THREE.DoubleSide }));
  const rng = random(383);
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.39996, h = .76 + rng() * .6;
    const positions = [], indices = [];
    for (let j = 0; j <= 4; j++) {
      const t = j / 4, reach = .44 * t * t, width = .035 * Math.sin((t + .12) * Math.PI / 1.12);
      for (const side of [-1, 1]) positions.push(
        Math.sin(angle) * reach + Math.cos(angle) * width * side,
        h * (t - t * t * .22),
        Math.cos(angle) * reach - Math.sin(angle) * width * side,
      );
      if (j < 4) { const a = j * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const leaf = new THREE.BufferGeometry();
    leaf.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    leaf.setIndex(indices); leaf.computeVertexNormals();
    s.add(leaf, i % 2 ? '#75944f' : '#8ba25a');
  }
  for (let i = 0; i < 3; i++) {
    const x = (rng() - .5) * .3, z = (rng() - .5) * .3, h = .95 + rng() * .48;
    s.beam([x, 0, z], [x + .035, h, z], .011, '#6d8050', .007, 4);
    s.beam([x + .035, h - .07, z], [x + .045, h + .18, z], .037, '#826444', .029, 6);
    s.beam([x + .045, h + .16, z], [x + .047, h + .29, z], .008, '#b19b69', .002, 3);
  }
  return s.finish(new THREE.Group(), 'reed prototype').geometry;
}

function lupineGeometry() {
  const s = new Sculpture(paintedMaterial({ side: THREE.DoubleSide }));
  s.beam([0, 0, 0], [.035, .98, 0], .012, '#658252', .006, 4);
  for (let i = 0; i < 7; i++) {
    s.add(foldedLeaf(.25, .044), '#72934f', [0, .19, 0], [1, 1, 1], [-.45, i / 7 * TAU, 0]);
  }
  const petal = foldedLeaf(.1, .054, .03);
  for (let row = 0; row < 7; row++) {
    const size = 1 - row * .095;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI * .5 + row * .52;
      s.add(petal, row > 4 ? '#bbb9dd' : row % 2 ? '#8199c6' : '#8f92bf',
        [.025 + Math.sin(a) * .012, .48 + row * .07, Math.cos(a) * .012],
        [size, size, size], [-.5, a, 0]);
    }
  }
  return s.finish(new THREE.Group(), 'lupine prototype').geometry;
}

export function makeUndergrowth(scene, trees) {
  const rng = random(202609);
  const ferns = [], reeds = [], lupines = [], bushes = [], buds = [];
  const plant = (list, x, z, scale = 1) => list.push({
    position: [x, terrainHeight(x, z) - .01, z],
    scale: [scale, scale, scale], rotation: [0, rng() * TAU, 0],
  });

  // Small pockets at the water's edge leave the bridge approaches and views open.
  for (let z = -65; z < 70; z += 2.25) for (const side of [-1, 1]) {
    if (Math.abs(z - BRIDGE.z) < 3.8 || noise(z * .16 + 8, side * 4 + 30) < .46) continue;
    const bank = riverBankX(z, side);
    const x = bank + side * (.14 + rng() * .46);
    if (pathDistance(x, z) < 1.7) continue;
    plant(reeds, x, z, .62 + rng() * .34);
    for (let j = 0; j < 3; j++) {
      const fx = bank + side * (.8 + rng() * 1.8), fz = z + (rng() - .5) * 2;
      if (!reserved(fx, fz, .25)) plant(ferns, fx, fz, .72 + rng() * .45);
    }
  }

  // Woodland undergrowth sits in the shade around the roots, with clear paths.
  for (const tree of trees) {
    if (Math.hypot(tree.x, tree.z) > 64) continue;
    for (let i = 0; i < 7; i++) {
      const a = rng() * TAU, d = (1.3 + rng() * 2.7) * tree.s;
      const x = tree.x + Math.cos(a) * d, z = tree.z + Math.sin(a) * d;
      if (!reserved(x, z, .25)) plant(ferns, x, z, .65 + rng() * .62);
    }
  }

  const flowerBeds = [
    [10.2, -13, 2.4], [21.7, -14, 1.6], [23.6, -23.7, 2.1],
    [5.3, 14.7, 2.2], [14.4, 29, 2.4], [-14.5, 9, 1.8], [-22.5, -20, 2.1],
  ];
  for (const [cx, cz, radius] of flowerBeds) {
    for (let i = 0; i < 35; i++) {
      const a = rng() * TAU, d = Math.sqrt(rng()) * radius;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (!reserved(x, z, .1)) plant(lupines, x, z, .78 + rng() * .5);
    }
  }

  // Rounded shrubs give the grass a middle layer and nestle the cottage in green.
  const shrubBeds = [[11.4, -23.3], [20.7, -23.6], [22.1, -17], [26.5, -26.3], [-24.7, -4], [-20, 34.8], [29.7, 16.5], [-17.8, -20]];
  for (let bed = 0; bed < shrubBeds.length; bed++) {
    const [cx, cz] = shrubBeds[bed];
    for (let i = 0; i < 8; i++) {
      const x = cx + (rng() - .5) * 2.6, z = cz + (rng() - .5) * 2;
      if (pathDistance(x, z) < 1.8 || terrainHeight(x, z) < WATER_Y + .25) continue;
      if (Math.abs(x - COTTAGE.x) < 3.8 && Math.abs(z - COTTAGE.z) < 3.5) continue;
      const size = .4 + rng() * .34, y = terrainHeight(x, z) + size * .5;
      bushes.push({ position: [x, y, z], scale: [size * 1.18, size * .83, size], rotation: [.12, rng() * TAU, .16], color: ['#52784b', '#648648', '#809e53'][i % 3] });
      if (bed < 3) for (let j = 0; j < 3; j++) {
        const a = rng() * TAU;
        buds.push({ position: [x + Math.sin(a) * size * .6, y + size * .62, z + Math.cos(a) * size * .6], scale: [.13, .095, .13], color: j % 2 ? '#bfc6dd' : '#d6c5d5' });
      }
    }
  }

  const softLeaves = paintedMaterial({ side: THREE.DoubleSide, wind: .022, rooted: true });
  // Ferns have the most detailed leaves. Spatial batches let the headset skip
  // entire patches behind the player, while the small flower/reed sets stay cheap.
  spatialInstances(scene, fernGeometry(), softLeaves, ferns, 'Ferns along the bank and woodland floor');
  instances(scene, reedGeometry(), paintedMaterial({ side: THREE.DoubleSide, wind: .016, rooted: true }), reeds, 'Riverbank reeds');
  instances(scene, lupineGeometry(), softLeaves, lupines, 'Blue and lavender lupines');
  instances(scene, new THREE.IcosahedronGeometry(1, 1), paintedMaterial({ leaf: true, wind: .016 }), bushes, 'Cottage and woodland shrubs');
  instances(scene, new THREE.IcosahedronGeometry(1, 1), paintedMaterial(), buds, 'Pale hydrangea blossoms');
  return { ferns: ferns.length, reeds: reeds.length, lupines: lupines.length };
}
