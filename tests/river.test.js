import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeTerrain } from '../src/terrain.js';
import { makeGrass, makeFlowers } from '../src/vegetation.js';
import { terrainHeight, riverX, riverWidth, riverBankX, WATER_Y, TERRAIN_SIZE } from '../src/land.js';

const scene = new THREE.Scene();
makeTerrain(scene, []);
const water = scene.getObjectByName('The winding stream').geometry;

test('both banks contain the river, including the formerly flooded western bend', () => {
  for (let z = -103; z <= 103; z += .5) {
    assert.ok(terrainHeight(riverX(z), z) < WATER_Y - .2);
    for (const side of [-1, 1]) {
      const edge = riverBankX(z, side);
      assert.ok(Math.abs(terrainHeight(edge, z) - WATER_Y) < .001, `shore at ${edge}, ${z}`);
      assert.ok(terrainHeight(edge + side * .4, z) > WATER_Y, `dry bank at ${edge}, ${z}`);
      for (let d = riverWidth(z) + 7; d < riverWidth(z) + 15; d += .5) {
        assert.ok(terrainHeight(riverX(z) + side * d, z) > WATER_Y, `floodplain at ${z}`);
      }
    }
  }
});

test('every exposed water edge meets the rendered ground; no floating strip edges', () => {
  const p = water.attributes.position, edges = new Map();
  const key = i => [p.getX(i), p.getZ(i)].map(n => n.toFixed(4)).join(',');
  for (let i = 0; i < p.count; i += 3) {
    for (let j = 0; j < 3; j++) {
      const a = i + j, b = i + (j + 1) % 3;
      const id = [key(a), key(b)].sort().join('|');
      if (edges.has(id)) edges.get(id).count++;
      else edges.set(id, { a, b, count: 1 });
    }
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    assert.ok(terrainHeight(x, z) <= WATER_Y + .00002, 'water only covers its submerged bed');
  }
  let bankEdges = 0;
  for (const { a, b, count } of edges.values()) {
    if (count !== 1) continue;
    if (Math.abs(p.getZ(a)) > TERRAIN_SIZE / 2 - .01 && Math.abs(p.getZ(b)) > TERRAIN_SIZE / 2 - .01) continue;
    bankEdges++;
    for (const i of [a, b]) {
      assert.ok(Math.abs(terrainHeight(p.getX(i), p.getZ(i)) - WATER_Y) < .00002, 'bank and water must touch');
    }
  }
  assert.ok(bankEdges > 500, 'inspect the entire winding shoreline');
});

test('grass and meadow flowers are planted above the actual waterline', () => {
  const { patches } = makeGrass(scene, []);
  for (const { mesh } of patches) {
    const roots = mesh.geometry.attributes.offset;
    for (let i = 0; i < roots.count; i++) assert.ok(roots.getY(i) > WATER_Y + .05);
  }
  makeFlowers(scene);
  const matrix = new THREE.Matrix4();
  scene.traverse(mesh => {
    if (!mesh.name.startsWith('Wildflowers ')) return;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      assert.ok(matrix.elements[13] > WATER_Y + .08);
    }
  });
});
