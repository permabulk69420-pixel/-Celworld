import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const up = new THREE.Vector3(0, 1, 0);
export class Sculpture {
  constructor(material) { this.material = material; this.parts = []; }
  add(geometry, color = '#ffffff', position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    g.applyMatrix4(matrix);
    const c = new THREE.Color(color);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.deleteAttribute('uv');
    g.deleteAttribute('uv1');
    this.parts.push(g);
    return this;
  }
  box(position, scale, color, rotation = [0, 0, 0]) { return this.add(new THREE.BoxGeometry(1, 1, 1), color, position, scale, rotation); }
  beam(a, b, radius, color, endRadius = radius, sides = 7) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va);
    const g = new THREE.CylinderGeometry(endRadius, radius, d.length(), sides, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(up, d.normalize());
    g.applyQuaternion(q);
    return this.add(g, color, va.add(vb).multiplyScalar(.5).toArray());
  }
  ellipsoid(position, scale, color, detail = 1) { return this.add(new THREE.IcosahedronGeometry(1, detail), color, position, scale); }
  finish(parent, name) {
    if (!this.parts.length) return null;
    const geometry = mergeGeometries(this.parts, false);
    this.parts.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.name = name;
    geometry.computeBoundingSphere();
    parent.add(mesh);
    return mesh;
  }
}
export function instances(parent, geometry, material, entries, name) {
  const mesh = new THREE.InstancedMesh(geometry, material, entries.length);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  entries.forEach((v, i) => {
    o.position.set(...v.position);
    o.scale.set(...(v.scale || [1, 1, 1]));
    o.rotation.set(...(v.rotation || [0, 0, 0]));
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    if (v.color) mesh.setColorAt(i, c.set(v.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

export function spatialInstances(parent, geometry, material, entries, name, cellSize = 32) {
  const groups = new Map();
  for (const entry of entries) {
    const key = Math.floor(entry.position[0] / cellSize) + ',' + Math.floor(entry.position[2] / cellSize);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return [...groups].map(([key, batch]) => {
    const mesh = instances(parent, geometry, material, batch, name + ' ' + key);
    mesh.boundingSphere.radius += .1;
    return mesh;
  });
}
