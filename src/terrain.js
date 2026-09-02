import * as THREE from 'three';
import { terrainHeight, pathDistance, WATER_Y, TERRAIN_SIZE } from './land.js';
import { fbm, noise, lerp, smoothstep, TAU } from './math.js';
import { paintedMaterial, waterMaterial } from './materials.js';

export function makeTerrain(scene, trees) {
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SIZE);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const green = new THREE.Color('#819f4e'), light = new THREE.Color('#b0b966');
  const dark = new THREE.Color('#56845b'), earth = new THREE.Color('#c2ae7e');
  const bank = new THREE.Color('#9da47b'), wetEarth = new THREE.Color('#657d62');
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i), h = terrainHeight(x, z);
    position.setY(i, h);
    const patch = fbm(x * .073 + 40, z * .073 + 20);
    c.copy(green).lerp(patch > .48 ? light : dark, Math.abs(patch - .48) * 2.7);
    c.multiplyScalar(.96 + .09 * noise(x * .7, z * .7));
    const bankTone = 1 - smoothstep(WATER_Y + .12, WATER_Y + .7, h);
    c.lerp(bank, bankTone * .85);
    c.lerp(wetEarth, 1 - smoothstep(WATER_Y - .08, WATER_Y + .12, h));
    const pd = pathDistance(x, z) + (noise(x * 1.8, z * 1.8) - .5) * .38;
    c.lerp(earth, (1 - smoothstep(.72, 1.52, pd)) * smoothstep(WATER_Y + .06, WATER_Y + .3, h));
    let shadow = 0;
    for (const t of trees) {
      const d = Math.hypot((x - t.x - t.s * 1.8) / (t.s * 3.9), (z - t.z + t.s * 1.4) / (t.s * 3.2));
      const canopyShade = 1 - smoothstep(.25, 1.2, d);
      const dapples = noise(x * 1.25 + 8, z * 1.25 - 12);
      shadow = Math.max(shadow, canopyShade * (.24 + .2 * smoothstep(.32, .72, dapples)));
    }
    const houseShade = Math.max(Math.abs(x - 18.7) / 5.4, Math.abs(z + 21.2) / 4.6);
    shadow = Math.max(shadow, (1 - smoothstep(.82,1.17,houseShade)) * .29);
    c.multiplyScalar(1 - shadow);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, paintedMaterial());
  mesh.name = 'Rolling meadow and winding paths';
  scene.add(mesh);

  const water = new THREE.Mesh(makeWaterGeometry(geometry), waterMaterial());
  water.name = 'The winding stream';
  scene.add(water);
  return mesh;
}

export function makeWaterGeometry(ground) {
  const position = ground.attributes.position, index = ground.index.array;
  const vertices = [], depths = [];
  const point = i => [position.getX(i), position.getY(i), position.getZ(i)];
  const emit = p => {
    vertices.push(p[0], WATER_Y, p[2]);
    depths.push(Math.max(0, WATER_Y - p[1]));
  };
  // Clip the wet part of each triangle to the water plane. Shared edges meet at
  // exactly the same ground intersection, even on the formerly flooded bend.
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i], b = index[i + 1], c = index[i + 2];
    if (position.getY(a) >= WATER_Y && position.getY(b) >= WATER_Y && position.getY(c) >= WATER_Y) continue;
    const triangle = [point(a), point(b), point(c)], wet = [];
    for (let j = 0; j < 3; j++) {
      const p = triangle[j], q = triangle[(j + 1) % 3];
      const pWet = p[1] < WATER_Y, qWet = q[1] < WATER_Y;
      if (pWet) wet.push(p);
      if (pWet !== qWet) {
        const t = (WATER_Y - p[1]) / (q[1] - p[1]);
        wet.push([lerp(p[0], q[0], t), WATER_Y, lerp(p[2], q[2], t)]);
      }
    }
    for (let j = 1; j < wet.length - 1; j++) {
      emit(wet[0]); emit(wet[j]); emit(wet[j + 1]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('waterDepth', new THREE.Float32BufferAttribute(depths, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function makeHills(scene) {
  const palette = ['#a7c0c5', '#89acae', '#73998b'];
  for (let layer = 0; layer < 3; layer++) {
    const radius = 335 - layer * 77;
    const sides = 192, rings = 10;
    const positions = [], colors = [], indices = [];
    for (let r = 0; r <= rings; r++) {
      const t = r / rings;
      for (let i = 0; i <= sides; i++) {
        const a = i / sides * TAU;
        const ridge = (30 + 31 * Math.sin(a * 3 + layer) ** 2 + 23 * Math.sin(a * 5.4 + .7) ** 2 + 8 * Math.sin(a * 9.5)) * [1.38,.88,.43][layer];
        const rr = radius - 50 + t * 130;
        const y = -6 + Math.sin(t * Math.PI) ** 1.3 * ridge;
        positions.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
        const c = new THREE.Color(palette[layer]).multiplyScalar(.93 + noise(i * .1, r * .3) * .12);
        colors.push(c.r, c.g, c.b);
        if (r < rings && i < sides) {
          const k = r * (sides + 1) + i;
          indices.push(k, k + 1, k + sides + 1, k + 1, k + sides + 2, k + sides + 1);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    const m = paintedMaterial({ side: THREE.DoubleSide });
    m.uniforms.uFogNear.value = 130;
    m.uniforms.uFogFar.value = 620;
    const mesh = new THREE.Mesh(g, m);
    mesh.name = 'Distant painted hills ' + layer;
    scene.add(mesh);
  }
  // Ground beyond the playable valley closes the horizon without a visible island rim.
  const skirt = new THREE.Mesh(new THREE.CircleGeometry(510, 128), paintedMaterial({ color: '#84aa82' }));
  skirt.rotation.x = -Math.PI / 2;
  skirt.position.y = -7;
  scene.add(skirt);
}
