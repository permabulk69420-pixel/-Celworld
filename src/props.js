import * as THREE from 'three';
import { COTTAGE, BRIDGE, bridgeHeight, terrainHeight, riverX, riverWidth, reserved } from './land.js';
import { random, TAU } from './math.js';
import { paintedMaterial } from './materials.js';
import { Sculpture, instances } from './geometry.js';

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
  s.box([0,1.82,0],[6.8,3.3,5.8],plaster);
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
    s.box([x,1.78,0],[.18,3.35,5.97],timber);
    // Expose cream plaster between thin exterior corner posts.
    s.box([x+(x>0?.102:-.102),1.81,0],[.03,3.05,5.43],plaster);
    for(const z of [-2.9,2.9])s.box([x,1.75,z],[.19,3.38,.19],timber);
  }
  for(const z of [-2.94,2.94]) {
    s.box([0,.44,z],[6.98,.17,.14],timber);
    for(const x of [-3.38,-.35,3.38])s.box([x,1.95,z],[.13,3.35,.14],timber);
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
  s.box([-.8,1.43,3.012],[1.26,2.18,.12],'#3e6158');
  s.box([-.8,1.41,3.093],[1.05,1.97,.03],'#527467');
  for(let i=0;i<5;i++)s.box([-.8-.4+i*.2,1.42,3.121],[.011,1.95,.007],'#405d53');
  s.box([-.8,2.68,3.06],[1.58,.16,.26],timber);
  for(const x of [-1.52,-.07])s.box([x,1.45,3.06],[.14,2.54,.23],timber);
  s.ellipsoid([-.39,1.41,3.17],[.047,.047,.05],'#d4af67',1);
  for(let i=0;i<3;i++)s.box([-.8,.085-i*.095,3.22+i*.37],[1.8+i*.14,.15,.5],'#b0ac92');
  // Windows are made at human scale with frames, panes, open shutters and flower boxes.
  const window=(x,y,z,w=1.34)=>{
    s.box([x,y,z],[w,1.34,.085],'#314c46');
    s.box([x,y+.05,z+.05],[w-.12,1.12,.026],'#679899');
    s.box([x-.26,y+.28,z+.069],[.29,.41,.012],'#aecac1',[0,0,-.12]);
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
  };
  window(1.83,2.02,3.02);
  s.box([3.59,2.0,-.8],[.065,1.25,1.3],'#365a53');
  s.box([3.637,2.0,-.8],[.026,1.09,1.15],'#719995');
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
  // Rain barrel, stacked firewood, bench and a potted olive-green shrub.
  s.add(new THREE.CylinderGeometry(.43,.38,.93,12), '#8b7851',[3.95,.47,2.2]);
  for(const y of [.18,.74])s.add(new THREE.TorusGeometry(.42,.025,4,12),'#635d4b',[3.95,y,2.2],[1,1,1],[Math.PI/2,0,0]);
  for(let row=0;row<3;row++)for(let col=0;col<5-row;col++)s.beam([-2.7+col*.27+row*.13,.19+row*.24,3.16],[-2.7+col*.27+row*.13,.19+row*.24,3.72],.125,'#8b714b',.115,8);
  s.box([2.05,.53,4.18],[1.8,.12,.46],'#9b7d4f');
  for(const x of [1.38,2.72])s.box([x,.28,4.18],[.11,.51,.35],timber);
  s.add(new THREE.CylinderGeometry(.31,.23,.47,12),'#b67d59',[-2.47,.25,4.14]);
  for(let i=0;i<7;i++)s.ellipsoid([-2.47+(rng()-.5)*.38,.63+rng()*.23,4.14+(rng()-.5)*.38],[.22,.25,.2],'#7d9450',1);
  s.finish(group,'The meadow cottage');
  colliders.push({type:'box',x:COTTAGE.x,z:COTTAGE.z,halfX:3.58,halfZ:3.08,angle:COTTAGE.rotation});
  const smoke=new THREE.Vector3(-1.65,6.4,-1.26).applyEuler(group.rotation).add(group.position);
  return { group, smoke };
}

export function makeStonesAndGarden(scene, colliders) {
  const rng=random(575);
  const rocks=[], moss=[];
  for(let i=0;i<250;i++){
    const z=(rng()-.5)*153;
    const side=rng()>.5?1:-1;
    const x=riverX(z)+side*(riverWidth(z)+.25+rng()*1.5);
    if(Math.abs(z-BRIDGE.z)<2.4)continue;
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
  details.finish(scene,'Garden fence and the old tree bench');
}
