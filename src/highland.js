import * as THREE from 'three';
import { HIGHLAND, WINDMILL, ORCHARD_TREES, terrainHeight, pathDistance } from './land.js';
import { random, TAU } from './math.js';
import { paintedMaterial } from './materials.js';
import { Sculpture, instances } from './geometry.js';
import { leafShape, lantern } from './craft.js';

const WALL_LINES=[
  [[18,-61],[18,-70],[20,-80],[29,-82]],
  [[29,-82],[40,-80],[47,-74],[48,-63],[39,-59],[35.5,-59]],
  [[28.5,-58.8],[18,-61]],
];

function windmill(scene,colliders) {
  const root=new THREE.Group();
  root.name='The windmill above the hidden orchard';
  root.position.set(WINDMILL.x,terrainHeight(WINDMILL.x,WINDMILL.z),WINDMILL.z);
  root.rotation.y=WINDMILL.rotation;
  scene.add(root);

  const s=new Sculpture(paintedMaterial({side:THREE.DoubleSide}));
  const stone=['#969987','#a6a58f','#8e9583','#b1ac91'];
  s.add(new THREE.CylinderGeometry(1.48,1.83,6.15,18,3),'#e2d3a6',[0,3.075,0]);
  s.add(new THREE.CylinderGeometry(1.51,1.86,.13,18),'#c8b98d',[0,5.42,0]);
  for(let i=0;i<18;i++){
    const a=i*TAU/18,r=1.79;
    s.box([Math.sin(a)*r,.2,Math.cos(a)*r],[.68,.39,.45],stone[i%stone.length],[0,a,0]);
  }
  s.add(new THREE.TorusGeometry(1.57,.055,5,24),'#b5aa82',[0,2.82,0],[1,1,1],[Math.PI/2,0,0]);

  // The teal roof gives the second destination its own silhouette while keeping
  // the same sun-faded, hand-painted palette as the cottage below.
  s.add(new THREE.ConeGeometry(2.08,2.3,18),'#607e72',[0,7.26,0]);
  for(let i=0;i<18;i++){
    const a=i*TAU/18;
    s.beam([0,8.43,0],[Math.sin(a)*2.07,6.12,Math.cos(a)*2.07],.027,i%2?'#526f69':'#789185',.035,4);
  }
  s.add(new THREE.ConeGeometry(.19,.46,10),'#b98758',[0,8.65,0]);

  // Closed door, tiny windows and patched plaster make the landmark readable
  // up close without turning it into a new interaction or interior.
  s.box([0,1.21,-1.79],[1.03,2.16,.075],'#54776e');
  s.box([0,2.31,-1.81],[1.17,.13,.12],'#705c42');
  for(const x of [-.43,.43])s.box([x,1.22,-1.84],[.09,2.05,.08],'#6d6248');
  s.ellipsoid([.29,1.22,-1.89],[.055,.055,.035],'#d6b85d',1);
  const window=(x,y,z,rotation=0)=>{
    s.box([x,y,z],[.73,.84,.075],'#789a91',[0,rotation,0]);
    s.box([x,y,z-.018],[.79,.09,.1],'#685b43',[0,rotation,0]);
    s.box([x,y,z-.018],[.08,.9,.1],'#685b43',[0,rotation,0]);
  };
  window(0,4.03,-1.62);
  window(-1.5,3.32,.03,-Math.PI/2);
  for(const [x,y,z,sx,sy] of [[.86,2.28,-1.55,.38,.25],[-.83,5.0,-1.3,.31,.18],[1.45,1.65,.34,.22,.34]]){
    s.ellipsoid([x,y,z],[sx,sy,.035],'#c7b986',1);
  }
  s.finish(root,'Weathered highland windmill');

  const rotor=new THREE.Group();
  rotor.name='Turning windmill rotor';
  rotor.position.set(0,6.23,-1.68);
  rotor.userData.bladeRadius=3.58;
  root.add(rotor);
  const sails=new Sculpture(paintedMaterial({side:THREE.DoubleSide}));
  const cloth=new THREE.BufferGeometry();
  cloth.setAttribute('position',new THREE.Float32BufferAttribute([
    .055,.56,-.025, .18,.56,-.025, .66,3.52,-.025, .03,3.52,-.025,
  ],3));
  cloth.setIndex([0,1,3,1,2,3]);cloth.computeVertexNormals();
  const turn=(x,y,a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a),0];
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.08;
    sails.add(cloth,i%2?'#e7dcb4':'#efe3bd',[0,0,0],[1,1,1],[0,0,a]);
    sails.beam(turn(0,.3,a),turn(0,3.72,a),.065,'#735c3d',.048,7);
    sails.beam(turn(.17,.58,a),turn(.68,3.56,a),.043,'#8c7048',.034,6);
    for(let j=0;j<6;j++){
      const r=.82+j*.49,w=.18+(r-.56)/2.96*.48;
      sails.beam(turn(.015,r,a),turn(w,r,a),.025,'#9d8051',.021,5);
    }
  }
  sails.add(new THREE.CylinderGeometry(.31,.36,.52,12),'#8a6d45',[0,0,-.05],[1,1,1],[Math.PI/2,0,0]);
  sails.add(new THREE.CylinderGeometry(.14,.14,.66,10),'#604e39',[0,0,.03],[1,1,1],[Math.PI/2,0,0]);
  sails.finish(rotor,'Windmill sails and wooden lattice');
  colliders.push({type:'circle',x:WINDMILL.x,z:WINDMILL.z,radius:2.28});
  return rotor;
}

function makeOrchardTrees(root,colliders,rng) {
  const trunks=new Sculpture(paintedMaterial());
  const crowns=[],fruit=[],leaves=[];
  const crownGeometry=new THREE.IcosahedronGeometry(1,2);
  const greens=['#789052','#8ea05a','#9aaa60','#6f894d','#a4ad68'];
  const apples=['#c5694f','#d28454','#d5a64e','#b85b48'];
  for(let index=0;index<ORCHARD_TREES.length;index++){
    const [x,z,s]=ORCHARD_TREES[index],y=terrainHeight(x,z);
    const lean=(rng()-.5)*.55*s,leanZ=(rng()-.5)*.38*s;
    const fork=[x+lean*.4,y+2.15*s,z+leanZ*.45];
    trunks.beam([x,y-.03,z],fork,.3*s,'#705b3c',.2*s,8);
    trunks.beam(fork,[x+lean,y+3.36*s,z+leanZ],.2*s,'#7c6641',.075*s,7);
    for(let k=0;k<5;k++){
      const a=k/5*TAU+.35+(rng()-.5)*.3;
      trunks.beam([x+Math.cos(a)*.78*s,y+.025,z+Math.sin(a)*.78*s],[x,y+.54*s,z],.05*s,'#69583a',.16*s,6);
      const start=[fork[0],fork[1]-(k%2)*.2*s,fork[2]];
      const end=[x+Math.cos(a)*(1.32+rng()*.42)*s,y+(3.0+rng()*.55)*s,z+Math.sin(a)*(1.18+rng()*.38)*s];
      trunks.beam(start,end,.115*s,'#78623f',.035*s,7);
    }
    for(let k=0;k<9;k++){
      const a=k*2.39996+.2*index,r=Math.sqrt(k/8)*(1.48+rng()*.24)*s;
      const cx=x+lean+Math.cos(a)*r,cz=z+leanZ+Math.sin(a)*r*.86;
      const cy=y+(3.75-Math.sqrt(k/8)*.46+rng()*.44)*s;
      const size=(.78+rng()*.31)*s;
      const color=greens[(k+index)%greens.length];
      crowns.push({position:[cx,cy,cz],scale:[size*1.2,size*.8,size],rotation:[.1,rng()*TAU,.12],color});
      if(k>1)for(let j=0;j<2;j++){
        const fa=rng()*TAU,fr=.52+rng()*.42;
        fruit.push({position:[cx+Math.cos(fa)*size*fr,cy-(.28+rng()*.55)*size,cz+Math.sin(fa)*size*fr],
          scale:[.115*s,.13*s,.115*s],rotation:[0,rng()*TAU,0],color:apples[(index+k+j)%apples.length]});
      }
      if(k%2===0)for(let j=0;j<3;j++){
        const a2=rng()*TAU,e=(rng()-.5)*1.5;
        leaves.push({position:[cx+Math.cos(a2)*size,cy+Math.sin(e)*size*.65,cz+Math.sin(a2)*size*.75],
          scale:[.58*s,1,.68*s],rotation:[e,a2,rng()*.3],color});
      }
    }
    colliders.push({type:'circle',x,z,radius:.36*s});
  }
  trunks.finish(root,'Gnarled trunks of the hidden orchard');
  instances(root,crownGeometry,paintedMaterial({leaf:true,wind:.045}),crowns,'Rounded orchard canopies');
  instances(root,new THREE.IcosahedronGeometry(1,1),paintedMaterial(),fruit,'Red and golden orchard fruit');
  instances(root,leafShape(.3,.1,.045),paintedMaterial({leaf:true,wind:.065,side:THREE.DoubleSide}),leaves,'Leaves around the orchard crowns');
  return fruit.length;
}

function addWallSegment(entries,moss,colliders,rng,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);
  const count=Math.max(1,Math.ceil(length/.76));
  for(let row=0;row<2;row++)for(let i=0;i<count;i++){
    const t=(i+.5+(row%2)*.16)/count;
    if(t>=1)continue;
    const x=a[0]+dx*t,z=a[1]+dz*t,y=terrainHeight(x,z);
    entries.push({position:[x,y+.17+row*.31,z],scale:[length/count*.94,.31,.43],
      rotation:[(rng()-.5)*.035,angle+(rng()-.5)*.08,(rng()-.5)*.025],
      color:['#929887','#a9a68f','#858f82','#b1ad94'][(i+row)%4]});
    if(row===1&&i%3===0)moss.push({position:[x,y+.355+row*.31,z],scale:[.28+rng()*.17,.035,.18+rng()*.11],rotation:[0,angle,0],color:i%2?'#82945f':'#6f8957'});
  }
  colliders.push({type:'box',x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,halfX:length/2-.06,halfZ:.23,angle});
}

function flowerSprig() {
  const host=new THREE.Group(),s=new Sculpture(paintedMaterial({side:THREE.DoubleSide}));
  s.beam([0,0,0],[.015,.38,0],.007,'#627b45',.004,4);
  s.add(leafShape(.16,.045,.022),'#789151',[0,.12,0],[1,1,1],[-.7,.4,0]);
  for(let i=0;i<5;i++)s.add(leafShape(.105,.045,.018),'#f0e3ba',[.015,.38,0],[1,1,1],[1.1,i*TAU/5,0]);
  s.ellipsoid([.015,.395,0],[.038,.025,.038],'#daa94e',1);
  return s.finish(host,'orchard flower prototype').geometry;
}

function harvestDetails(root,colliders,rng) {
  const s=new Sculpture(paintedMaterial({side:THREE.DoubleSide}));
  const stones=[],moss=[],blossoms=[];
  for(const line of WALL_LINES)for(let i=1;i<line.length;i++)addWallSegment(stones,moss,colliders,rng,line[i-1],line[i]);
  instances(root,new THREE.BoxGeometry(1,1,1),paintedMaterial(),stones,'Old dry-stone orchard wall');
  instances(root,new THREE.IcosahedronGeometry(1,1),paintedMaterial({leaf:true}),moss,'Moss along the orchard wall');

  // A broad gateway is aligned with the climb, so the old wall frames the reveal
  // without pinching locomotion at the crest.
  for(const [x,z] of [[28.55,-58.9],[35.45,-59.05]]){
    const y=terrainHeight(x,z);
    for(let row=0;row<4;row++)s.box([x,y+.13+row*.25,z],[.58-row*.035,.24,.58-row*.035],['#989d8a','#aaa991','#8c9482','#b0ac90'][row]);
    lantern(s,x,y+1.19,z,.56);
    colliders.push({type:'circle',x,z,radius:.31});
  }

  // A quiet harvest picnic rewards walking the full loop but stays well clear of
  // both the main trail and the windmill spur.
  const px=36.4,pz=-73.25,py=terrainHeight(px,pz);
  s.box([px,py+.025,pz],[2.35,.045,1.7],'#d6b55d',[0,-.14,0]);
  for(const offset of [-.66,0,.66])s.box([px+offset,py+.052,pz],[.055,.015,1.69],'#b96e55',[0,-.14,0]);
  s.box([px-.72,py+.24,pz-.2],[.62,.43,.5],'#a98252',[0,.13,0]);
  for(let i=0;i<5;i++)s.beam([px-1.04+i*.15,py+.03,pz-.46],[px-1.04+i*.15,py+.45,pz-.46],.018,'#796344',.018,4);
  for(let i=0;i<12;i++){
    const a=i*2.39996,r=.06*Math.sqrt(i);
    s.ellipsoid([px-.72+Math.cos(a)*r,py+.5+(i%3)*.035,pz-.2+Math.sin(a)*r],[.085,.095,.085],i%3?'#c86a4e':'#d19b4d',1);
  }
  s.box([px+.46,py+.13,pz+.05],[.56,.11,.34],'#eadfb9',[0,-.32,0]);
  s.ellipsoid([px+.68,py+.22,pz-.01],[.18,.1,.15],'#ead8a3',1);

  // Flour sacks and a low barrel sit beside the mill rather than on its path.
  const sx=41.05,sz=-65.5,sy=terrainHeight(sx,sz);
  for(let i=0;i<3;i++)s.ellipsoid([sx+i*.38,sy+.27+(i%2)*.08,sz+i*.09],[.3,.42,.24],'#d8cba3',2);
  s.add(new THREE.CylinderGeometry(.37,.37,.72,12), '#98734d',[42.1,sy+.37,-66.05],[1,1,1],[0,0,Math.PI/2]);
  for(const x of [41.76,42.44])s.add(new THREE.TorusGeometry(.37,.025,4,12),'#667068',[x,sy+.37,-66.05],[1,1,1],[0,Math.PI/2,0]);

  // A small sign is the only hint on the near side of the ridge.
  const signX=34.25,signZ=-56.75,signY=terrainHeight(signX,signZ);
  s.beam([signX,signY,signZ],[signX,signY+1.72,signZ],.06,'#776343',.045,7);
  s.box([signX-.28,signY+1.42,signZ],[1.05,.34,.09],'#aa8b59',[0,-.2,-.04]);
  s.add(new THREE.ConeGeometry(.23,.52,3),'#aa8b59',[signX-.84,signY+1.42,signZ],[1,1,1],[0,0,Math.PI/2]);
  colliders.push({type:'circle',x:signX,z:signZ,radius:.1});

  for(let i=0;i<680;i++){
    const x=HIGHLAND.x+(rng()-.5)*HIGHLAND.radiusX*2.05;
    const z=HIGHLAND.z+(rng()-.5)*HIGHLAND.radiusZ*2.05;
    if(Math.hypot((x-HIGHLAND.x)/HIGHLAND.radiusX,(z-HIGHLAND.z)/HIGHLAND.radiusZ)>.98)continue;
    if(pathDistance(x,z)<1.55||Math.hypot(x-WINDMILL.x,z-WINDMILL.z)<3.15)continue;
    if(ORCHARD_TREES.some(([tx,tz,scale])=>Math.hypot(x-tx,z-tz)<.72*scale))continue;
    if(Math.abs(x-px)<1.5&&Math.abs(z-pz)<1.18)continue;
    const scale=.62+rng()*.68;
    blossoms.push({position:[x,terrainHeight(x,z),z],scale:[scale,scale,scale],rotation:[(rng()-.5)*.18,rng()*TAU,(rng()-.5)*.18]});
  }
  s.finish(root,'Harvest picnic and orchard gateway');
  instances(root,flowerSprig(),paintedMaterial({side:THREE.DoubleSide,wind:.025,rooted:true}),blossoms,'Tiny flowers in the orchard grass');
  return blossoms.length;
}

function driftingLeaves(root,rng) {
  const entries=[],state=[];
  for(let i=0;i<28;i++){
    const tree=ORCHARD_TREES[i%ORCHARD_TREES.length];
    const x=tree[0]+(rng()-.5)*3.1,z=tree[1]+(rng()-.5)*2.5;
    state.push({x,z,ground:terrainHeight(x,z),phase:rng(),speed:.075+rng()*.035,sway:.3+rng()*.35});
    entries.push({position:[x,state[i].ground+2,z],scale:[.55,1,.7],color:i%3?'#a2aa63':'#d1a45e'});
  }
  const mesh=instances(root,leafShape(.24,.085,.05),paintedMaterial({side:THREE.DoubleSide}),entries,'Leaves drifting through the orchard');
  mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(HIGHLAND.x,HIGHLAND.y+2,HIGHLAND.z),24);
  const o=new THREE.Object3D();
  return t=>{
    for(let i=0;i<state.length;i++){
      const leaf=state[i],fall=(leaf.phase+t*leaf.speed)%1;
      o.position.set(leaf.x+Math.sin(t*.7+i*1.7)*leaf.sway,leaf.ground+1.0+(1-fall)*3.3,leaf.z+Math.cos(t*.53+i)*leaf.sway*.65);
      o.rotation.set(fall*5+i,fall*TAU*.7,t*.9+i*.31);
      const scale=.62+(i%4)*.07;o.scale.set(scale,scale,scale);
      o.updateMatrix();mesh.setMatrixAt(i,o.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  };
}

export function makeHighland(scene,colliders) {
  const rng=random(50319),rotor=windmill(scene,colliders);
  const root=new THREE.Group();root.name='The hidden orchard basin';scene.add(root);
  makeOrchardTrees(root,colliders,rng);
  const blossoms=harvestDetails(root,colliders,rng);
  const animateLeaves=driftingLeaves(root,rng);
  const animate=t=>{
    rotor.rotation.z=.12+t*.105;
    if(root.visible)animateLeaves(t);
  };
  return {blossoms,details:[{root,x:HIGHLAND.x,z:HIGHLAND.z,distance:88}],animate};
}
