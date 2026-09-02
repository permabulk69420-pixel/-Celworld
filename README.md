# Celworld

[Open Celworld in your Quest browser](https://permabulk69420-pixel.github.io/-Celworld/)

A small, sunlit, Ghibli-inspired world built in Three.js for Meta Quest 3. The valley is a place to wander: thick moving grass, wildflowers, spreading trees, a winding stream, a wooden bridge, and an ivy-covered, clay-roofed cottage.

![The meadow valley](docs/valley.jpg)

Local scene renders use the project's geometry and material appearance. They are visual checks, not browser or headset captures. [Standing-height view](docs/standing-view.jpg) · [The repaired river bend](docs/riverbank.jpg) · [Cottage details](docs/cottage.jpg).

## Version 0.2 — riverbanks and a richer meadow

- The western river bend now has a raised, dry bank. The water is clipped directly against the ground triangles, eliminating the floating edge where the meadow used to dip below the water level.
- Grass, flowers, stones and player ground sampling share the rendered terrain surface. Meadow plants stay clear of the actual waterline.
- Depth-coloured shallows, broken shoreline foam, quiet reflection colours, flowing glints and patches of gravel give the stream more detail.
- Ferns, cattails, blue and lavender lupines, rounded shrubs and pale hydrangeas fill out the banks, woodland floor and cottage garden.
- Deeper foliage colours, irregular crowns and matching dappled shade on grass and ground add depth. Flower and fern roots stay anchored as their leaves move in the breeze.
- The cottage has a tiled door canopy, lantern, extra shuttered windows, climbing ivy, a rain pipe and stepping stones.

The movement and controller settings are unchanged.

## Play

Open the deployed GitHub Pages site in the Quest browser and choose **Enter VR**. Use Touch controllers:

| Control | Action |
| --- | --- |
| Left stick | Smooth, head-relative movement |
| Right stick | Smooth turning |
| Left grip, or left stick click | Hold to run |
| A | Jump |
| Quest system menu | Leave the VR session |

Movement uses real-world metres and a floor reference space. Turning pivots around the headset, including when you have moved away from the centre of your play area. Jumping has gravity and requires a new button press for each jump.

On a phone or computer, **Look around** opens a simple orbit view of the same scene. Drag to rotate; pinch or scroll to move closer.

## Development

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
```

The deployment workflow builds on every push to `main` and publishes `dist/` to GitHub Pages. Keep **Settings → Pages → Source** set to **GitHub Actions**. The relative asset base supports this repository's Pages subdirectory.

All runtime code is bundled locally. There are no remote model, texture, font, or controller-asset dependencies and no API keys.

## Direction

Keep this an inviting world first. The visual language is warm cream and clay architecture, layered green foliage, broad painted light and shadow, turquoise water, and a large summer sky. Work in believable human scale. Preserve the quiet atmosphere and add detail to places a player can actually visit.

The starting scope is scenery and locomotion. Future iterations can extend the valley with an accessible cottage interior, a woodland trail, a small clearing, and environmental sound. New mechanics should follow a conversation with the user.

## Source map

| File | Responsibility |
| --- | --- |
| `src/world.js` | Assembles the scene; also usable without a browser |
| `src/land.js` | Shared terrain, stream, path and bridge height functions |
| `src/materials.js` | Painted lighting, wind, grass, water and distance haze |
| `src/terrain.js` | Ground, stream surface and layered distant hills |
| `src/vegetation.js` | Trees, canopy leaves, grass patches and wildflowers |
| `src/undergrowth.js` | Ferns, reeds, lupines, shrubs and hydrangeas |
| `src/props.js` | Cottage, tile roof, bridge, stones, fence and bench |
| `src/atmosphere.js` | Sky, clouds, chimney smoke, birds and butterflies |
| `src/locomotion.js` | Controller mapping, collision and player motion |
| `src/xr-pose.js` | Current headset pose in the locomotion rig's world space |
| `src/main.js` | Renderer, XR lifecycle, hand silhouettes and orbit preview |

## Rendering approach

- Instanced, opaque grass blades with wind calculated on the GPU.
- Grass is grouped into spatial patches, culled by distance, and shrinks away between 40–60 metres.
- Instanced foliage, leaves, stones and flowers; static architectural details are merged.
- Detailed fern instances use spatial batches for frustum culling. The water remains a single opaque surface, with no extra reflection render pass.
- Three-tone lighting, layered haze and baked ground colour provide depth without full-screen effects.
- No screen-space reflections, bloom, real-time shadow passes, or alpha-cutout grass.
- Quest settings request 72 Hz when supported, a 0.95 framebuffer scale and fixed foveation of 0.7.

The owner reported that the initial build looks and runs well on Quest 3. That feedback is not a measured frame-rate claim; this graphics update still needs an on-device performance check.

## Validation

`npm test` runs 13 checks covering controller handedness, stick drift, headset-centred turning, diagonal speed, sprinting, single-press jumping, narrow-wall collisions, a continuous bridge floor, current headset pose transforms and tracking loss. River regressions check both banks along the stream, every exposed water edge against the ground, and the actual grass and flower instances for submerged roots.

Add `?inspect=1` to show a small diagnostic overlay with draw calls, submitted triangles, vegetation counts and shader errors. Keep this information out of the normal experience.

### Current limits

- The cottage currently has an exterior only.
- The stream is shallow and walkable.
- There is no saved player position; a new VR session starts at the meadow path.
- The provided browser preview has WebGL disabled. Local scene renders inspect the source geometry and material appearance, but do not verify WebGL execution or a headset session.
