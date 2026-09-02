import * as THREE from 'three';
import { GARDEN, GARDEN_BEDS, terrainHeight } from './land.js';
import { random, TAU } from './math.js';
import { Sculpture, instances } from './geometry.js';
import { paintedMaterial } from './materials.js';
import { leafShape, terracottaPot, lantern } from './craft.js';

function plantGeometry(kind) {
  const s=new Sculpture(paintedMaterial({side:THREE.DoubleSide}));
  if(kind==='cabbage'){
    for(let i=0;i<10;i++)s.add(leafShape(.32,.14,.1),['#668950','#89a567','#a4b778'][i%3],[0,.025,0],
      [1,1,1],[-.35,i*2.39996,0]);
    s.ellipsoid([0,.12,0],[.16,.13,.16],'#a1b982',1);
  }else if(kind==='carrot'){
    s.ellipsoid([0,.035,0],[.046,.065,.046],'#c89354',0);
    for(let i=0;i<7;i++)s.add(leafShape(.43,.035,.03),i%2?'#71954e':'#98ad66',[0,.05,0],
      [1,1,1],[-1.03,i*TAU/7,0]);
  }else if(kind==='tomato'){
    s.beam([.055,0,0],[.055,1.06,0],.014,'#b49d70',.012,5);
    s.beam([0,0,0],[-.025,.86,.025],.016,'#68894d',.009,5);
    for(let i=0;i<7;i++){
      const a=i*2.39996,h=.15+i*.095;
      s.add(leafShape(.28,.092,.03),'#769955',[0,h,0],[1,1,1],[-.24,a,.08]);
      if(i%2===0){
        const x=Math.sin(a)*.13,z=Math.cos(a)*.13;
        s.ellipsoid([x,h-.025,z],[.065,.059,.065],i%4?'#d99859':'#c47959',1);
        s.add(leafShape(.065,.015),'#60804a',[x,h+.032,z],[1,1,1],[0,a,0]);
      }
    }
  }else if(kind==='lavender'){
    for(let stem=0;stem<3;stem++){
      const a=stem*2.39996,x=Math.sin(a)*.1,z=Math.cos(a)*.1,h=.47+stem*.06;
      s.beam([0,0,0],[x,h,z],.007,'#829567',.003,4);
      for(let i=0;i<3;i++)s.add(leafShape(.19,.022),'#8c9d73',[x*.4,.05+i*.06,z*.4],[1,1,1],[-.3,a+i*2.3,0]);
      for(let row=0;row<5;row++){
        const width=.038*(1-row*.12);
        s.ellipsoid([x,h+row*.035,z],[width,.029,width],['#b5a4c5','#918aaf','#cbc1d3'][row%3],0);
      }
    }
  }else if(kind==='sunflower'){
    s.beam([0,0,0],[.035,1.27,0],.017,'#758842',.012,6);
    for(let i=0;i<4;i++)s.add(leafShape(.34,.115,.05),'#809a4e',[0,.23+i*.18,0],[1,1,1],[-.25,i*2.4,0]);
    for(let i=0;i<13;i++){
      const a=i*TAU/13,g=new THREE.BufferGeometry();
      const v=[];
      for(const [r,offset,d] of [[.1,-.06,0],[.23,-.058,.017],[.34,0,.04],[.23,.058,.017],[.1,.06,0]]){
        v.push(Math.sin(a)*r+Math.cos(a)*offset,Math.cos(a)*r-Math.sin(a)*offset,d);
      }
      g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex([0,1,4,1,3,4,1,2,3]);g.computeVertexNormals();
      s.add(g,i%3?'#e9c162':'#f1d482',[.035,1.27,.025]);
    }
    s.add(new THREE.SphereGeometry(.13,12,6),'#8c7343',[.035,1.27,.042],[1,1,.36]);
    for(let i=0;i<17;i++){
      const a=i*2.39996,r=Math.sqrt(i/17)*.105;
      s.ellipsoid([.035+Math.sin(a)*r,1.27+Math.cos(a)*r,.091],[.009,.009,.003],'#beaa64',0);
    }
  }
  return s.finish(new THREE.Group(),kind+' prototype').geometry;
}

function wisteriaGeometry() {
  const s=new Sculpture(paintedMaterial({side:THREE.DoubleSide}));
  // Each flower is a folded petal; a whole hanging raceme shares one instance.
  for(let row=0;row<8;row++){
    const radius=.07*(1-row*.083);
    for(let petal=0;petal<5;petal++){
      const a=petal*TAU/5+row*.57;
      const p=[Math.sin(a)*radius,-row*.095,Math.cos(a)*radius];
      s.add(leafShape(.105*(1-row*.055),.034,.013),
        ['#aaa0c5','#c5b8d6','#ddd1df','#a295bc'][row%4],p,[1,1,1],[1.2,a,0]);
    }
  }
  return s.finish(new THREE.Group(),'wisteria prototype').geometry;
}

function makeArbour(scene,colliders,s,plants) {
  const rng=random(8074),cx=GARDEN.x,cz=-.25,y=GARDEN.y;
  const leaves=[],blossoms=[];
  const arch=x=>y+2.72+.43*(1-(x/1.83)**2);
  for(const side of [-1,1])for(const end of [-1,1]){
    const x=cx+side*1.62,z=cz+end*1.15;
    s.box([x,y+.09,z],[.34,.18,.34],'#a5a88d');
    s.box([x,y+1.39,z],[.15,2.68,.15],'#a18c63');
    s.box([x,y+.27,z],[.19,.15,.19],'#748d70');
    s.beam([x,y+2.12,z],[x-side*.52,y+2.7,z],.054,'#8d805e',.054,4);
    colliders.push({type:'circle',x,z,radius:.17});
    for(let i=0;i<11;i++){
      const h=.38+i*.22;
      s.beam([x+Math.sin(i*.9)*.09,y+h-.2,z+.085],[x+Math.sin((i+1)*.9)*.09,y+h,z+.085],.014,'#718153',.009,4);
      if(i>3)for(const branch of [-1,1])leaves.push({position:[x+Math.sin(i*.9)*.09,y+h,z+.085],scale:[.25,1,.29],rotation:[-.28,i+branch*.75,branch*.3],color:i%2?'#839b60':'#9dad71'});
    }
  }
  for(const end of [-1,1])for(let i=0;i<12;i++){
    const x0=-1.9+i*3.8/12,x1=x0+3.8/12;
    s.beam([cx+x0,arch(x0),cz+end*1.18],[cx+x1,arch(x1),cz+end*1.18],.083,'#ab9468',.083,4);
  }
  for(let i=0;i<10;i++){
    const dx=-1.78+i*3.56/9;
    s.box([cx+dx,arch(dx)+.09,cz],[.095,.13,2.77],'#b5a177');
  }
  for(let i=0;i<440;i++){
    const x=(rng()-.5)*3.95,z=(rng()-.5)*2.9;
    leaves.push({position:[cx+x,arch(x)+.15+rng()*.1,cz+z],scale:[.28+rng()*.18,1,.27+rng()*.2],rotation:[(rng()-.5)*.6,rng()*TAU,(rng()-.5)*.7],color:['#799451','#94a861','#b3bc7a'][i%3]});
  }
  for(let i=0;i<105;i++){
    const x=(rng()-.5)*3.65,z=(rng()-.5)*2.75;
    // Even the longest central blooms end above a standing visitor's head.
    const length=.62+rng()*.29;
    blossoms.push({position:[cx+x,arch(x)+.09,cz+z],scale:[.8+rng()*.5,length,1],rotation:[.025,rng()*TAU,.04]});
  }
  lantern(s,cx+1.62,y+2.18,cz+1.16,.72);
  for(const side of [-1,1]){
    const px=cx+side*2.2,pz=cz+1.28;
    const py=terracottaPot(s,px,terrainHeight(px,pz),pz,.36,.48,side>0?'#b77c58':'#b98e66');
    plants.lavender.push({position:[px,py,pz],scale:[1.3,1.18,1.3]});
    colliders.push({type:'circle',x:px,z:pz,radius:.34});
  }
  instances(scene,leafShape(1,.38,.075),paintedMaterial({leaf:true,side:THREE.DoubleSide,wind:.018}),leaves,'Leaves over the garden arbour');
  instances(scene,wisteriaGeometry(),paintedMaterial({side:THREE.DoubleSide,wind:.05,rooted:true}),blossoms,'Hanging wisteria flowers');
}

export function makeGarden(scene,colliders) {
  const s=new Sculpture(paintedMaterial({side:THREE.DoubleSide})),rng=random(8023);
  const plants={cabbage:[],carrot:[],tomato:[],lavender:[],sunflower:[]};
  const {x:cx,z:cz,y}=GARDEN;
  // A clear central aisle and four beds let the visitor walk among the planting.
  GARDEN_BEDS.forEach(([x,z],bed)=>{
    const soil=terrainHeight(x,z)+.235;
    s.box([x,soil-.13,z],[1.62,.25,2.4],'#756346');
    for(const side of [-1,1]){
      s.box([x+side*.84,soil-.025,z],[.095,.32,2.55],'#9c855e');
      s.box([x,soil-.025,z+side*1.23],[1.76,.32,.095],'#a38e66');
      for(const end of [-1,1])s.box([x+side*.82,soil-.02,z+end*1.21],[.13,.4,.13],'#8e7b58');
    }
    for(let row=0;row<5;row++)for(let col=0;col<3;col++){
      const px=x+(col-1)*.49+(rng()-.5)*.04,pz=z+(row-2)*.44;
      const kind=bed===0?'cabbage':bed===1?'carrot':bed===2?'tomato':'lavender';
      const scale=kind==='cabbage'?.8+rng()*.1:kind==='tomato'?.83+rng()*.16:.86+rng()*.24;
      plants[kind].push({position:[px,soil+.005,pz],scale:[scale,scale,scale],rotation:[0,rng()*TAU,0]});
    }
    // A small blank plant marker keeps the beds handmade without menu-like labels.
    s.box([x+.47,soil+.15,z+.98],[.17,.15,.022],'#d0bd8a',[.16,.18,0]);
    s.beam([x+.47,soil,z+.98],[x+.47,soil+.22,z+.98],.014,'#a48e60',.012,4);
    colliders.push({type:'box',x,z,halfX:.9,halfZ:1.29,angle:0});
  });

  // Low, open garden edging preserves both entrances and the sightlines.
  for(const side of [-1,1]){
    const x=cx+side*4.12;
    for(let i=0;i<5;i++){
      const z=.45-i*2.37,py=terrainHeight(x,z);
      s.box([x,py+.39,z],[.1,.83,.1],'#80977a');
      if(i){
        const prev=z+2.37,ph=terrainHeight(x,prev);
        for(const h of [.23,.59])s.beam([x,py+h,z],[x,ph+h,prev],.034,'#a4b091',.034,4);
      }
    }
    for(let i=0;i<5;i++){
      const px=cx+side*(1.78+i*.45),pz=.62,py=terrainHeight(px,pz);
      s.box([px,py+.37,pz],[.1,.74,.05],'#9cad8b');
      s.add(new THREE.ConeGeometry(.072,.1,4),'#a7b596',[px,py+.79,pz],[1,1,1],[0,Math.PI/4,0]);
    }
    for(const h of [.22,.54])s.box([cx+side*2.68,y+h,.66],[2.16,.05,.055],'#819977');
    colliders.push({type:'box',x,z:cz,halfX:.07,halfZ:4.85,angle:0});
    colliders.push({type:'box',x:cx+side*2.74,z:.62,halfX:1.03,halfZ:.065,angle:0});
  }
  for(let i=0;i<20;i++){
    const x=cx+(i%2?-.36:.34)+(rng()-.5)*.16,z=1.3-i*.61;
    s.ellipsoid([x,terrainHeight(x,z)+.022,z],[.27+rng()*.13,.04,.22+rng()*.12],['#b3b399','#c2bba1','#a9ac90'][i%3],1);
  }
  // Sunny flowers at the rear and lavender along the fence soften the geometry.
  for(let i=0;i<12;i++){
    const side=i<6?-1:1,x=cx+side*(2.0+(i%3)*.63),z=-9.25+(i%2)*.25;
    const scale=.88+rng()*.32;
    plants.sunflower.push({position:[x,terrainHeight(x,z),z],scale:[scale,scale,scale],rotation:[0,(rng()-.5)*.45,0]});
  }
  for(let i=0;i<64;i++){
    const side=i%2?-1:1,x=cx+side*(3.72+rng()*.24),z=-8.6+rng()*8.5;
    const scale=.75+rng()*.3;
    plants.lavender.push({position:[x,terrainHeight(x,z),z],scale:[scale,scale,scale],rotation:[0,rng()*TAU,0]});
  }
  // A planting table, clay pots and watering can fill the back corner.
  const tx=18.9,tz=-10.45,ty=terrainHeight(tx,tz);
  s.box([tx,ty+.87,tz],[2.15,.1,.62],'#a48e65');
  s.box([tx,ty+.26,tz],[1.95,.07,.55],'#8c805c');
  for(const a of [-1,1])for(const b of [-1,1])s.box([tx+a*.86,ty+.44,tz+b*.22],[.09,.86,.09],'#8a7c59');
  for(let i=0;i<3;i++){
    const x=tx-.68+i*.49,py=terracottaPot(s,x,ty+.925,tz,.145+i*.013,.23+i*.014);
    if(i===2)plants.lavender.push({position:[x,py,tz],scale:[.47,.54,.47]});
  }
  const wx=tx+.85,wy=ty+.92,wz=tz+.01;
  s.add(new THREE.CylinderGeometry(.135,.165,.28,12),'#78998a',[wx,wy+.14,wz]);
  s.add(new THREE.TorusGeometry(.17,.018,5,12,Math.PI*1.55),'#7d9b89',[wx+.145,wy+.18,wz],[1,1,1],[0,0,-Math.PI*.75]);
  s.beam([wx-.1,wy+.075,wz],[wx-.4,wy+.24,wz],.031,'#819e8c',.052,8);
  s.ellipsoid([wx-.42,wy+.255,wz],[.065,.043,.065],'#9bad96',1);
  terracottaPot(s,tx-.55,ty+.3,tz,.18,.29,'#ae825f');
  terracottaPot(s,tx+.16,ty+.3,tz,.22,.34,'#c18b67');
  colliders.push({type:'box',x:tx,z:tz,halfX:1.08,halfZ:.33,angle:0});

  makeArbour(scene,colliders,s,plants);
  s.finish(scene,'The cottage kitchen garden');
  for(const [kind,entries] of Object.entries(plants))instances(scene,plantGeometry(kind),
    paintedMaterial({side:THREE.DoubleSide,wind:kind==='sunflower'?.035:.013,rooted:true}),entries,'Garden '+kind);
  return {plants:Object.values(plants).reduce((n,list)=>n+list.length,0)};
}
