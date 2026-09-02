import * as THREE from 'three';
import { LANDING, WILLOW, WATER_Y, terrainHeight, landingHeight, riverBankX, pathDistance, reserved } from './land.js';
import { random, TAU } from './math.js';
import { paintedMaterial } from './materials.js';
import { Sculpture, instances, spatialInstances } from './geometry.js';

function willowStrand() {
  const positions=[],colors=[],indices=[];
  const green=new THREE.Color('#96b66c'),gold=new THREE.Color('#bbc97e');
  for(let j=0;j<10;j++)for(const side of [-1,1]){
    const y=-j*.14, x=Math.sin(j*.8)*.024;
    const start=positions.length/3,w=(.055+(1-j/11)*.055)*side;
    positions.push(x,y,0,x+w*.7,y-.045,.008,x+w,y-.14,.018,x+w*.15,y-.07,.03);
    indices.push(start,start+1,start+3,start+1,start+2,start+3);
    const c=green.clone().lerp(gold,j/14);
    for(let i=0;i<4;i++)colors.push(c.r,c.g,c.b);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(indices);g.computeVertexNormals();return g;
}

function makeWillow(scene,colliders) {
  const {x,z,s}=WILLOW,y=terrainHeight(x,z),rng=random(195);
  const trunk=new Sculpture(paintedMaterial());
  trunk.beam([x,y-.06,z],[x+.55*s,y+3.5*s,z-.3*s],.55*s,'#6b7250',.34*s,10);
  trunk.beam([x+.5*s,y+3.1*s,z-.25*s],[x+.1*s,y+6.5*s,z],.35*s,'#7f8055',.08*s,8);
  const crowns=[],strands=[];
  for(let i=0;i<8;i++) {
    const a=i/8*TAU;
    const end=[x+Math.cos(a)*3.9*s,y+(5.8+rng()*.8)*s,z+Math.sin(a)*3.4*s];
    trunk.beam([x+.4*s,y+(2.6+rng())*s,z],end,.17*s,'#79815a',.024*s,7);
    trunk.beam([x+Math.cos(a)*1.25*s,y+.035,z+Math.sin(a)*1.25*s],[x,y+.7*s,z],.045*s,'#657449',.19*s,5);
  }
  for(let i=0;i<32;i++) {
    const a=i*2.39996,r=Math.sqrt(i/31)*4.25*s;
    const cx=x+Math.cos(a)*r,cz=z+Math.sin(a)*r*.86,cy=y+(6.7-r/s*.27+rng()*.48)*s;
    crowns.push({position:[cx,cy,cz],scale:[(1.1+rng()*.65)*s,.72*s,(.9+rng()*.45)*s],rotation:[.1,a,0],color:['#83a15d','#94ad62','#a8ba74','#729658'][i%4]});
    for(let j=0;j<8;j++) {
      const angle=rng()*TAU,reach=(.4+rng()*.8)*s;
      const length=(2.15+rng()*1.6)*(r>2?1:.68);
      strands.push({position:[cx+Math.sin(angle)*reach,cy-.23*s,cz+Math.cos(angle)*reach],scale:[.85+rng()*.65,length,.9+rng()*.4],rotation:[(rng()-.5)*.18,angle,(rng()-.5)*.12]});
    }
  }
  trunk.finish(scene,'The old willow by the water');
  instances(scene,new THREE.IcosahedronGeometry(1,2),paintedMaterial({leaf:true,wind:.06}),crowns,'Willow canopy');
  spatialInstances(scene,willowStrand(),paintedMaterial({side:THREE.DoubleSide,wind:.12,rooted:true}),strands,'Hanging willow leaves',16);
  colliders.push({type:'circle',x,z,radius:.56*s});
}

function rampPlank(x0,x1,z0,z1) {
  const top=[[x0,landingHeight(x0,z0),z0],[x0,landingHeight(x0,z1),z1],[x1,landingHeight(x1,z1),z1],[x1,landingHeight(x1,z0),z0]];
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([...top.flat(),...top.flatMap(([x,y,z])=>[x,y-.1,z])],3));
  g.setIndex([0,1,3,1,2,3,4,7,5,5,7,6,0,4,1,1,4,5,3,2,7,2,6,7,1,5,2,2,5,6,0,3,4,3,7,4]);
  g.computeVertexNormals();return g;
}

function makeLanding(scene,colliders) {
  const s=new Sculpture(paintedMaterial()),rng=random(511),{x,z,y,halfX,halfZ,approachX,approachHalfWidth}=LANDING;
  const palette=['#a39163','#b49b6b','#94845d','#aa9363'];
  for(let i=0;i<18;i++) {
    const px=x-halfX+(i+.5)*halfX*2/18;
    s.box([px,y-.065,z],[halfX*2/18-.007,.13,halfZ*2],palette[i%4]);
    for(const zz of [z-halfZ+.14,z+halfZ-.14])s.ellipsoid([px,y+.002,zz],[.014,.004,.014],'#6b6b51',0);
  }
  const edge=x-halfX;
  for(let i=0;i<16;i++) {
    const x0=approachX+i/16*(edge-approachX)+.003,x1=approachX+(i+1)/16*(edge-approachX)-.003;
    s.add(rampPlank(x0,x1,z-approachHalfWidth,z+approachHalfWidth),palette[(i+1)%4]);
  }
  for(const side of [-1,1]) {
    const zz=z+side*halfZ;
    for(let i=0;i<4;i++) {
      const px=x-halfX+i*halfX*2/3;
      s.beam([px,Math.min(terrainHeight(px,zz),WATER_Y)-.2,zz],[px,y+1.02,zz],.075,'#827653',.055,7);
      s.ellipsoid([px,y+1.02,zz],[.085,.035,.085],'#bcab78',1);
    }
    for(const height of [.46,.95])s.beam([x-halfX,y+height,zz],[x+halfX,y+height,zz],.039,'#aa956b',.039,6);
    colliders.push({type:'box',x,z:zz,halfX,halfZ:.06,angle:0});
  }
  for(const height of [.46,.95])s.beam([x+halfX,y+height,z-halfZ],[x+halfX,y+height,z+halfZ],.039,'#aa956b',.039,6);
  colliders.push({type:'box',x:x+halfX,z,halfX:.06,halfZ,angle:0});
  // A bench faces back up the stream toward the cottage.
  s.box([x+.16,y+.48,z+1.05],[1.94,.1,.44],'#ae966a');
  s.box([x+.16,y+.87,z+1.25],[1.94,.32,.08],'#9a865f');
  for(const xx of [x-.58,x+.9])s.box([xx,y+.25,z+1.05],[.09,.48,.34],'#7f7352');
  colliders.push({type:'box',x:x+.16,z:z+1.07,halfX:.97,halfZ:.25,angle:0});
  s.box([x-.22,y+.557,z+1.03],[.28,.04,.2],'#759484',[0,.16,0]);
  s.box([x-.22,y+.578,z+1.03],[.24,.006,.18],'#d6cdaa',[0,.16,0]);
  s.finish(scene,'A little landing beneath the willow');

  const pads=[],blossoms=[];
  for(let i=0;i<65;i++) {
    const pz=20+rng()*15,bank=riverBankX(pz,1),px=bank-.35-rng()*1.6;
    const depth=WATER_Y-terrainHeight(px,pz);
    if(depth<.04||depth>.53)continue;
    const size=.17+rng()*.15;
    pads.push({position:[px,WATER_Y+.008,pz],scale:[size,1,size*.89],rotation:[0,rng()*TAU,0],color:['#6e975b','#82a76a','#a6ba78'][i%3]});
    if(i%5===0)blossoms.push({position:[px,WATER_Y+.045,pz],scale:[.095,.06,.095],color:i%2?'#f3dfb5':'#deb1b3'});
  }
  const pad=new THREE.CircleGeometry(1,13,.19,TAU-.42);pad.rotateX(-Math.PI/2);
  instances(scene,pad,paintedMaterial({side:THREE.DoubleSide}),pads,'Lily pads in the quiet water');
  instances(scene,new THREE.IcosahedronGeometry(1,1),paintedMaterial(),blossoms,'Small water lilies');
}

function makeWoodlandDetails(scene,colliders) {
  const rng=random(906),s=new Sculpture(paintedMaterial());
  const mushrooms=[],leaves=[],rocks=[];
  for(const [x,z,angle,length] of [[-44,12,-.6,3.5],[-36,25,.65,2.8],[-40,-3,.2,2.4]]) {
    const dx=Math.cos(angle)*length*.5,dz=Math.sin(angle)*length*.5;
    const ay=terrainHeight(x-dx,z-dz)+.22,by=terrainHeight(x+dx,z+dz)+.26;
    s.beam([x-dx,ay,z-dz],[x+dx,by,z+dz],.3,'#74754c',.24,10);
    s.beam([x-dx-Math.cos(angle)*.007,ay,z-dz-Math.sin(angle)*.007],[x-dx-Math.cos(angle)*.016,ay,z-dz-Math.sin(angle)*.016],.22,'#b7a275',.22,12);
    s.add(new THREE.IcosahedronGeometry(1,1),'#7b9752',[x,(ay+by)*.5+.24,z],[length*.37,.07,.21],[0,-angle,Math.atan2(by-ay,length)]);
    colliders.push({type:'box',x,z,halfX:length*.5,halfZ:.26,angle:-angle});
    for(let i=0;i<10;i++) {
      const px=x+(rng()-.5)*2.5,pz=z+(rng()-.5)*1.4;
      if(pathDistance(px,pz)<1.45)continue;
      const size=.58+rng()*.9;
      mushrooms.push({position:[px,terrainHeight(px,pz),pz],scale:[size,size,size],rotation:[0,rng()*TAU,0]});
    }
  }
  for(let i=0;i<540;i++) {
    const x=-56+rng()*25,z=-9+rng()*46;
    if(terrainHeight(x,z)<WATER_Y+.12)continue;
    leaves.push({position:[x,terrainHeight(x,z)+.009,z],scale:[.07+rng()*.1,1,.15+rng()*.13],rotation:[0,rng()*TAU,0],color:['#9d9c63','#ada572','#809357','#bdab72'][i%4]});
    if(i%19===0&&!reserved(x,z,.4))rocks.push({position:[x,terrainHeight(x,z)+.16,z],scale:[.3+rng()*.25,.24,.3],color:'#8e9c7a'});
  }
  // Two small resting places along the loop.
  for(const [x,z,rotation] of [[-45,20,.3],[-35,-5,-.6]]) {
    const y=terrainHeight(x,z);
    s.box([x,y+.49,z],[2.05,.13,.52],'#99865c',[0,rotation,0]);
    for(const side of [-1,1])s.ellipsoid([x+side*.74*Math.cos(rotation),y+.22,z-side*.74*Math.sin(rotation)],[.28,.3,.32],'#8d967b',1);
    colliders.push({type:'box',x,z,halfX:1.03,halfZ:.26,angle:rotation});
  }
  s.finish(scene,'Fallen timber and woodland resting places');
  const proto=new Sculpture(paintedMaterial());
  proto.beam([0,0,0],[.016,.17,0],.024,'#dbd0a5',.019,6);
  proto.add(new THREE.SphereGeometry(.115,10,5,0,TAU,0,Math.PI*.55),'#b29360',[.012,.17,0],[1,.57,1]);
  const cap=proto.finish(new THREE.Group(),'mushroom prototype').geometry;
  instances(scene,cap,paintedMaterial({side:THREE.DoubleSide}),mushrooms,'Small woodland mushrooms');
  const leaf=new THREE.BufferGeometry();
  leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.5,-.44,.025,0,0,.035,1,.44,.025,0],3));
  leaf.setIndex([0,1,2,0,2,3]);leaf.computeVertexNormals();
  instances(scene,leaf,paintedMaterial({side:THREE.DoubleSide}),leaves,'Scattered woodland leaves');
  instances(scene,new THREE.IcosahedronGeometry(1,1),paintedMaterial(),rocks,'Woodland moss stones');
}

export function makeGrove(scene,colliders) {
  makeWillow(scene,colliders);makeLanding(scene,colliders);makeWoodlandDetails(scene,colliders);
}
