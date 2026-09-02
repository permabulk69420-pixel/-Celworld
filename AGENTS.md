# Celworld working direction

This repository is a standalone Three.js VR world for Quest 3. The user's priority is a beautiful, dense, Ghibli-inspired landscape and comfortable smooth locomotion. Read README.md for the current direction, controls, architecture and known limits.

Preserve the GitHub Actions → GitHub Pages deployment. Build from the repository's pinned dependencies and keep assets self-contained. Do not move publication to another host.

Keep rendering and player ground sampling aligned through src/land.js. Treat metre scale, headset-centred turns, controller handedness and XR session cleanup as invariants. Distinguish desktop rendering checks from actual Quest performance.

Put effort into scenery, composition, vegetation and atmosphere. Ask the user before expanding into a different game design. Update README.md when a delivered iteration changes the direction, controls or limitations.
