import * as THREE from 'three';
import { COTTAGE, BRIDGE, bridgeHeight, terrainHeight, riverBankX, onLanding } from './land.js';
import { random, TAU } from './math.js';
import { paintedMaterial } from './materials.js';
import { Sculpture, instances } from './geometry.js';
import { cottageWall, cottageCollider, makeInterior, windowGlass } from './interior.js';

export function makeBridge(scene, colliders) {
  const s = new Sculpture(paintedMaterial());
  const rng = random(494);
  const { x: cx, z: cz, halfLength: length, halfWidth: width } = BRIDGE;
  const wood = ['#ad8354','#9c754d','#b58a57','#a47b4e'];
  for (let i = 0; i < 34; i++) {
    const x = cx - length + (i + .5) * length * 2 / 34;
    const y = bridgeHeight(x,cz);
    const slope = -.62 * Math.PI / (2 * length) * Math.sin((x-cx) / length * Math.PI*.5);
    s.box([x,y-.065,cz],[length*2/34-.009,.13,width*2+.22],wood[Math.floor(rng()*wood.length)],[0,0,Math.atan(slope)]);
    for (const z of [cz-width+.15,cz+width-.15]) s.ellipsoid([x,y+.009,z],[.018,.005,.018],'#4b4437',0);
  }
  for (const side of [-1,1]) {
    const z=cz+side*(width+.05);
    const rail=[];
    for (let i=0;i<=6;i++) {
      const x=cx-length+i*(length*2/6), y=bridgeHeight(x,cz);
      s.box([x,y+.48,z],[.12,1.13,.12],'#766047',[0,(i%2)*.07,0]);
      s.box([x,y+1.07,z],[.2,.08,.2],'#aa8b5d');
      rail.push([x,y+.97,z]);
      if(i>0){
        s.beam(rail[i-1],rail[i],.068,'#ae8a5c',.068,6);
        s.beam([rail[i-1][0],rail[i-1][1]-.51,z],[rail[i][0],rail[i][1]-.51,z],.038,'#84704c',.038,5);
      }
    }
    s.beam([cx-length,.65,z],[cx,.95,z],.14,'#725b40',.15,7);
    s.beam([cx,.95,z],[cx+length,.65,z],.14,'#725b40',.15,7);
    colliders.push({type:'box',x:cx,z,halfX:length,halfZ:.09,angle:0});
  }
  s.finish(scene,'The little arched bridge');
}

function roofPatch(x0,x1,z0,z1,side) {
  const positions=[], indices=[];
  const roofY = x => 5.42 - Math.abs(x) * .575 + .1 * (Math.abs(x)/4.1)**3;
  for(let i=0;i<=2;i++)for(let j=0;j<=4;j++){
    const x=x0+(x1-x0)*i/2, z=z0+(z1-z0)*j/4;
    const crown=Math.sin(j/4*Math.PI)*.067;
    positions.push(x,roofY(x)+crown+.022,z);
    if(i<2 && j<4){const a=i*5+j;indices.push(a,a+5,a+1,a+1,a+5,a+6);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setIndex(side>0?indices:indices.flatMap((_,i)=>i%3===0?[indices[i],indices[i+2],indices[i+1]]:[]));
  g.computeVertexNormals();
  return g;
}

export function makeCottage(scene, colliders) {
  const group=new THREE.Group();
  group.position.set(COTTAGE.x,COTTAGE.y,COTTAGE.z);
  group.rotation.y=COTTAGE.rotation;
  scene.add(group);
  const s=new Sculpture(paintedMaterial({side:THREE.DoubleSide}));
  const rng=random(808);
  const plaster='#e2d5aa', timber='#65543a', trim='#e6d8b1', blue='#547b72';
  s.box([0,.15,0],[7.05,.3,6.12],'#8e8970');
  cottageWall(s,6.86,2.94,0,[
    {left:-1.45,right:-.14,bottom:.3,top:2.59},
    {left:1.16,right:2.5,bottom:1.35,top:2.69},
  ],plaster);
  cottageWall(s,6.86,2.94,Math.PI,[{left:-2.045,right:-.795,bottom:1.35,top:2.69}],plaster);
  cottageWall(s,5.84,3.43,-Math.PI/2,[{left:-.47,right:.71,bottom:1.35,top:2.69}],plaster);
  cottageWall(s,5.84,3.43,Math.PI/2,[{left:.15,right:1.45,bottom:1.35,top:2.65}],plaster);
  // Front and rear gables.
  for(const z of [-2.92,2.92]){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute([-3.4,3.56,z,3.4,3.56,z,0,5.38,z],3));
    g.computeVertexNormals();
    s.add(g,'#e9dab0');
    s.beam([-3.46,3.49,z*1.006],[0,5.43,z*1.006],.09,timber,.09,4);
    s.beam([0,5.43,z*1.006],[3.46,3.49,z*1.006],.09,timber,.09,4);
    s.box([0,4.33,z*1.009],[.13,1.62,.12],timber);
    s.box([0,3.52,z*1.009],[6.96,.14,.13],timber);
  }
  for(const x of [-3.43,3.43]){
    for(const z of [-2.9,2.9])s.box([x,1.75,z],[.19,3.38,.19],timber);
  }
  for(const z of [-2.94,2.94]) {
    if(z<0)s.box([0,.44,z],[6.98,.17,.14],timber);
    else{
      s.box([-2.505,.44,z],[1.97,.17,.14],timber);
      s.box([1.71,.44,z],[3.56,.17,.14],timber);
    }
    for(const x of z<0?[-3.38,-.35,3.38]:[-3.38,3.38])s.box([x,1.95,z],[.13,3.35,.14],timber);
  }
  const tileColors=['#b1694c','#c77b53','#b97553','#cd875d','#a76248','#b66d4c'];
  for(const side of [-1,1]) for(let row=0;row<8;row++)for(let tile=0;tile<16;tile++){
    const x0=side*(row*.52),x1=side*((row+1)*.52+.055);
    const z0=-3.65+tile*.456;
    s.add(roofPatch(x0,x1,z0,z0+.445,side),tileColors[Math.floor(rng()*tileColors.length)]);
  }
  s.beam([0,5.48,-3.69],[0,5.48,3.69],.115,'#c07b56',.115,8);
  for(const side of [-1,1]){
    s.box([side*4.16,3.12,0],[.12,.21,7.48],'#81513d');
    for(const z of [-3.7,3.7])s.beam([0,5.45,z],[side*4.17,3.13,z],.085,'#aa694b',.085,5);
    s.box([side*3.53,3.36,0],[.12,.17,6.2],timber);
  }
  // Recessed front door, stone threshold and small porch.
  s.box([-.8,2.68,3.06],[1.58,.16,.26],timber);
  for(const x of [-1.52,-.07])s.box([x,1.45,3.06],[.14,2.54,.23],timber);
  for(let i=0;i<3;i++)s.box([-.8,.25-i*.1,3.15+i*.34],[1.72+i*.12,.1,.4],'#b0ac92');
  // Windows are made at human scale with frames, panes, open shutters and flower boxes.
  const glass=[];
  const window=(x,y,z,w=1.34,facing=0)=>{
    const firstPart=s.parts.length;
    const glassPosition=new THREE.Vector3(x,y,z+.047).applyAxisAngle(THREE.Object3D.DEFAULT_UP,facing);
    glass.push({position:glassPosition.toArray(),scale:[w-.09,1.28,1],rotation:[0,facing,0]});
    for(const a of [-1,1]){
      s.box([x+a*w*.53,y,z+.075],[.095,1.5,.13],trim);
      s.box([x,y+a*.71,z+.075],[w+.2,.095,.13],trim);
      s.box([x+a*(w*.5+.33),y,z+.17],[.54,1.36,.075],blue,[0,a*.38,0]);
      for(let k=0;k<7;k++)s.box([x+a*(w*.5+.33),y-.52+k*.16,z+.228],[.46,.035,.033],'#6c8a75',[0,a*.38,0]);
    }
    s.box([x,y,z+.09],[.058,1.34,.055],trim);
    s.box([x,y,z+.092],[w,.063,.055],trim);
    s.box([x,y-.93,z+.22],[w+.24,.36,.42],'#897149');
    s.box([x,y-.73,z+.23],[w+.26,.065,.47],'#9c8556');
    for(let k=0;k<10;k++){
      const fx=x+(rng()-.5)*w, fz=z+.2+(rng()-.5)*.25,fy=y-.62+rng()*.12;
      s.ellipsoid([fx,fy,fz],[.14,.14,.12],'#637e3b',0);
      s.ellipsoid([fx,fy+.11,fz+.03],[.086,.06,.07],k%3?'#e9c16f':'#dd917b',1);
    }
    if(facing)for(let i=firstPart;i<s.parts.length;i++)s.parts[i].rotateY(facing);
  };
  window(1.83,2.02,3.02);
  window(-1.42,2.02,3.02,1.25,Math.PI);
  window(.12,2.02,3.57,1.18,-Math.PI/2);
  glass.push({position:[3.61,2,-.8],scale:[1.27,1.26,1],rotation:[0,Math.PI/2,0]});
  for(const side of [-1,1]){
    s.box([3.655,2.0,-.8+side*.685],[.1,1.43,.09],trim);
    s.box([3.655,2.0+side*.685,-.8],[.1,.09,1.46],trim);
    s.box([3.72,2.0,-.8+side*1.01],[.075,1.33,.5],blue,[0,side*.3,0]);
  }
  s.box([3.67,2.0,-.8],[.09,1.33,.05],trim);
  s.box([3.67,2.0,-.8],[.09,.05,1.3],trim);
  s.box([3.73,1.13,-.8],[.41,.29,1.49],'#8f774f');
  for(let i=0;i<7;i++){
    s.ellipsoid([3.76,1.38,-1.35+i*.18],[.13,.14,.15],'#788b45',1);
    if(i%2)s.ellipsoid([3.81,1.49,-1.35+i*.18],[.06,.055,.06],'#e5b972',1);
  }
  // Round attic window.
  const round=new THREE.CylinderGeometry(.37,.37,.06,24);
  round.rotateX(Math.PI/2);
  s.add(round,'#567978',[1.16,4.12,2.98]);
  const rim=new THREE.TorusGeometry(.38,.044,5,24);
  s.add(rim,trim,[1.16,4.12,3.025]);
  s.box([1.16,4.12,3.06],[.049,.72,.04],trim);
  s.box([1.16,4.12,3.06],[.72,.049,.04],trim);
  // Chimney with irregular brick courses.
  s.box([-1.65,5.2,-1.26],[.69,2.08,.78],'#bca783');
  for(let row=0;row<8;row++)for(let i=0;i<2;i++){
    s.box([-1.91+i*.35+(row%2)*.055,4.32+row*.235,-.86],[.31,.036,.022],'#ad9677');
  }
  s.box([-1.65,6.24,-1.26],[.91,.17,.99],'#aa967c');
  s.box([-1.65,6.35,-1.26],[.52,.05,.57],'#574d3f');
  // A little tiled canopy and timber brackets shelter the front doorstep.
  for(let row=0;row<5;row++)for(let col=0;col<8;col++){
    const z=3.03+row*.205;
    s.box([-1.75+col*.27,3.015-row*.05,z],[.267,.066,.235],tileColors[(row+col)%tileColors.length],[.23,0,0]);
  }
  s.box([-.805,2.79,3.99],[2.27,.12,.1],'#80563c');
  for(const x of [-1.66,.05]){
    s.beam([x,2.3,3.07],[x,2.76,3.91],.043,timber,.043,5);
    s.beam([x,2.32,3.07],[x,2.94,3.08],.048,timber,.048,5);
  }
  // A small lantern and rain pipe give the exterior some lived-in detail.
  s.box([-1.98,2.24,3.13],[.18,.29,.17],'#e8c67c');
  for(const y of [2.08,2.4])s.box([-1.98,y,3.13],[.25,.055,.24],'#74613f');
  for(const x of [-2.073,-1.887])s.box([x,2.24,3.226],[.021,.31,.022],timber);
  s.beam([4.02,3.12,1.58],[4.02,1.06,1.58],.043,'#777a61',.043,7);
  s.beam([4.02,1.06,1.58],[3.96,.96,2.15],.043,'#777a61',.043,7);
  // Rain barrel, stacked firewood, bench and a potted olive-green shrub.
  s.add(new THREE.CylinderGeometry(.43,.38,.93,12), '#8b7851',[3.95,.47,2.2]);
  for(const y of [.18,.74])s.add(new THREE.TorusGeometry(.42,.025,4,12),'#635d4b',[3.95,y,2.2],[1,1,1],[Math.PI/2,0,0]);
  for(let row=0;row<3;row++)for(let col=0;col<5-row;col++)s.beam([-2.7+col*.27+row*.13,.19+row*.24,3.16],[-2.7+col*.27+row*.13,.19+row*.24,3.72],.125,'#8b714b',.115,8);
  s.box([2.05,.53,4.18],[1.8,.12,.46],'#9b7d4f');
  for(const x of [1.38,2.72])s.box([x,.28,4.18],[.11,.51,.35],timber);
  s.add(new THREE.CylinderGeometry(.31,.23,.47,12),'#b67d59',[-2.47,.25,4.14]);
  for(let i=0;i<7;i++)s.ellipsoid([-2.47+(rng()-.5)*.38,.63+rng()*.23,4.14+(rng()-.5)*.38],[.22,.25,.2],'#7d9450',1);
  s.finish(group,'The meadow cottage');
  const ivy=new Sculpture(paintedMaterial({leaf:true,side:THREE.DoubleSide}));
  const ivyLeaf=new THREE.BufferGeometry();
  ivyLeaf.setAttribute('position',new THREE.Float32BufferAttribute([
    0,-.14,0, -.12,.02,0, -.085,.1,.008, 0,.058,.025, .085,.1,.008, .12,.02,0,
  ],3));
  ivyLeaf.setIndex([0,1,3,1,2,3,0,3,5,3,4,5]);
  ivyLeaf.computeVertexNormals();
  for(let vine=0;vine<5;vine++){
    let previous=[-3.586,.2,-2.48+vine*.2];
    for(let node=1;node<=13;node++){
      const y=.18+node*.23, z=-2.58+vine*.28+Math.sin(node*.49+vine)*.23;
      const p=[-3.595,y,z];
      ivy.beam(previous,p,.008,'#798051',.006,3);
      for(const side of [-1,1]){
        const size=.76+rng()*.57;
        ivy.add(ivyLeaf,['#507b4e','#638947','#8aa35d'][node%3],
          [-3.62-rng()*.022,y+(rng()-.5)*.09,z+side*(.07+rng()*.16)],
          [size,size,size],[0,-Math.PI/2,side*.55+(rng()-.5)*.3]);
      }
      previous=p;
    }
  }
  ivy.finish(group,'Ivy climbing the cottage wall');
  instances(group,new THREE.PlaneGeometry(1,1),windowGlass(),glass,'Thin cottage window glass');
  cottageCollider(colliders,-3.43,0,.10,3.02);
  cottageCollider(colliders,3.43,0,.10,3.02);
  cottageCollider(colliders,0,-2.94,3.51,.10);
  cottageCollider(colliders,-2.48,2.94,1.03,.10);
  cottageCollider(colliders,1.685,2.94,1.825,.10);
  makeInterior(group,colliders);
  const smoke=new THREE.Vector3(-1.65,6.4,-1.26).applyEuler(group.rotation).add(group.position);
  return { group, smoke };
}

export function makeStonesAndGarden(scene, colliders) {
  const rng=random(575);
  const rocks=[], moss=[], pebbles=[];
  for(let i=0;i<250;i++){
    const z=(rng()-.5)*153;
    const side=rng()>.5?1:-1;
    const x=riverBankX(z,side)+side*(-.1+rng()*1.5);
    if(Math.abs(z-BRIDGE.z)<2.4||onLanding(x,z,.6))continue;
    const size=.22+rng()*.62;
    const y=terrainHeight(x,z)+.11;
    rocks.push({position:[x,y,z],scale:[size*(1+rng()*.4),size*.68,size],rotation:[rng()*.3,rng()*TAU,rng()*.3],color: ['#a4a68b','#9b9d84','#b1b099','#8c9984'][i%4]});
    if(i%2===0)moss.push({position:[x-.06,y+size*.35,z],scale:[size*.8,size*.26,size*.8],color:'#7c9250'});
    if(size>.65)colliders.push({type:'circle',x,z,radius:size*.66});
  }
  for(const [x,z,size] of [[-15,19,1.45],[26,-10,1.1],[-19,-15,1.4],[33,-27,1.8],[18,33,1.6]]){
    const y=terrainHeight(x,z);
    rocks.push({position:[x,y+.46,z],scale:[size,size*.66,size*.77],rotation:[.15,.8,.08],color:'#a2a388'});
    moss.push({position:[x-.18,y+size*.85,z],scale:[size*.77,size*.19,size*.65],color:'#718c42'});
    colliders.push({type:'circle',x,z,radius:size*.8});
  }
  const geo=new THREE.IcosahedronGeometry(1,1);
  instances(scene,geo,paintedMaterial(),rocks,'Stream stones');
  instances(scene,new THREE.IcosahedronGeometry(1,1),paintedMaterial({leaf:true}),moss,'Soft moss on the stones');
  // Small gravel patches soften the junction of water, wet soil and meadow.
  for(let i=0;i<90;i++){
    const z=(rng()-.5)*133,side=rng()>.5?1:-1,bank=riverBankX(z,side);
    if(Math.abs(z-BRIDGE.z)<2.7)continue;
    for(let j=0;j<7;j++){
      const x=bank+side*(.05+rng()*.72),pz=z+(rng()-.5)*1.9,size=.045+rng()*.105;
      pebbles.push({position:[x,terrainHeight(x,pz)+size*.19,pz],scale:[size*1.3,size*.46,size],rotation:[.08,rng()*TAU,.09],color:['#a8ab94','#bbc0a4','#829685','#c1b696'][j%4]});
    }
  }
  instances(scene,new THREE.IcosahedronGeometry(1,0),paintedMaterial(),pebbles,'Shoreline gravel');
  const details=new Sculpture(paintedMaterial());
  // A fence frames the garden without fencing off exploration.
  const points=[[26,2],[31,4],[34,8],[35,12],[35,16],[34,20],[32,24]];
  for(let i=0;i<points.length;i++){
    const [x,z]=points[i],y=terrainHeight(x,z);
    details.box([x,y+.56,z],[.17,1.24,.17],'#a18b5f',[.02,.04,.015]);
    details.ellipsoid([x,y+1.2,z],[.12,.1,.12],'#b09a69',0);
    if(i){
      const [px,pz]=points[i-1],py=terrainHeight(px,pz);
      for(const h of [.48,.96])details.beam([px,py+h,pz],[x,y+h,z],.065,'#b2a071',.065,4);
    }
  }
  // A low timber bench beneath the old tree.
  const bx=29,bz=-23,by=terrainHeight(bx,bz);
  details.box([bx,by+.56,bz],[2.4,.12,.58],'#a48c5f',[0,-.23,0]);
  details.box([bx,by+1.01,bz-.3],[2.42,.39,.085],'#ad9668',[0,-.23,-.02]);
  for(const x of [bx-.88,bx+.88])details.box([x,by+.31,bz],[.14,.61,.42],'#786542');
  for(const [x,z,sx,sz] of [[15.55,-13.8,.72,.37],[15.34,-12.95,.62,.34],[14.8,-12.05,.66,.38],[14.22,-11.2,.58,.32]]){
    details.ellipsoid([x,terrainHeight(x,z)+.025,z],[sx,.085,sz],'#b4af92',1);
  }
  details.finish(scene,'Garden fence and the old tree bench');
}
