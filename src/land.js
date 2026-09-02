import { smoothstep, lerp, fbm, segmentDistance } from './math.js';

export const WATER_Y = .18;
export const WORLD_RADIUS = 88;
export const TERRAIN_SIZE = 212;
export const COTTAGE = { x: 16, z: -19, y: 2.55, rotation: -.12 };
export const BRIDGE = { x: riverX(4), z: 4, halfLength: 5.7, halfWidth: 1.24 };
export const SPAWN = { x: 9.5, z: 22 };
export function riverX(z) { return -8 + Math.sin(z * .047 + .15) * 8 + Math.sin(z * .019) * 2; }
export function riverWidth(z) { return 2.35 + Math.sin(z * .039 + 1.7) * .38; }
export function riverDistance(x, z) { return Math.abs(x - riverX(z)); }

const path = [
  [12, 39], [12, 28], [8, 19], [3, 11], [BRIDGE.x + 5.7, 4],
  [BRIDGE.x - 5.7, 4], [-17, 10], [-21, 22], [-31, 30],
];
const cottagePath = [
  [BRIDGE.x + 5.7, 4], [3, 1], [8, -4], [11, -9], [15, -12.5],
  [22, -12], [29, -18], [33, -30], [27, -45],
];
export function pathDistance(x, z) {
  let d = Infinity;
  for (const line of [path, cottagePath]) {
    for (let i = 1; i < line.length; i++) d = Math.min(d, segmentDistance(x, z, ...line[i - 1], ...line[i]));
  }
  return d;
}
export function bridgeHeight(x, z) {
  const dx = Math.abs(x - BRIDGE.x);
  if (dx > BRIDGE.halfLength || Math.abs(z - BRIDGE.z) > BRIDGE.halfWidth) return null;
  return .9 + Math.cos((x - BRIDGE.x) / BRIDGE.halfLength * Math.PI * .5) * .62;
}
function terrainProfile(x, z) {
  const r = Math.hypot(x * .87, z * .83);
  const edge = smoothstep(38, 100, r);
  let h = .9 + Math.sin(x * .055 + 1) * .95 + Math.cos(z * .058) * .6;
  h += (fbm(x * .035 + 50, z * .035 + 40) - .5) * 3.8;
  h += edge * (7 + 12 * fbm(x * .026 + 13, z * .026 + 17));
  // Keep the floodplain above the stream before carving its bed. A low meadow
  // used to leave the left bank submerged, so the water strip ended in mid-air.
  const bankFloor = WATER_Y + .58;
  const aboveBank = h - bankFloor;
  h = bankFloor + (aboveBank + Math.hypot(aboveBank, .35)) * .5;
  const d = riverDistance(x, z), width = riverWidth(z);
  h = lerp(WATER_Y - .58, h, smoothstep(width * .7, width + 3.3, d));
  const bankEnd = Math.abs(Math.abs(x - BRIDGE.x) - BRIDGE.halfLength);
  const approach = (1 - smoothstep(.7, 3.8, bankEnd)) * (1 - smoothstep(1.15, 3.5, Math.abs(z - BRIDGE.z)));
  if (d > width + .25) h = lerp(h, .9, approach);
  const home = Math.max(Math.abs(x - COTTAGE.x) / 6.2, Math.abs(z - COTTAGE.z) / 5.4);
  h = lerp(h, COTTAGE.y, 1 - smoothstep(1, 1.65, home));
  return h;
}

const heights = new Map();
function vertexHeight(x, z) {
  const key = x + ',' + z;
  if (!heights.has(key)) heights.set(key, Math.fround(terrainProfile(x, z)));
  return heights.get(key);
}

// Sample the same one-metre triangles used by the ground mesh, including their
// diagonal. Feet, grass roots, stones and the clipped water now share one surface.
export function terrainHeight(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), u = x - ix, v = z - iz;
  if (u === 0 && v === 0) return vertexHeight(ix, iz);
  const h10 = vertexHeight(ix + 1, iz), h01 = vertexHeight(ix, iz + 1);
  if (u + v <= 1) return vertexHeight(ix, iz) * (1 - u - v) + h10 * u + h01 * v;
  return vertexHeight(ix + 1, iz + 1) * (u + v - 1) + h10 * (1 - v) + h01 * (1 - u);
}

// For bank-side dressing only. Water itself is clipped against every ground
// triangle, so it never relies on a guessed strip width or an arbitrary cutoff.
export function riverBankX(z, side) {
  const center = riverX(z);
  let low = 0, high = riverWidth(z) + 7;
  for (let i = 0; i < 16; i++) {
    const d = (low + high) * .5;
    if (terrainHeight(center + side * d, z) < WATER_Y) low = d;
    else high = d;
  }
  return center + side * high;
}
export function groundHeight(x, z) {
  const bridge = bridgeHeight(x, z);
  return bridge === null ? terrainHeight(x, z) : Math.max(bridge, terrainHeight(x, z));
}
export function reserved(x, z, margin = 0) {
  if (terrainHeight(x, z) < WATER_Y + .09) return true;
  if (riverDistance(x, z) < riverWidth(z) + margin) return true;
  if (pathDistance(x, z) < 1.2 + margin) return true;
  if (Math.abs(x - COTTAGE.x) < 5.1 + margin && Math.abs(z - COTTAGE.z) < 4.8 + margin) return true;
  return false;
}
