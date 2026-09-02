import * as THREE from 'three';

// Small reusable, metre-scale pieces for the places around the valley.
export function leafShape(length=.3,width=.08,curl=.05) {
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([
    0,0,0, -width,curl*.4,length*.35, 0,curl,length*.5,
    width,curl*.4,length*.35, -width*.6,curl*.75,length*.75,
    width*.6,curl*.75,length*.75, 0,curl*.3,length,
  ],3));
  g.setIndex([0,1,2,0,2,3,1,4,2,2,5,3,2,4,6,2,6,5]);
  g.computeVertexNormals();return g;
}

export function terracottaPot(s,x,y,z,r=.28,h=.43,color='#bb805b') {
  const profile=[[.01,0],[r*.66,0],[r*.98,h*.85],[r*1.06,h*.87],
    [r*1.06,h],[r*.87,h],[r*.85,h*.86],[r*.66,h*.17],[.01,h*.17]];
  s.add(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),14),color,[x,y,z]);
  s.add(new THREE.CylinderGeometry(r*.83,r*.83,.025,14),'#665a40',[x,y+h*.83,z]);
  return y+h*.85;
}

export function bucket(s,x,y,z,scale=1) {
  s.add(new THREE.CylinderGeometry(.23,.17,.35,12,1,true),'#aa8b60',[x,y+.175*scale,z],[scale,scale,scale]);
  s.add(new THREE.CylinderGeometry(.168,.168,.03,12),'#766447',[x,y+.018*scale,z],[scale,scale,scale]);
  for(const h of [.06,.3])s.add(new THREE.TorusGeometry(h<.1?.183:.217,.016,4,12),'#657369',[x,y+h*scale,z],[scale,scale,scale],[Math.PI/2,0,0]);
  s.add(new THREE.TorusGeometry(.225,.013,4,12,Math.PI),'#6c7464',[x,y+.34*scale,z],[scale,scale,scale]);
}

export function lantern(s,x,y,z,scale=1) {
  const p=(dx,dy,dz)=>[x+dx*scale,y+dy*scale,z+dz*scale];
  s.box(p(0,0,0),[.22*scale,.33*scale,.22*scale],'#ebc884');
  for(const a of [-1,1])for(const b of [-1,1])s.box(p(a*.13,0,b*.13),[.026*scale,.39*scale,.026*scale],'#53665c');
  for(const h of [-.19,.19])s.box(p(0,h,0),[.32*scale,.045*scale,.32*scale],'#617365');
  s.add(new THREE.ConeGeometry(.27,.15,4),'#718277',p(0,.29,0),[scale,scale,scale],[0,Math.PI/4,0]);
  s.add(new THREE.TorusGeometry(.047,.011,4,8),'#526157',p(0,.405,0),[scale,scale,scale]);
}

export function bench(s,x,y,z,rotation=0) {
  const c=Math.cos(rotation),a=Math.sin(rotation);
  const p=(dx,dy,dz)=>[x+c*dx+a*dz,y+dy,z-a*dx+c*dz];
  for(let i=0;i<3;i++)s.box(p(0,.48,-.2+i*.19),[1.96,.09,.17],'#a69469',[0,rotation,0]);
  for(const side of [-1,1]){
    s.box(p(side*.73,.23,0),[.12,.46,.4],'#7c7759',[0,rotation,0]);
    s.box(p(side*.78,.7,.29),[.075,.71,.07],'#7b7659',[0,rotation,0]);
  }
  for(const h of [.8,1.0])s.box(p(0,h,.29),[2.02,.16,.07],'#9a8a64',[0,rotation,0]);
}
