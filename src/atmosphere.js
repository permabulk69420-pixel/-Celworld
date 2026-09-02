import * as THREE from 'three';
import { random, TAU } from './math.js';
import { paintedMaterial, time, sun } from './materials.js';
import { instances } from './geometry.js';
import { terrainHeight } from './land.js';

export function makeSky(scene) {
  const sky=new THREE.Mesh(new THREE.SphereGeometry(800,32,20),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{uSun:{value:sun}},
    vertexShader:`
      varying vec3 vDirection;
      void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
    `,
    fragmentShader:`
      uniform vec3 uSun;
      varying vec3 vDirection;
      void main(){
        vec3 d=normalize(vDirection);
        float height=max(d.y,0.);
        vec3 col=mix(vec3(.44,.67,.70),vec3(.08,.32,.56),pow(smoothstep(0.,.65,height),.35));
        col=mix(vec3(.79,.82,.66),col,smoothstep(-.08,.17,d.y));
        float dist=dot(d,uSun);
        float glow=pow(max(0.,dist),18.);
        col+=vec3(.18,.12,.03)*glow;
        float disk=smoothstep(.99962,.99978,dist);
        col=mix(col,vec3(1.,.92,.65),disk);
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }
    `,
  }));
  sky.name='A wide summer sky';
  sky.renderOrder=-10;
  sky.frustumCulled=false;
  scene.add(sky);
  const rng=random(33),clouds=[];
  const clusters=[[-125,60,-135,1.05],[-30,81,-208,1.22],[96,64,-166,1.13],[182,87,-233,1.4],[-210,71,-16,1.4],[201,70,60,1.1],[-80,84,191,1.25],[70,65,203,1.1]];
  for(const [x,y,z,s] of clusters){
    clouds.push({position:[x,y-1.5*s,z],scale:[33*s,3.9*s,10*s],color:'#f2f0df'});
    for(let i=0;i<12;i++){
      const px=(i-5.5)*5.8*s;
      const arc=Math.sin(i/11*Math.PI);
      const radius=(4.5+arc*4.8+rng()*2.1)*s;
      clouds.push({position:[x+px,y+arc*3.6*s+(rng()-.5)*2,z+(rng()-.5)*8*s],scale:[radius*(1.15+rng()*.3),radius*(.7+arc*.25),radius*.95],color:i%4===0?'#eeefdf':'#f6f3df'});
      if(i>3&&i<8)clouds.push({position:[x+px*.8,y+arc*10.5*s,z+3],scale:[radius*.94,radius*.97,radius*.9],color:'#fcf4df'});
    }
  }
  const mat=paintedMaterial({clouds:true});
  mat.uniforms.uFogNear.value=300;mat.uniforms.uFogFar.value=850;
  instances(scene,new THREE.SphereGeometry(1,14,10),mat,clouds,'Summer cumulus');
}

export function makeLife(scene,smokeOrigin) {
  const rng=random(637);
  const smoke=new THREE.InstancedBufferGeometry();
  const plane=new THREE.PlaneGeometry(1,1);
  smoke.index=plane.index;
  smoke.attributes.position=plane.attributes.position;
  smoke.attributes.uv=plane.attributes.uv;
  smoke.setAttribute('phase',new THREE.InstancedBufferAttribute(new Float32Array(Array.from({length:14},(_,i)=>i/14)),1));
  smoke.instanceCount=14;
  const smokeMesh=new THREE.Mesh(smoke,new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{uTime:time,uOrigin:{value:smokeOrigin}},
    vertexShader:`
      attribute float phase;
      uniform float uTime;
      uniform vec3 uOrigin;
      varying vec2 vUv;
      varying float vLife;
      void main(){
        float t=fract(phase+uTime*.048);
        vec3 p=uOrigin+vec3(t*3.8+sin(t*8.+uTime*.1)*t*.4,t*7.4,t*.8);
        float size=.28+t*1.6;
        vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
        vec3 up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
        p+=(right*position.x+up*position.y)*size;
        vUv=uv;vLife=t;
        gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
      }
    `,
    fragmentShader:`
      varying vec2 vUv;
      varying float vLife;
      void main(){
        float alpha=(1.-smoothstep(.1,.5,length(vUv-.5)))*sin(vLife*3.14159)*.145;
        gl_FragColor=vec4(.83,.86,.77,alpha);
        #include <colorspace_fragment>
      }
    `,
  }));
  smokeMesh.frustumCulled=false;
  smokeMesh.name='A thread of chimney smoke';
  scene.add(smokeMesh);

  const birds=[];
  const birdMaterial=paintedMaterial({color:'#52645b',side:THREE.DoubleSide});
  const wingGeometry=new THREE.BufferGeometry();
  wingGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.12,.85,.05,-.15,.43,0,-.05],3));
  wingGeometry.computeVertexNormals();
  for(let i=0;i<8;i++){
    const bird=new THREE.Group(),left=new THREE.Mesh(wingGeometry,birdMaterial),right=new THREE.Mesh(wingGeometry,birdMaterial);
    right.scale.x=-1;bird.add(left,right);bird.scale.setScalar(.5+rng()*.3);scene.add(bird);
    birds.push({bird,left,right,phase:rng()*TAU,radius:18+rng()*15,height:20+rng()*15});
  }
  // A handful of warm butterflies close to the flowers.
  const butterflies=[];
  const butterflyGeometry=new THREE.CircleGeometry(.09,5);
  butterflyGeometry.translate(.072,0,0);
  const butterflyMats=['#edc465','#f1dfb2','#c8b4d1'].map(color=>paintedMaterial({color,side:THREE.DoubleSide}));
  for(let i=0;i<16;i++){
    const group=new THREE.Group();
    const left=new THREE.Mesh(butterflyGeometry,butterflyMats[i%3]),right=new THREE.Mesh(butterflyGeometry,butterflyMats[i%3]);
    right.scale.x=-1;group.add(left,right);scene.add(group);
    butterflies.push({group,left,right,x:-4+rng()*29,z:-10+rng()*42,phase:rng()*TAU});
  }
  return t=>{
    for(const b of birds){
      const a=t*.055+b.phase;
      b.bird.position.set(Math.cos(a)*b.radius-12,b.height+Math.sin(a*2)*2,-60+Math.sin(a)*b.radius*.52);
      b.bird.rotation.set(0,-a+.3,Math.sin(a)*.12);
      const flap=Math.sin(t*3.1+b.phase)*.3;
      b.left.rotation.z=flap;b.right.rotation.z=-flap;
    }
    for(const b of butterflies){
      const x=b.x+Math.sin(t*.32+b.phase)*1.7,z=b.z+Math.cos(t*.28+b.phase)*1.7;
      b.group.position.set(x,terrainHeight(x,z)+.85+Math.sin(t*.71+b.phase)*.35,z);
      b.group.rotation.set(-.6,t*.24+b.phase,.15);
      b.left.rotation.y=Math.sin(t*16+b.phase)*1.15;b.right.rotation.y=-b.left.rotation.y;
    }
  };
}
