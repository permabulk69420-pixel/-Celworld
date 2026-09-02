import fs from 'node:fs';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';
import { time, eye, sun } from '../src/materials.js';
import { terrainHeight, SPAWN, COTTAGE, cottageWorld, LANDING, GARDEN, CLEARING, BRIDGE } from '../src/land.js';

// CPU visual QA for the source scene when the provided browser has no WebGL.
// This reads the actual geometry, instances and material uniforms. It is not a headset capture.
const W=1440,H=960;
const view=process.argv[2]||'overview';
const views=['overview','interior','willow','woodland','landing','ground','river','bank','cottage','garden','arbour','clearing','well','bridge'];
if(!views.includes(view))throw new Error('Choose a view: '+views.join(', '));
const world=createWorld();
const camera=new THREE.PerspectiveCamera(58,W/H,.06,900);
if(view==='garden'){
  camera.position.set(31,7.5,7);camera.lookAt(GARDEN.x,3.55,-4.5);
}else if(view==='arbour'){
  camera.position.set(GARDEN.x,GARDEN.y+1.7,3.8);camera.lookAt(GARDEN.x,GARDEN.y+1.6,-6.8);
}else if(view==='clearing'){
  camera.position.set(-52,terrainHeight(-52,17)+1.7,17);camera.lookAt(CLEARING.x,CLEARING.y+1.45,CLEARING.z);
}else if(view==='well'){
  camera.position.set(CLEARING.x+2.8,CLEARING.y+1.7,CLEARING.z+1.5);camera.lookAt(CLEARING.x,CLEARING.y+.9,CLEARING.z);
}else if(view==='bridge'){
  camera.position.set(7.5,3.8,10);camera.lookAt(BRIDGE.x,1.95,BRIDGE.z);
}else if(view==='interior'){
  const p=cottageWorld(-.55,2.0),t=cottageWorld(.25,-1.6);
  camera.fov=68;camera.updateProjectionMatrix();
  camera.position.set(p.x,COTTAGE.y+2.024,p.z);camera.lookAt(t.x,COTTAGE.y+1.6,t.z);
}else if(view==='willow'){
  camera.position.set(8.5,terrainHeight(8.5,32)+1.7,32);camera.lookAt(-8,5.3,24);
}else if(view==='woodland'){
  camera.position.set(-35,terrainHeight(-35,31)+1.7,31);camera.lookAt(-48,terrainHeight(-48,15)+2,15);
}else if(view==='landing'){
  camera.position.set(LANDING.x-.8,LANDING.y+1.7,LANDING.z);camera.lookAt(13,5,-16);
}else if(view==='ground'){
  camera.position.set(SPAWN.x,terrainHeight(SPAWN.x,SPAWN.z)+1.7,SPAWN.z);
  camera.lookAt(7,4,-16);
}else if(view==='river'){
  camera.position.set(-30,terrainHeight(-30,-36)+1.7,-36);camera.lookAt(8,3.4,-8);
}else if(view==='bank'){
  camera.position.set(-24.5,terrainHeight(-24.5,-26)+1.7,-26);camera.lookAt(-11,.6,-34);
}else if(view==='cottage'){
  camera.position.set(24,7,1);camera.lookAt(16,5.3,-19);
}else{
  camera.position.set(18,9,35);camera.lookAt(1.5,4.4,-16);
}
camera.updateMatrixWorld(true);
time.value=17;eye.value.copy(camera.position);world.animateLife(17);
for(const p of world.grass.patches)p.mesh.visible=Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<73;
world.scene.updateMatrixWorld(true);
const pixels=new Uint8Array(W*H*3),depth=new Float32Array(W*H).fill(Infinity);
const colorBuffer=new Float32Array(W*H*3);
const projection=camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);
const frustum=new THREE.Frustum().setFromProjectionMatrix(projection);
const cam=camera.position,sunv=sun.toArray();
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const fract=x=>x-Math.floor(x);
const mix=(a,b,t)=>a+(b-a)*t;
const ss=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const ray=new THREE.Vector3();
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  ray.set((x+.5)/W*2-1,1-(y+.5)/H*2,.5).unproject(camera).sub(cam).normalize();
  const ht=Math.max(ray.y,0),f=ss(0,.65,ht)**.35,hor=ss(-.08,.17,ray.y);
  const d=ray.dot(sun),glow=Math.max(0,d)**18,disc=ss(.99962,.99978,d);
  const c=[
    mix(mix(.79,mix(.44,.08,f),hor)+.18*glow,1,disc),
    mix(mix(.82,mix(.67,.32,f),hor)+.12*glow,.92,disc),
    mix(mix(.66,mix(.70,.56,f),hor)+.03*glow,.65,disc),
  ];
  colorBuffer.set(c,(y*W+x)*3);
}
let triangles=0,draws=0;
const objects=[];
world.scene.traverse(o=>{
  if(!o.isMesh||!o.visible||!o.material.isShaderMaterial||o.name==='A wide summer sky')return;
  if(o.frustumCulled&&!frustum.intersectsObject(o))return;
  objects.push(o);
});
objects.sort((a,b)=>(Number(a.material.transparent)-Number(b.material.transparent)));
const tmp=new THREE.Vector3(),normal=new THREE.Vector3(),mat=new THREE.Matrix4(),worldMat=new THREE.Matrix4();
const pvec=new THREE.Vector4();
const V=17;

function raster(a,b,c,buf,mesh,kind,u,flip){
  const ia=a*V,ib=b*V,ic=c*V;
  const ax=buf[ia],ay=buf[ia+1],bx=buf[ib],by=buf[ib+1],cx=buf[ic],cy=buf[ic+1];
  if(buf[ia+2]<=0||buf[ib+2]<=0||buf[ic+2]<=0)return;
  const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
  if(Math.abs(area)<.008)return;
  const front=(area<0)!==flip;
  if(mesh.material.side===THREE.FrontSide&&!front)return;
  if(mesh.material.side===THREE.BackSide&&front)return;
  const xmin=clamp(Math.floor(Math.min(ax,bx,cx)),0,W-1),xmax=clamp(Math.ceil(Math.max(ax,bx,cx)),0,W-1);
  const ymin=clamp(Math.floor(Math.min(ay,by,cy)),0,H-1),ymax=clamp(Math.ceil(Math.max(ay,by,cy)),0,H-1);
  if(xmin>xmax||ymin>ymax)return;
  triangles++;
  const inv=1/area;
  for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){
    const px=x+.5,py=y+.5;
    const l1=((bx-px)*(cy-py)-(by-py)*(cx-px))*inv;
    const l2=((cx-px)*(ay-py)-(cy-py)*(ax-px))*inv;
    const l3=1-l1-l2;
    if(l1<0||l2<0||l3<0)continue;
    const iz=l1*buf[ia+2]+l2*buf[ib+2]+l3*buf[ic+2],zz=1/iz,idx=y*W+x;
    if(zz>=depth[idx])continue;
    const v=k=>(l1*buf[ia+k]+l2*buf[ib+k]+l3*buf[ic+k])*zz;
    const wx=v(3),wy=v(4),wz=v(5);
    let r,g,b,alpha=1;
    if(kind==='glass'){
      const dist=Math.hypot(cam.x-wx,cam.y-wy,cam.z-wz),len=Math.hypot(v(6),v(7),v(8));
      const dot=((cam.x-wx)*v(6)+(cam.y-wy)*v(7)+(cam.z-wz)*v(8))/Math.max(1e-9,dist*len);
      alpha=.065+(1-Math.abs(dot))**3*.16;r=.51;g=.7;b=.66;
    }else if(kind==='water'){
      const dep=v(14),flow=Math.sin(wz*4.1+17*1.8+Math.sin(wx*3.3+17*.5)*1.7);
      const ripple=Math.sin(wx*6.2+wz*2.8-17*1.6)*.5+.5,long=Math.sin(wz*.72-wx*.55+17*.35),deep=ss(.015,.5,dep);
      r=mix(.26,.075,deep)+long*.018;g=mix(.46,.38,deep)+long*.034;b=mix(.34,.41,deep)+long*.028;
      const reflect=ss(.18,.78,Math.sin(wx*.38+long*.45)*Math.sin(wz*.19))*.21*deep;
      r=mix(r,.19,reflect);g=mix(g,.43,reflect);b=mix(b,.33,reflect);
      const dist=Math.hypot(cam.x-wx,cam.y-wy,cam.z-wz),fresnel=(1-Math.max(0,(cam.y-wy)/dist))**3*.55;
      r=mix(r,.51,fresnel);g=mix(g,.73,fresnel);b=mix(b,.69,fresnel);
      const streak=ss(.94,1,flow)*ss(.5,.94,ripple)*ss(.04,.2,dep);
      r+=streak*.2;g+=streak*.29;b+=streak*.25;
      const lace=.45+.35*Math.sin(wz*2.1+Math.sin(wx*3)+17*.65),foam=(1-ss(.008,.055,dep))*lace*.72;
      r=mix(r,.72,foam);g=mix(g,.8,foam);b=mix(b,.65,foam);
      const caustic=ss(.84,.97,ripple*(.5+.5*long))*(1-deep);
      r+=caustic*.035;g+=caustic*.048;b+=caustic*.014;
    }else if(kind==='grass'){
      const tip=ss(0,1,v(14));
      r=v(9)*mix(.52,1.2,tip);g=v(10)*mix(.67,1.14,tip);b=v(11)*mix(.43,.78,tip);
    }else if(kind==='smoke'){
      alpha=(1-ss(.1,.5,Math.hypot(v(12)-.5,v(13)-.5)))*Math.sin(v(14)*Math.PI)*.145;
      if(alpha<.002)continue;
      r=.83;g=.86;b=.77;
    }else{
      let nx=v(6),ny=v(7),nz=v(8);
      const len=Math.hypot(nx,ny,nz)||1,sgn=front?1:-1;
      nx=nx/len*sgn;ny=ny/len*sgn;nz=nz/len*sgn;
      const d=nx*sunv[0]+ny*sunv[1]+nz*sunv[2];
      const bands=.6+.25*ss(-.2,.05,d)+.21*ss(.42,.65,d);
      const shade=ss(-.28,.6,d),brush=Math.sin(wx*2.5+Math.sin(wz*2.7))*Math.sin(wy*4.6+wz)*.025;
      const color=u.uColor?.value||{r:1,g:1,b:1},leaf=u.uLeaf?.value||0,cloud=u.uCloud?.value||0;
      r=color.r*v(9)*bands*mix(.68,1.08,shade)*(1+brush);
      g=color.g*v(10)*bands*mix(.83,1.055,shade)*(1+brush);
      b=color.b*v(11)*bands*mix(.79,.89,shade)*(1+brush);
      const foliage=Math.sin(wx*6.3+Math.sin(wz*7.1))*Math.sin(wy*8.5+Math.sin(wx*4.9))*Math.sin(wz*5.7+Math.sin(wy*4.3));
      const folshade=1+leaf*(ss(-.15,.5,foliage)-.45)*.21,folbright=leaf*ss(.35,.72,foliage)*ss(.02,.7,d);
      r=r*folshade+.018*folbright;g=g*folshade+.018*folbright;b=b*folshade+.002*folbright;
      const sub=Math.max(0,-d)**2*leaf;r+=.045*sub;g+=.055*sub;b+=.008*sub;
      if(cloud){
        const t=ss(-.6,.6,d);
        r=color.r*v(9)*mix(.72,1.06,t);g=color.g*v(10)*mix(.82,1.02,t);b=color.b*v(11)*mix(.87,.91,t);
      }
    }
    if(u.uFogColor){
      const fog=ss(u.uFogNear.value,u.uFogFar.value,Math.hypot(wx-cam.x,wy-cam.y,wz-cam.z))*.94;
      const f=u.uFogColor.value;r=mix(r,f.r,fog);g=mix(g,f.g,fog);b=mix(b,f.b,fog);
    }
    const k=idx*3;
    if(alpha<1){
      colorBuffer[k]=mix(colorBuffer[k],r,alpha);colorBuffer[k+1]=mix(colorBuffer[k+1],g,alpha);colorBuffer[k+2]=mix(colorBuffer[k+2],b,alpha);
    }else{colorBuffer[k]=r;colorBuffer[k+1]=g;colorBuffer[k+2]=b;}
    if(mesh.material.depthWrite)depth[idx]=zz;
  }
}
// Clip triangles at the camera near plane before rasterizing. This matters
// indoors, where a wall, floor or ceiling can straddle the camera position.
function drawTriangle(a,b,c,buf,mesh,kind,u,flip){
  const near=camera.near;
  const ids=[a,b,c],ws=ids.map(i=>1/buf[i*V+2]);
  if(ws.every(w=>w>=near)){raster(a,b,c,buf,mesh,kind,u,flip);return;}
  if(ws.every(w=>w<near))return;
  const raw=ids.map((id,j)=>{
    const k=id*V,w=ws[j],v=new Float64Array(V);
    v[0]=(buf[k]/W*2-1)*w;v[1]=(1-buf[k+1]/H*2)*w;v[2]=w;
    for(let n=3;n<V;n++)v[n]=buf[k+n]*w;
    return v;
  });
  const polygon=[];
  for(let j=0;j<3;j++){
    const p=raw[j],q=raw[(j+1)%3],inside=p[2]>=near,next=q[2]>=near;
    if(inside)polygon.push(p);
    if(inside!==next){
      const t=(near-p[2])/(q[2]-p[2]),v=new Float64Array(V);
      for(let n=0;n<V;n++)v[n]=p[n]+(q[n]-p[n])*t;
      v[2]=near;polygon.push(v);
    }
  }
  const clipped=new Float64Array(polygon.length*V);
  for(let j=0;j<polygon.length;j++){
    const p=polygon[j],iz=1/p[2],k=j*V;
    clipped[k]=(p[0]*iz*.5+.5)*W;clipped[k+1]=(.5-p[1]*iz*.5)*H;clipped[k+2]=iz;
    for(let n=3;n<V;n++)clipped[k+n]=p[n]*iz;
  }
  for(let j=1;j<polygon.length-1;j++)raster(0,j,j+1,clipped,mesh,kind,u,flip);
}
for(const mesh of objects){
  const g=mesh.geometry,u=mesh.material.uniforms,attr=g.attributes,pos=attr.position;
  const kind=u.uGlass?'glass':u.uOrigin?'smoke':attr.offset?'grass':attr.waterDepth?'water':'paint';
  const count=mesh.isInstancedMesh?mesh.count:g.isInstancedBufferGeometry?g.instanceCount:1;
  const buf=new Float64Array(pos.count*V),indices=g.index?.array;
  for(let inst=0;inst<count;inst++){
    if(mesh.isInstancedMesh){mesh.getMatrixAt(inst,mat);worldMat.copy(mesh.matrixWorld).multiply(mat);}else worldMat.copy(mesh.matrixWorld);
    const nmat=new THREE.Matrix3().getNormalMatrix(worldMat),icol=mesh.instanceColor;
    const ic=[icol?icol.getX(inst):1,icol?icol.getY(inst):1,icol?icol.getZ(inst):1];
    const flip=worldMat.determinant()<0;
    for(let i=0;i<pos.count;i++){
      let px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i),tip=attr.waterDepth?.getX(i)||0;
      let cr=1,cg=1,cb=1;
      if(attr.color){cr=attr.color.getX(i);cg=attr.color.getY(i);cb=attr.color.getZ(i);}
      cr*=ic[0];cg*=ic[1];cb*=ic[2];
      if(kind==='grass'){
        const off=attr.offset,blade=attr.blade,tint=attr.tint;
        const x=off.getX(inst),y=off.getY(inst),z=off.getZ(inst),a=blade.getX(inst),h=blade.getY(inst);
        const fade=1-ss(40,60,Math.hypot(x-cam.x,z-cam.z));
        tip=py;px*=blade.getZ(inst);py*=h*fade;pz+=tip*tip*blade.getW(inst);
        const c=Math.cos(a),s=Math.sin(a),xx=px*c+pz*s,zz=-px*s+pz*c;
        const gust=Math.sin(x*.22+z*.17-17*1.6),flutter=Math.sin(x*1.4+z*.72+17*2.9);
        px=xx+tip*tip*(.16+gust*.19+flutter*.055)*h*fade+x;
        py+=y;pz=zz+tip*tip*(.09*gust+.05*flutter)*h*fade+z;
        cr=tint.getX(inst);cg=tint.getY(inst);cb=tint.getZ(inst);
        tmp.set(px,py,pz);normal.set(0,1,0);
      }else if(kind==='smoke'){
        const t=fract(attr.phase.getX(inst)+17*.048),o=u.uOrigin.value,size=.28+t*1.6,m=camera.matrixWorld.elements;
        tmp.set(o.x+t*3.8+Math.sin(t*8+1.7)*t*.4,o.y+t*7.4,o.z+t*.8);
        tmp.x+=(m[0]*px+m[4]*py)*size;tmp.y+=(m[1]*px+m[5]*py)*size;tmp.z+=(m[2]*px+m[6]*py)*size;
        tip=t;normal.set(0,1,0);
      }else{
        tmp.set(px,py,pz).applyMatrix4(worldMat);
        if(attr.normal)normal.fromBufferAttribute(attr.normal,i).applyMatrix3(nmat).normalize();else normal.set(0,1,0);
        if(u.uWind?.value){
          const wind=u.uWind.value*(u.uRooted?.value?clamp(py*py):1),gust=Math.sin(tmp.x*.16+tmp.z*.12-17*1.3);
          tmp.x+=wind*(.55*gust+.23*Math.sin(tmp.z*.44+17*2.1));tmp.z+=wind*.26*gust;
        }
      }
      pvec.set(tmp.x,tmp.y,tmp.z,1).applyMatrix4(projection);
      const iz=1/pvec.w,k=i*V;
      buf[k]=(pvec.x*iz*.5+.5)*W;buf[k+1]=(.5-pvec.y*iz*.5)*H;buf[k+2]=iz;
      const values=[tmp.x,tmp.y,tmp.z,normal.x,normal.y,normal.z,cr,cg,cb,attr.uv?attr.uv.getX(i):0,attr.uv?attr.uv.getY(i):0,tip];
      for(let n=0;n<values.length;n++)buf[k+3+n]=values[n]*iz;
    }
    if(indices){for(let j=0;j<indices.length;j+=3)drawTriangle(indices[j],indices[j+1],indices[j+2],buf,mesh,kind,u,flip);}
    else{for(let j=0;j<pos.count;j+=3)drawTriangle(j,j+1,j+2,buf,mesh,kind,u,flip);}
  }
  draws++;
}
for(let i=0;i<pixels.length;i++){
  const c=clamp(colorBuffer[i]);
  pixels[i]=Math.round(255*(c<=.0031308?c*12.92:1.055*c**(1/2.4)-.055));
}
const directory=new URL('../renders/',import.meta.url);
fs.mkdirSync(directory,{recursive:true});
const path=new URL(view+'.ppm',directory);
fs.writeFileSync(path,Buffer.concat([Buffer.from('P6\n'+W+' '+H+'\n255\n'),pixels]));
console.log(JSON.stringify({view,draws,triangles,grass:world.grass.count,flowers:world.flowerCount,path:path.pathname}));
