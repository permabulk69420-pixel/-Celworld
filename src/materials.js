import * as THREE from 'three';

export const time = { value: 0 };
export const eye = { value: new THREE.Vector3() };
export const sun = new THREE.Vector3(-.55, .78, .31).normalize();
export const atmosphere = { color: new THREE.Color('#b4d4cb'), near: 64, far: 245 };
export const animatedMaterials = [];

const fogPars = `
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
`;
const fogApply = `
float mist = smoothstep(uFogNear, uFogFar, length(vWorld - cameraPosition));
gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, mist * .94);
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;
export function paintedMaterial({ color = '#ffffff', wind = 0, leaf = false, clouds = false, rooted = false, side = THREE.FrontSide } = {}) {
  const mat = new THREE.ShaderMaterial({
    side,
    vertexColors: true,
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uTime: time, uSun: { value: sun },
      uWind: { value: wind }, uLeaf: { value: leaf ? 1 : 0 }, uCloud: { value: clouds ? 1 : 0 }, uRooted: { value: rooted ? 1 : 0 },
      uFogColor: { value: atmosphere.color }, uFogNear: { value: atmosphere.near }, uFogFar: { value: atmosphere.far },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uWind;
      uniform float uRooted;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec3 vColor;
      void main() {
        vec3 p = position;
        vec3 n = normal;
        vColor = vec3(1.);
        #ifdef USE_COLOR
          vColor *= color;
        #endif
        #ifdef USE_INSTANCING
          p = (instanceMatrix * vec4(p, 1.)).xyz;
          mat3 im = mat3(instanceMatrix);
          n /= vec3(dot(im[0], im[0]), dot(im[1], im[1]), dot(im[2], im[2]));
          n = im * n;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vColor *= instanceColor;
        #endif
        vec4 wp = modelMatrix * vec4(p, 1.);
        float gust = sin(wp.x * .16 + wp.z * .12 - uTime * 1.3);
        float bend = mix(1., clamp(position.y * position.y, 0., 1.), uRooted);
        wp.x += uWind * bend * (.55 * gust + .23 * sin(wp.z * .44 + uTime * 2.1));
        wp.z += uWind * bend * .26 * gust;
        vWorld = wp.xyz;
        vNormal = normalize(mat3(modelMatrix) * n);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uSun;
      uniform float uLeaf;
      uniform float uCloud;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec3 vColor;
      ${fogPars}
      void main() {
        vec3 n = normalize(vNormal);
        if (!gl_FrontFacing) n *= -1.;
        float d = dot(n, uSun);
        float bands = .6 + .25 * smoothstep(-.2, .05, d) + .21 * smoothstep(.42, .65, d);
        vec3 shade = mix(vec3(.68, .83, .79), vec3(1.08, 1.055, .89), smoothstep(-.28, .6, d));
        float brush = sin(vWorld.x * 2.5 + sin(vWorld.z * 2.7)) * sin(vWorld.y * 4.6 + vWorld.z) * .025;
        vec3 col = uColor * vColor * bands * shade * (1. + brush);
        if (uLeaf > .5) {
          float foliage = sin(vWorld.x * 6.3 + sin(vWorld.z * 7.1)) * sin(vWorld.y * 8.5 + sin(vWorld.x * 4.9)) * sin(vWorld.z * 5.7 + sin(vWorld.y * 4.3));
          col *= 1. + (smoothstep(-.15, .5, foliage) - .45) * .21;
          col += vec3(.018, .018, .002) * smoothstep(.35, .72, foliage) * smoothstep(.02, .7, d);
        }
        col += uLeaf * vec3(.045, .055, .008) * pow(max(0., dot(-n, uSun)), 2.);
        col = mix(col, uColor * vColor * mix(vec3(.72, .82, .87), vec3(1.06, 1.02, .91), smoothstep(-.6, .6, d)), uCloud);
        gl_FragColor = vec4(col, 1.);
        ${fogApply}
      }
    `,
  });
  return mat;
}

export function grassMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: time, uEye: eye, uFogColor: { value: atmosphere.color },
      uFogNear: { value: atmosphere.near }, uFogFar: { value: atmosphere.far },
    },
    vertexShader: `
      attribute vec3 offset;
      attribute vec4 blade;
      attribute vec3 tint;
      uniform float uTime;
      uniform vec3 uEye;
      varying vec3 vWorld;
      varying vec3 vTint;
      varying float vTip;
      void main() {
        vec3 p = position;
        float t = p.y;
        float c = cos(blade.x), s = sin(blade.x);
        float dist = distance(offset.xz, uEye.xz);
        float fade = 1. - smoothstep(40., 60., dist);
        p.x *= blade.z;
        p.y *= blade.y * fade;
        p.z += t * t * blade.w;
        p.xz = mat2(c, -s, s, c) * p.xz;
        float gust = sin(offset.x * .22 + offset.z * .17 - uTime * 1.6);
        float flutter = sin(offset.x * 1.4 + offset.z * .72 + uTime * 2.9);
        p.x += t * t * (.16 + gust * .19 + flutter * .055) * blade.y * fade;
        p.z += t * t * (.09 * gust + .05 * flutter) * blade.y * fade;
        vWorld = offset + p;
        vTint = tint;
        vTip = t;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
      }
    `,
    fragmentShader: `
      varying vec3 vWorld;
      varying vec3 vTint;
      varying float vTip;
      ${fogPars}
      void main() {
        vec3 col = mix(vTint * vec3(.52, .67, .43), vTint * vec3(1.2, 1.14, .78), smoothstep(0., 1., vTip));
        gl_FragColor = vec4(col, 1.);
        ${fogApply}
      }
    `,
  });
}

export function waterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: time, uFogColor: { value: atmosphere.color }, uFogNear: { value: atmosphere.near }, uFogFar: { value: atmosphere.far } },
    vertexShader: `
      attribute float waterDepth;
      varying vec3 vWorld;
      varying float vDepth;
      void main() {
        vDepth = waterDepth;
        vWorld = (modelMatrix * vec4(position, 1.)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vWorld;
      varying float vDepth;
      ${fogPars}
      void main() {
        float flow = sin(vWorld.z * 4.1 + uTime * 1.8 + sin(vWorld.x * 3.3 + uTime * .5) * 1.7);
        float ripple = sin(vWorld.x * 6.2 + vWorld.z * 2.8 - uTime * 1.6) * .5 + .5;
        float longWave = sin(vWorld.z * .72 - vWorld.x * .55 + uTime * .35);
        float deep = smoothstep(.015, .5, vDepth);
        vec3 col = mix(vec3(.26, .46, .34), vec3(.075, .38, .41), deep);
        col += longWave * vec3(.018, .034, .028);
        // Quiet, broad reflection shapes and tiny flowing highlights, without a
        // reflection pass or transparent layers on the headset.
        float reflection = smoothstep(.18, .78, sin(vWorld.x * .38 + longWave * .45) * sin(vWorld.z * .19));
        col = mix(col, vec3(.19, .43, .33), reflection * .21 * deep);
        vec3 view = normalize(cameraPosition - vWorld);
        float fresnel = pow(1. - max(0., view.y), 3.);
        col = mix(col, vec3(.51, .73, .69), fresnel * .55);
        float aa = max(fwidth(flow), .008);
        float streak = smoothstep(.95 - aa, 1., flow) * smoothstep(.5, .94, ripple);
        col += streak * vec3(.2, .29, .25) * smoothstep(.04, .2, vDepth);
        float lace = .45 + .35 * sin(vWorld.z * 2.1 + sin(vWorld.x * 3.) + uTime * .65);
        float foam = (1. - smoothstep(.008, .055, vDepth)) * lace;
        col = mix(col, vec3(.72, .80, .65), foam * .72);
        float caustic = smoothstep(.84, .97, ripple * (.5 + .5 * longWave));
        col += caustic * (1. - deep) * vec3(.035, .048, .014);
        gl_FragColor = vec4(col, 1.);
        ${fogApply}
      }
    `,
  });
}
