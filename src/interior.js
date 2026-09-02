import * as THREE from 'three';
import { COTTAGE, COTTAGE_FLOOR, cottageWorld } from './land.js';
import { random, smoothstep } from './math.js';
import { paintedMaterial } from './materials.js';
import { Sculpture } from './geometry.js';

export function cottageCollider(colliders, x, z, halfX, halfZ, angle = 0) {
  const world = cottageWorld(x, z);
  colliders.push({ type: 'box', ...world, halfX, halfZ, angle: COTTAGE.rotation + angle });
}

export function cottageWall(s, width, depth, facing, openings, color) {
  const first = s.parts.length;
  const xs = [...new Set([-width / 2, width / 2, ...openings.flatMap(o => [o.left, o.right])])].sort((a,b) => a-b);
  const ys = [...new Set([.3, 3.4, ...openings.flatMap(o => [o.bottom, o.top])])].sort((a,b) => a-b);
  for (let i=1;i<xs.length;i++) for (let j=1;j<ys.length;j++) {
    const x=(xs[i-1]+xs[i])*.5,y=(ys[j-1]+ys[j])*.5;
    if (openings.some(o => x>o.left && x<o.right && y>o.bottom && y<o.top)) continue;
    s.box([x,y,depth],[xs[i]-xs[i-1],ys[j]-ys[j-1],.18],color);
  }
  for (let i=first;i<s.parts.length;i++) s.parts[i].rotateY(facing);
}

export function windowGlass() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uGlass: { value: 1 } },
    vertexShader: `
      varying vec3 vWorld; varying vec3 vNormal;
      void main() {
        vec4 p = vec4(position, 1.); vec3 n = normal;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
        #endif
        vWorld = (modelMatrix * p).xyz; vNormal = normalize(mat3(modelMatrix) * n);
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.);
      }
    `,
    fragmentShader: `
      varying vec3 vWorld; varying vec3 vNormal;
      void main() {
        float edge = pow(1. - abs(dot(normalize(cameraPosition - vWorld), normalize(vNormal))), 3.);
        gl_FragColor = vec4(.51, .7, .66, .065 + edge * .16);
        #include <colorspace_fragment>
      }
    `,
  });
}

export function makeInterior(group, colliders) {
  const rng = random(351);
  const wood = '#916c46', darkWood = '#685239', cream = '#e1d1a6';
  const s = new Sculpture(paintedMaterial({ side: THREE.DoubleSide }));
  const floor = new THREE.PlaneGeometry(6.72, 5.76, 40, 34);
  floor.rotateX(-Math.PI / 2); floor.translate(0, COTTAGE_FLOOR, 0);
  const p = floor.attributes.position, colors = new Float32Array(p.count * 3);
  const c = new THREE.Color(), brown = new THREE.Color('#aa8354'), gold = new THREE.Color('#dfbd7e');
  for (let i=0;i<p.count;i++) {
    const x=p.getX(i),z=p.getZ(i);
    const light=(1-smoothstep(.72,1.25,Math.abs((x+1.5)+(z+.4)*.48)/1.1))*(1-smoothstep(.55,1.1,Math.abs(z+.65)));
    c.copy(brown).multiplyScalar(.74+rng()*.11).lerp(gold,light*.53);
    colors.set([c.r,c.g,c.b],i*3);
  }
  floor.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const floorMesh=new THREE.Mesh(floor,paintedMaterial());
  floorMesh.name='Warm plank floor and painted window light';group.add(floorMesh);
  for(let i=0;i<23;i++) {
    const z=-2.75+i*.25;
    s.box([0,COTTAGE_FLOOR+.0015,z],[6.71,.002,.009],'#76583d');
    for(let j=0;j<3;j++)s.box([-2.55+j*2.1+(i%2)*.42,COTTAGE_FLOOR+.002,z+.12],[.009,.002,.23],'#886646');
  }
  // Pale plaster and exposed rafters close the underside of the roof.
  s.box([0,3.39,0],[6.7,.11,5.78],'#c1ad83');
  for(const z of [-2.62,-.78,1.07,2.65])s.box([0,3.28,z],[6.74,.19,.16],darkWood);
  // Low skirting leaves the window openings clear.
  for(const x of [-3.3,3.3])s.box([x,.46,0],[.07,.22,5.7],darkWood);
  s.box([0,.46,-2.82],[6.66,.22,.07],darkWood);

  // Woven rug with a quiet geometric border.
  s.box([.75,.333,.6],[2.45,.014,2.35],'#768b70');
  for(const x of [-.4,1.9])s.box([x,.342,.6],[.11,.006,2.27],'#d0b67e');
  for(const z of [-.46,1.66])s.box([.75,.342,z],[2.32,.006,.11],'#d0b67e');
  for(let i=0;i<13;i++)for(const z of [-.59,1.79])s.box([-.36+i*.185,.338,z],[.018,.007,.12],'#c1b990');
  for(let i=0;i<5;i++)s.box([.75,.35,-.22+i*.39],[.14,.006,.14],'#aeb890',[0,Math.PI/4,0]);

  // Table, two stools, an open book and a tea set, all at human scale.
  s.box([.94,1.075,.52],[1.65,.095,.82],wood);
  for(const x of [.29,1.59])for(const z of [.24,.8])s.box([x,.7,z],[.075,.72,.075],darkWood);
  for(const z of [-.15,1.2]) {
    s.add(new THREE.CylinderGeometry(.24,.24,.07,12),'#ad8752',[.9,.78,z]);
    for(const x of [.74,1.06])for(const zz of [z-.13,z+.13])s.beam([x,.35,zz],[x,.76,zz],.024,wood,.024,5);
    cottageCollider(colliders,.9,z,.23,.22);
  }
  s.box([.47,1.132,.51],[.44,.035,.3],'#b2ad89',[0,-.15,0]);
  s.box([.37,1.155,.51],[.2,.018,.27],cream,[0,-.15,.05]);
  s.box([.57,1.155,.48],[.2,.018,.27],cream,[0,-.15,-.05]);
  for(let i=0;i<6;i++)s.box([.36,1.17,.41+i*.032],[.14,.001,.004],'#aa9c79',[0,-.15,0]);
  s.ellipsoid([1.3,1.245,.5],[.16,.14,.14],'#668676',1);
  s.add(new THREE.TorusGeometry(.12,.022,5,14),'#668676',[1.47,1.27,.5],[1,1,1],[0,Math.PI/2,0]);
  s.beam([1.17,1.25,.5],[1.04,1.36,.5],.037,'#8da391',.024,8);
  s.add(new THREE.CylinderGeometry(.093,.093,.026,12),'#9cac91',[1.3,1.382,.5]);
  s.ellipsoid([1.3,1.411,.5],[.025,.022,.025],'#577469',1);
  for(const [x,z] of [[1.21,.78],[1.61,.57]]) {
    s.add(new THREE.CylinderGeometry(.055,.042,.087,10),'#dccba2',[x,1.165,z]);
    s.add(new THREE.CylinderGeometry(.045,.045,.005,10),'#655c3d',[x,1.209,z]);
  }
  cottageCollider(colliders,.94,.52,.82,.41);

  // A quilted sleeping nook, with a low wooden frame and pillows.
  s.box([2.18,.6,-1.72],[1.55,.3,2.08],darkWood);
  s.box([2.18,.82,-1.72],[1.49,.19,2.04],'#d1c7a2');
  s.box([2.18,.96,-2.38],[1.29,.18,.44],'#eee1bc',[.07,0,0]);
  s.box([2.18,.939,-1.42],[1.5,.075,1.49],'#779b91');
  for(let i=0;i<7;i++)s.box([2.18,.982,-2.02+i*.198],[1.49,.012,.037],i%2?'#b8c0a4':'#587d77');
  for(const x of [1.39,2.97])s.box([x,.8,-2.76],[.1,.99,.1],wood);
  s.box([2.18,1.07,-2.76],[1.66,.24,.08],wood);
  cottageCollider(colliders,2.18,-1.72,.8,1.07);

  // A cast-iron stove lines up with the existing chimney.
  s.box([-1.65,.357,-1.26],[1.18,.07,1.02],'#8d8b73');
  s.box([-1.65,.76,-1.26],[.66,.63,.54],'#4e5d52');
  s.box([-1.65,1.1,-1.26],[.76,.075,.65],'#596756');
  for(const x of [-1.88,-1.42])for(const z of [-1.44,-1.07])s.beam([x,.39,z],[x,.6,z],.025,'#4b574a',.025,5);
  s.box([-1.65,.81,-.969],[.49,.38,.04],'#303e37');
  s.box([-1.65,.81,-.944],[.39,.27,.014],'#d58b43');
  for(const x of [-1.79,-1.64,-1.49])s.box([x,.81,-.93],[.018,.29,.013],'#626746');
  s.beam([-1.65,1.13,-1.26],[-1.65,3.43,-1.26],.078,'#566357',.078,10);
  s.ellipsoid([-1.8,1.24,-1.21],[.16,.12,.13],'#aba77e',1);
  s.add(new THREE.TorusGeometry(.1,.014,4,12),'#746e50',[-1.8,1.39,-1.21]);
  cottageCollider(colliders,-1.65,-1.26,.51,.44);

  // A window seat, bookshelves and small personal objects.
  s.box([-2.83,.78,.43],[.7,.1,1.57],wood);
  s.box([-2.83,.88,.43],[.64,.11,1.47],'#b2aa7d');
  for(const z of [-.18,1.04])s.box([-2.83,.55,z],[.54,.44,.08],darkWood);
  s.box([-2.83,1.02,-.02],[.5,.19,.42],'#b3c1a1',[.08,0,-.08]);
  cottageCollider(colliders,-2.83,.43,.35,.81);
  for(const y of [1.56,2.15]) {
    s.box([-.03,y,-2.67],[1.56,.08,.3],wood);
    for(let i=0;i<9;i++) {
      const height=.18+rng()*.16;
      s.box([-.64+i*.145,y+.04+height*.5,-2.67],[.1,height,.21],['#698575','#a78253','#ac7359','#8e9871'][i%4],[0,0,(rng()-.5)*.16]);
    }
  }
  cottageCollider(colliders,-.03,-2.68,.79,.25);
  s.box([-2.79,1.0,2.03],[.83,.07,.49],wood);
  for(const x of [-3.13,-2.45])s.box([x,.64,2.03],[.06,.67,.35],darkWood);
  s.add(new THREE.CylinderGeometry(.11,.082,.16,10),'#a67552',[-2.8,1.12,2.03]);
  for(let i=0;i<6;i++)s.ellipsoid([-2.8+(rng()-.5)*.19,1.28+rng()*.1,2.03+(rng()-.5)*.2],[.09,.11,.07],'#88a361',0);
  cottageCollider(colliders,-2.79,2.03,.42,.25);
  s.finish(group,'A quiet furnished cottage interior');

  // Keep the open door against its jamb, with a real gap in the wall and collider.
  const doorGroup=new THREE.Group();doorGroup.position.set(-1.43,0,3.03);doorGroup.rotation.y=1.42;group.add(doorGroup);
  const door=new Sculpture(paintedMaterial());
  door.box([.61,1.43,0],[1.22,2.18,.09],'#466a5c');
  for(let i=0;i<6;i++)door.box([.105+i*.201,1.43,.049],[.012,2.12,.006],'#34564b');
  door.ellipsoid([1.08,1.41,.087],[.043,.043,.041],'#cba663',1);
  for(const y of [.62,2.19])door.box([.085,y,.059],[.22,.07,.04],'#5b654e');
  door.finish(doorGroup,'The open cottage door');
  cottageCollider(colliders,-1.43+Math.cos(1.42)*.61,3.03-Math.sin(1.42)*.61,.61,.055,1.42);
}
