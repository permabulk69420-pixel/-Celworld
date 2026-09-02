import { clamp } from './math.js';
import { groundHeight, WORLD_RADIUS } from './land.js';

export const WALK_SPEED = 2.25;
export const RUN_SPEED = 4.8;
export const TURN_SPEED = Math.PI / 2.4;
const RADIUS = .24;
export function stick(x=0,y=0) {
  const magnitude=Math.hypot(x,y);
  if(magnitude<.16)return [0,0];
  const scale=Math.min(1,(magnitude-.16)/.84)/magnitude;
  return [x*scale,y*scale];
}
export function readXRInput(sources) {
  const input={strafe:0,forward:0,turn:0,run:false,jump:false};
  for(const source of sources){
    const pad=source.gamepad;
    if(!pad)continue;
    const axis=pad.axes.length>=4?2:0;
    const [x,y]=stick(pad.axes[axis]||0,pad.axes[axis+1]||0);
    if(source.handedness==='left'){
      input.strafe=x;input.forward=y===0?0:-y;
      input.run=!!(pad.buttons[1]?.pressed||pad.buttons[3]?.pressed);
    } else if(source.handedness==='right'){
      input.turn=x;
      input.jump=!!pad.buttons[4]?.pressed;
    }
  }
  return input;
}
export function rotateOriginAroundHead(origin, head, angle) {
  const dx=origin.x-head.x,dz=origin.z-head.z,c=Math.cos(angle),s=Math.sin(angle);
  return {x:head.x+c*dx+s*dz,z:head.z-s*dx+c*dz};
}
export function resolveCollision(x,z,colliders) {
  for(let pass=0;pass<3;pass++)for(const obstacle of colliders){
    if(obstacle.type==='circle'){
      let dx=x-obstacle.x,dz=z-obstacle.z;
      const radius=obstacle.radius+RADIUS,d=Math.hypot(dx,dz);
      if(d<radius){
        if(d<.00001){dx=1;dz=0;}
        const length=Math.hypot(dx,dz);
        x=obstacle.x+dx/length*radius;z=obstacle.z+dz/length*radius;
      }
    }else{
      const c=Math.cos(obstacle.angle||0),s=Math.sin(obstacle.angle||0);
      const dx=x-obstacle.x,dz=z-obstacle.z;
      let lx=c*dx-s*dz,lz=s*dx+c*dz;
      const hx=obstacle.halfX+RADIUS,hz=obstacle.halfZ+RADIUS;
      if(Math.abs(lx)<hx&&Math.abs(lz)<hz){
        if(hx-Math.abs(lx)<hz-Math.abs(lz))lx=(lx>=0?1:-1)*hx;
        else lz=(lz>=0?1:-1)*hz;
        x=obstacle.x+c*lx+s*lz;z=obstacle.z-s*lx+c*lz;
      }
    }
  }
  const distance=Math.hypot(x,z);
  if(distance>WORLD_RADIUS){x=x/distance*WORLD_RADIUS;z=z/distance*WORLD_RADIUS;}
  return {x,z};
}
export class Walker {
  constructor(x,z,colliders=[],heightAt=groundHeight){
    this.heightAt=heightAt;this.colliders=colliders;
    this.reset(x,z);
  }
  reset(x,z){this.x=x;this.z=z;this.y=this.heightAt(x,z);this.vx=0;this.vz=0;this.vy=0;this.grounded=true;this.wasJump=false;}
  stop(){this.vx=0;this.vz=0;this.wasJump=false;}
  step(dt,input,forward={x:0,z:-1}){
    dt=clamp(dt,0,.05);
    const fLength=Math.hypot(forward.x,forward.z)||1;
    const fx=forward.x/fLength,fz=forward.z/fLength;
    const magnitude=Math.max(1,Math.hypot(input.strafe,input.forward));
    const speed=input.run?RUN_SPEED:WALK_SPEED;
    const tx=(-fz*input.strafe+fx*input.forward)*speed/magnitude;
    const tz=(fx*input.strafe+fz*input.forward)*speed/magnitude;
    const acceleration=1-Math.exp(-dt*18);
    this.vx+=(tx-this.vx)*acceleration;this.vz+=(tz-this.vz)*acceleration;
    if(input.jump&&!this.wasJump&&this.grounded){this.vy=4.35;this.grounded=false;}
    this.wasJump=input.jump;
    const steps=Math.max(1,Math.ceil(dt/(1/90))),slice=dt/steps;
    for(let i=0;i<steps;i++){
      const next=resolveCollision(this.x+this.vx*slice,this.z+this.vz*slice,this.colliders);
      const floor=this.heightAt(next.x,next.z);
      // Small steps and slopes are walkable; geometry cannot pop the player onto a roof.
      if(!this.grounded||floor-this.y<.34){this.x=next.x;this.z=next.z;}
      const ground=this.heightAt(this.x,this.z);
      if(this.grounded&&ground>=this.y-.065){this.y=ground;this.vy=0;}
      else{
        this.grounded=false;this.vy-=11.5*slice;this.y+=this.vy*slice;
        if(this.y<=ground){this.y=ground;this.vy=0;this.grounded=true;}
      }
    }
    return this;
  }
}
