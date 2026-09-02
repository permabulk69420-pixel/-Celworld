import * as THREE from 'three';
import { CLEARING, terrainHeight, pathDistance, WATER_Y } from './land.js';
import { random, noise, TAU } from './math.js';
import { Sculpture, instances } from './geometry.js';
import { paintedMaterial, waterMaterial } from './materials.js';
import { leafShape, bucket, lantern, bench } from './craft.js';

function bluebellGeometry() {
  const s=new Sculpture(paintedMaterial({side:THREE.DoubleSide}));
  for(let i=0;i<4;i++)s.add(leafShape(.34,.035,.02),'#709168',[0,0,0],[1,1,1],[-.85,i*2.39996,0]);
  s.beam([0,0,0],[.015,.51,0],.008,'#73926b',.004,4);
  s.beam([.015,.51,0],[.09,.57,0],.004,'#73926b',.003,4);
  for(let i=0;i<4;i++){
    const x=.08+i*.024,y=.5-i*.074,z=i%2?.058:-.025;
    s.beam([.015,y+.012,0],[x,y+.035,z],.003,'#789572',.002,3);
    s.add(new THREE.CylinderGeometry(.018,.044,.07,7,1,true),i%2?'#9aadd0':'#adadd2',[x,y,z]);
    for(let j=0;j<5;j++)s.add(leafShape(.031,.012,.006),'#bbbddd',
      [x,y-.028,z],[1,1,1],[-.14,j*TAU/5,0]);
  }
  return s.finish(new THREE.Group(),'woodland bluebell prototype').geometry;
}

function wellWater() {
  const g=new THREE.CircleGeometry(.95,32);
  g.rotateX(-Math.PI/2);
  const depth=new Float32Array(g.attributes.position.count).fill(.29);
  depth[0]=.4;
  g.setAttribute('waterDepth',new THREE.BufferAttribute(depth,1));
  return g;
}

export function makeClearing(scene,colliders) {
  const {x,z,y}=CLEARING,rng=random(9814);
  const s=new Sculpture(paintedMaterial({side:THREE.DoubleSide}));
  const masonry=new Sculpture(paintedMaterial({side:THREE.DoubleSide}));
  const moss=[],flowers=[],stones=[],leaves=[];
  const palette=['#9ba28b','#aeb09b','#939e8a','#bab99e','#a3ac93'];
  // Individual stones form a real hollow ring, so the water stays inside its walls.
  masonry.add(new THREE.CylinderGeometry(.94,.94,.26,16),'#697e69',[x,y+.14,z]);
  // A recessed mortar ring closes the joints between individual stone faces.
  // The water therefore meets a wall around its entire circumference.
  for(const [inner,outer,height,base,color] of [[.855,1.095,.79,.01,'#7e8c79'],[.82,1.18,.135,.79,'#97a28b']]){
    const profile=[[inner,0],[outer,0],[outer,height],[inner,height],[inner,0]];
    masonry.add(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),56),color,[x,y+base,z]);
  }
  for(let row=0;row<3;row++)for(let i=0;i<14;i++){
    const a=(i+(row%2)*.5)*TAU/14;
    const px=x+Math.sin(a)*1.04,pz=z+Math.cos(a)*1.04;
    masonry.box([px,y+.17+row*.245,pz],[.455,.235,.32],palette[(i+row)%palette.length],[0,a,0]);
    if(row===2&&i%2===0)moss.push({position:[px,y+.956,pz],scale:[.23,.035,.17],rotation:[0,a,0],color:['#83976a','#9dad75','#728b58'][i%3]});
  }
  for(let i=0;i<14;i++){
    const a=(i+.5)*TAU/14;
    masonry.box([x+Math.sin(a)*1.03,y+.86,z+Math.cos(a)*1.03],[.48,.15,.4],palette[(i+2)%5],[0,a,0]);
  }
  masonry.finish(scene,'Stone walls of the woodland well');
  const water=new THREE.Mesh(wellWater(),waterMaterial());
  water.position.set(x,y+.54,z);water.name='Water inside the woodland well';scene.add(water);
  for(const side of [-1,1]){
    s.box([x+side*1.27,y+1.44,z],[.16,2.87,.17],'#7b7859');
    s.box([x+side*1.27,y+.21,z],[.28,.4,.28],'#a0a98d');
    s.beam([x+side*1.27,y+2.22,z],[x+side*.67,y+2.9,z],.052,'#90906c',.052,4);
  }
  const roofY=dx=>y+3.66-Math.abs(dx)*.52;
  const roofColors=['#869585','#9baa92','#aeb69b','#839481','#b4b99c','#8e9d88'];
  for(const side of [-1,1]){
    for(let row=0;row<7;row++)for(let tile=0;tile<9;tile++){
      const dx=side*(row+.5)*.25,dz=-1.31+(tile+.5)*.295;
      s.box([x+dx,roofY(dx),z+dz],[.28,.065,.285],roofColors[Math.floor(rng()*roofColors.length)],
        [0,0,-side*Math.atan(.52)]);
    }
    for(const end of [-1,1])s.beam([x,y+3.64,z+end*1.42],[x+side*1.8,roofY(1.8),z+end*1.42],.06,'#76806b',.06,4);
    s.box([x+side*1.78,roofY(1.78)-.035,z],[.09,.13,2.88],'#70806a');
  }
  s.beam([x,y+3.72,z-1.44],[x,y+3.72,z+1.44],.072,'#9caa89',.072,6);
  s.beam([x-1.5,y+2.83,z],[x+1.5,y+2.83,z],.075,'#929074',.075,4);
  for(const side of [-1,1])for(const end of [-1,1])s.beam(
    [x+side*1.75,roofY(1.75)-.08,z+end*.9],[x,y+3.58,z+end*.9],.063,'#838c73',.063,4);
  s.beam([x,y+2.83,z],[x,y+3.58,z],.057,'#8e947a',.057,4);
  // Windlass, rope and a bucket are scenery; the well needs no new controls.
  s.beam([x-1.39,y+1.74,z],[x+1.42,y+1.74,z],.059,'#7e7456',.059,8);
  s.beam([x-.43,y+1.74,z],[x+.43,y+1.74,z],.14,'#b49b6d',.14,12);
  for(let i=0;i<14;i++)s.add(new THREE.TorusGeometry(.144,.01,4,12),'#c4b17e',
    [x-.38+i*.055,y+1.74,z],[1,1,1],[0,Math.PI/2,0]);
  s.beam([x+.05,y+1.88,z],[x+.05,y+1.04,z],.014,'#b3a070',.014,5);
  bucket(s,x+.05,y+.47,z,1);
  s.beam([x+1.42,y+1.74,z],[x+1.42,y+1.42,z+.13],.027,'#687267',.027,5);
  s.beam([x+1.42,y+1.42,z+.13],[x+1.65,y+1.42,z+.13],.04,'#a79165',.04,6);
  colliders.push({type:'circle',x,z,radius:1.3});

  // A worn stone apron and two little seats frame the clearing without blocking its loop.
  for(let ring=0;ring<3;ring++)for(let i=0;i<26+ring*11;i++){
    const count=26+ring*11,a=(i+.4*ring)*TAU/count,r=1.6+ring*.95+(rng()-.5)*.12;
    const px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;
    stones.push({position:[px,terrainHeight(px,pz)+.016,pz],scale:[.2+rng()*.11,.035,.16+rng()*.1],rotation:[0,a,0],color:palette[i%5]});
  }
  const bx=x-3.85,bz=z+.15,by=terrainHeight(bx,bz);
  bench(s,bx,by,bz,-Math.PI/2);
  colliders.push({type:'box',x:bx,z:bz,halfX:1.03,halfZ:.34,angle:-Math.PI/2});
  s.box([x-.7,y+.45,z+4.16],[1.35,.13,.55],'#949b80',[0,-.18,0]);
  for(const side of [-1,1])s.ellipsoid([x-.7+side*.45,y+.21,z+4.16],[.23,.27,.24],'#8c9981',1);
  colliders.push({type:'box',x:x-.7,z:z+4.16,halfX:.69,halfZ:.3,angle:-.18});
  for(const side of [-1,1]){
    const px=x+3.45,pz=z+side*2.2,py=terrainHeight(px,pz);
    s.ellipsoid([px,py+.18,pz],[.33,.25,.3],'#9ba68b',1);
    s.beam([px,py+.16,pz],[px,py+1.67,pz],.04,'#7d8261',.026,7);
    s.beam([px,py+1.67,pz],[px-.18,py+1.74,pz],.025,'#7d8261',.024,6);
    lantern(s,px-.18,py+1.43,pz,.54);
    colliders.push({type:'circle',x:px,z:pz,radius:.27});
  }
  for(let i=0;i<55;i++){
    const a=rng()*TAU,r=.98+rng()*.3,py=y+.78+rng()*.17;
    leaves.push({position:[x+Math.sin(a)*r,py,z+Math.cos(a)*r],scale:[.6+rng()*.5,1,.7+rng()*.4],rotation:[-.2,a,.2],color:['#7d9761','#9eaf78','#688950'][i%3]});
  }
  for(let i=0;i<420;i++){
    const a=rng()*TAU,r=4.25+Math.sqrt(rng())*3.5;
    const px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;
    if(pathDistance(px,pz)<1.6||terrainHeight(px,pz)<WATER_Y+.2||noise(px*.43,pz*.43)<.3)continue;
    const size=.73+rng()*.47;
    flowers.push({position:[px,terrainHeight(px,pz),pz],scale:[size,size,size],rotation:[0,rng()*TAU,0]});
  }
  s.finish(scene,'The old well and woodland clearing');
  instances(scene,new THREE.IcosahedronGeometry(1,1),paintedMaterial({leaf:true}),moss,'Moss on the old well');
  instances(scene,new THREE.IcosahedronGeometry(1,1),paintedMaterial(),stones,'Worn paving in the clearing');
  instances(scene,leafShape(.22,.09,.035),paintedMaterial({side:THREE.DoubleSide,wind:.009}),leaves,'Small leaves around the well');
  instances(scene,bluebellGeometry(),paintedMaterial({side:THREE.DoubleSide,wind:.02,rooted:true}),flowers,'Bluebells around the clearing');
  return {bluebells:flowers.length};
}
