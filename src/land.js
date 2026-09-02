import { smoothstep, lerp, fbm, segmentDistance } from './math.js';

export const WATER_Y = .18;
export const WORLD_RADIUS = 88;
export const TERRAIN_SIZE = 212;
export const COTTAGE = { x: 16, z: -19, y: 2.55, rotation: -.12 };
export const COTTAGE_FLOOR = .324;
export const LANDING = { x: -2.85, z: 26, y: 1.24, halfX: 1.85, halfZ: 1.65, approachX: -8.1, approachHalfWidth: .83 };
export const WILLOW = { x: -9.2, z: 23, s: 1.12 };
export const GARDEN = { x: 22, z: -4.5, y: 1.84, halfX: 4.2, halfZ: 5.0 };
export const GARDEN_BEDS = [[19.35,-3.55],[24.65,-3.55],[19.35,-7.0],[24.65,-7.0]];
export const GARDEN_PATH = [[8,19],[12,11],[17,5],[22,2.5],[22,-11],[21,-12]];
export const CLEARING = { x: -60, z: 12, y: 1.88, radius: 3.85 };
export const CLEARING_PATH = [[-49,12],[-53,12],[-56.65,12]];
export const HIGHLAND = { x: 30, z: -70, y: 3.15, radiusX: 18, radiusZ: 14 };
export const WINDMILL = { x: 39, z: -68, rotation: 2.46 };
export const HIGHLAND_PATH = [
  [27,-45],[29,-49],[30,-53],[31,-57],[31,-61],[26,-65],[23,-71],
  [26,-77],[32,-79],[39,-78],[45,-72],[45,-65],[39,-61],[34,-61],[31,-57],
];
export const WINDMILL_PATH = [[34,-61],[36,-63],[36.6,-65.8]];
export const ORCHARD_TREES = [
  [19.5,-65,.72],[19.3,-71,.82],[21,-77,.7],[28.5,-66.6,.76],
  [25.3,-73,.86],[27.4,-78.4,.7],[31.5,-69.5,.8],[32.2,-75,.72],
  [38,-61.8,.78],[44.7,-63.5,.7],[46.8,-69,.82],[43.7,-75.3,.77],
];
export const BRIDGE = { x: riverX(4), z: 4, halfLength: 5.7, halfWidth: 1.24 };
export const SPAWN = { x: 9.5, z: 22 };
export function riverX(z) { return -8 + Math.sin(z * .047 + .15) * 8 + Math.sin(z * .019) * 2; }
export function riverWidth(z) { return 2.35 + Math.sin(z * .039 + 1.7) * .38 + 1.7 * Math.exp(-(((z - 26) / 8.5) ** 2)); }
export function riverDistance(x, z) { return Math.abs(x - riverX(z)); }

const path = [
  [12, 39], [12, 28], [8, 19], [3, 11], [BRIDGE.x + 5.7, 4],
  [BRIDGE.x - 5.7, 4], [-17, 10], [-21, 22], [-31, 30],
];
const cottagePath = [
  [BRIDGE.x + 5.7, 4], [3, 1], [8, -4], [11, -9], [15, -12.5],
  [22, -12], [29, -18], [33, -30], [27, -45],
];
export const WOODLAND_PATH = [[-21,22],[-31,30],[-41,29],[-49,20],[-49,8],[-43,-3],[-34,-9],[-25,-5],[-17,10]];
const landingPath = [[-21,22],[-17,24],[-12,26],[LANDING.approachX,LANDING.z]];
export function woodlandAmount(x, z) {
  return 1 - smoothstep(.5, 1.2, Math.hypot((x + 42) / 17, (z - 14) / 26));
}
export function pathDistance(x, z) {
  let d = Infinity;
  for (const line of [path, cottagePath, WOODLAND_PATH, landingPath, GARDEN_PATH, CLEARING_PATH, HIGHLAND_PATH, WINDMILL_PATH]) {
    for (let i = 1; i < line.length; i++) d = Math.min(d, segmentDistance(x, z, ...line[i - 1], ...line[i]));
  }
  d = Math.min(d, Math.abs(Math.hypot(x-CLEARING.x,z-CLEARING.z)-2.85));
  return d;
}
export function inGarden(x,z,margin=0) {
  return Math.abs(x-GARDEN.x)<GARDEN.halfX+margin && Math.abs(z-GARDEN.z)<GARDEN.halfZ+margin;
}
export function inClearing(x,z,margin=0) {
  return Math.hypot(x-CLEARING.x,z-CLEARING.z)<CLEARING.radius+margin;
}
export function highlandAmount(x,z) {
  const distance=Math.hypot((x-HIGHLAND.x)/HIGHLAND.radiusX,(z-HIGHLAND.z)/HIGHLAND.radiusZ);
  return 1-smoothstep(.68,1.18,distance);
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
  // Gently settle the garden and well into the land. The same triangles are used
  // for rendering, planting and walking; neither destination is a floating slab.
  const garden = Math.max(Math.abs(x-GARDEN.x)/GARDEN.halfX,Math.abs(z-GARDEN.z)/GARDEN.halfZ);
  h = lerp(h,GARDEN.y,1-smoothstep(.9,1.65,garden));
  const glade = Math.hypot(x-CLEARING.x,z-CLEARING.z);
  h = lerp(h,CLEARING.y,1-smoothstep(CLEARING.radius,CLEARING.radius+2.7,glade));
  // A broad ridge hides the orchard floor from the lower meadow. Its path rises
  // gently over the crest before the terrain settles into the sheltered basin.
  const ridge=Math.exp(-(((z+54)/5.5)**2))*(1-smoothstep(17,43,Math.abs(x-HIGHLAND.x)));
  h+=ridge*2.55;
  const basin=Math.hypot((x-HIGHLAND.x)/HIGHLAND.radiusX,(z-HIGHLAND.z)/HIGHLAND.radiusZ);
  const basinFloor=HIGHLAND.y+(fbm(x*.09+120,z*.09-70)-.5)*.24;
  h=lerp(h,basinFloor,1-smoothstep(.72,1.12,basin));
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

export function cottageLocal(x, z) {
  const dx = x - COTTAGE.x, dz = z - COTTAGE.z, c = Math.cos(COTTAGE.rotation), s = Math.sin(COTTAGE.rotation);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}
export function cottageWorld(x, z) {
  const c = Math.cos(COTTAGE.rotation), s = Math.sin(COTTAGE.rotation);
  return { x: COTTAGE.x + x * c + z * s, z: COTTAGE.z - x * s + z * c };
}
export function cottageFloorHeight(x, z) {
  const p = cottageLocal(x, z);
  if (Math.abs(p.x) < 3.48 && p.z > -3.02 && p.z < 3.0) return COTTAGE.y + COTTAGE_FLOOR;
  for (let i = 0; i < 3; i++) {
    const center = 3.15 + i * .34;
    if (Math.abs(p.x + .8) < .86 + i * .06 && Math.abs(p.z - center) < .2) return COTTAGE.y + .3 - i * .1;
  }
  return null;
}
export function landingHeight(x, z) {
  if (Math.abs(x - LANDING.x) <= LANDING.halfX && Math.abs(z - LANDING.z) <= LANDING.halfZ) return LANDING.y;
  const edge = LANDING.x - LANDING.halfX;
  if (x >= LANDING.approachX && x < edge && Math.abs(z - LANDING.z) <= LANDING.approachHalfWidth) {
    const t = (x - LANDING.approachX) / (edge - LANDING.approachX);
    return Math.max(terrainHeight(x, z) + .035, lerp(terrainHeight(LANDING.approachX, LANDING.z) + .035, LANDING.y, t));
  }
  return null;
}
export function onLanding(x,z,margin=0) {
  return (Math.abs(x-LANDING.x)<LANDING.halfX+margin && Math.abs(z-LANDING.z)<LANDING.halfZ+margin)
    || (x>LANDING.approachX-margin && x<LANDING.x-LANDING.halfX+margin && Math.abs(z-LANDING.z)<LANDING.approachHalfWidth+margin);
}
export function groundHeight(x, z) {
  const bridge = bridgeHeight(x, z);
  return Math.max(terrainHeight(x, z), bridge ?? -Infinity, cottageFloorHeight(x, z) ?? -Infinity, landingHeight(x, z) ?? -Infinity);
}
export function reserved(x, z, margin = 0) {
  if(inGarden(x,z,Math.max(0,margin)) || inClearing(x,z,Math.max(0,margin)))return true;
  if (onLanding(x,z,Math.max(0,margin)+.12)) return true;
  if (terrainHeight(x, z) < WATER_Y + .09) return true;
  if (riverDistance(x, z) < riverWidth(z) + margin) return true;
  if (pathDistance(x, z) < 1.2 + margin) return true;
  if (Math.abs(x - COTTAGE.x) < 5.1 + margin && Math.abs(z - COTTAGE.z) < 4.8 + margin) return true;
  if (Math.hypot(x-WINDMILL.x,z-WINDMILL.z)<2.9+Math.max(0,margin))return true;
  return false;
}
