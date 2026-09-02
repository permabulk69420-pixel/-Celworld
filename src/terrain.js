import * as THREE from 'three';
import { terrainHeight, pathDistance, riverX, riverWidth, riverDistance, WATER_Y } from './land.js';
import { fbm, noise, random, lerp, smoothstep, TAU } from './math.js';
import { paintedMaterial, waterMaterial } from './materials.js';
import { instances } from './geometry.js';

export function makeTerrain(scene, trees) {
  const geometry = new THREE.PlaneGeometry(212, 212, 212, 212);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const green = new THREE.Color('#819f4e'), light = new THREE.Color('#b0b966');
  const dark = new THREE.Color('#56845b'), earth = new THREE.Color('#c2ae7e');
  const bank = new THREE.Color('#93a76d');
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i), h = terrainHeight(x, z);
    position.setY(i, h);
    const patch = fbm(x * .073 + 40, z * .073 + 20);
    c.copy(green).lerp(patch > .48 ? light : dark, Math.abs(patch - .48) * 2.7);
    c.multiplyScalar(.96 + .09 * noise(x * .7, z * .7));
    const rd = riverDistance(x, z) - riverWidth(z);
    c.lerp(bank, (1 - smoothstep(0, 1.5, Math.abs(rd))) * .62);
    const pd = pathDistance(x, z) + (noise(x * 1.8, z * 1.8) - .5) * .38;
    c.lerp(earth, 1 - smoothstep(.72, 1.52, pd));
    if (rd < 0) c.lerp(earth, .55);
    let shadow = 0;
    for (const t of trees) {
      const d = Math.hypot((x - t.x - t.s * 1.8) / (t.s * 3.9), (z - t.z + t.s * 1.4) / (t.s * 3.2));
      shadow = Math.max(shadow, (1 - smoothstep(.25, 1.2, d)) * .33);
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

  const riverPositions = [], riverUV = [], indices = [];
  for (let i = 0; i <= 360; i++) {
    const z = -108 + i * .6;
    const x = riverX(z);
    const banks = [-1,1].map(side => {
      let low = riverWidth(z) * .4, high = riverWidth(z) + 7;
      for (let n = 0; n < 12; n++) {
        const d = (low + high) * .5;
        if (terrainHeight(x + side * d, z) < WATER_Y + .07) low = d; else high = d;
      }
      return x + side * (high + .15);
    });
    riverPositions.push(banks[0], WATER_Y, z, banks[1], WATER_Y, z);
    riverUV.push(0, i / 12, 1, i / 12);
    if (i < 360) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const riverGeometry = new THREE.BufferGeometry();
  riverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3));
  riverGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(riverUV, 2));
  riverGeometry.setIndex(indices);
  riverGeometry.computeVertexNormals();
  const water = new THREE.Mesh(riverGeometry, waterMaterial());
  water.name = 'The winding stream';
  scene.add(water);
  return mesh;
}

export function makeHills(scene) {
  const rng = random(831);
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
