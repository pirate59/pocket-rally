import * as THREE from './three.module.mjs';
import {nearest,angle,clamp} from './race.mjs';
import {carpetSurface} from './carpet-run.mjs';

export function tyreMarkStrength(c,previous,dt){
 const speed=Math.hypot(c.vx,c.vz),engine=c.engineScale||1;
 if(!previous||dt<=0||speed<2||c.airborne||c.vehicleType==='boat'||c.finish!==null)return 0;
 const acceleration=(speed-previous.speed)/dt;
 const cornerLoad=speed*Math.abs(angle(c.heading-previous.heading))/dt/engine;
 const sideways=Math.abs(c.vx*Math.cos(c.heading)-c.vz*Math.sin(c.heading));
 const corner=speed>5&&cornerLoad>3?clamp((cornerLoad-3)/20,.10,.45):0;
 const braking=c.braking&&acceleration<-3.5*engine?clamp(-acceleration/(32*engine),.25,.72):0;
 const launch=!c.braking&&acceleration>7*engine?clamp(acceleration/(40*engine),.20,.60):0;
 const slide=speed>5&&(c.drifting||sideways>2.5*engine)?.60:0;
 return Math.max(corner,braking,launch,slide);
}

export function tyreRoadHeight(track,c,x,z){
 if(track.course.type==='boat')return null;
 if(track.course.mode==='collect'){const surface=carpetSurface(track,x,z);return surface.paved?surface.y:null;}
 const near=nearest(track,x,z,c.y,c.index);let best=null;
 // Project onto the adjacent road segments, retaining the car's road level at
 // crossings. Heights interpolate continuously along hills and ramp decks.
 for(const i of[(near.i+track.n-1)%track.n,near.i]){
  const a=track.nodes[i],b=track.nodes[(i+1)%track.n];
  if(a.gap||b.gap)continue;
  const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);
  const d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t),y=a.y+(b.y-a.y)*t;
  if(!best||d<best.d)best={d,y};
 }
 return best&&best.d<track.course.width/2-.16&&Math.abs(best.y-c.y)<1.5?best.y+.048:null;
}

export function tyreSurface(track,c,x=c.x,z=c.z){
 if(c.airborne||c.vehicleType==='boat'||track.course.type==='boat')return null;
 if(track.course.mode==='collect'){const surface=carpetSurface(track,x,z);return surface.y===null?null:surface;}
 const road=tyreRoadHeight(track,c,x,z);if(road!==null)return{y:road,soil:track.course.type==='buggy',paved:track.course.type!=='buggy'};
 if(!(track.course.realWorld||track.course.type==='buggy')||track.isWater?.(x,z))return null;
 const y=track.terrainHeight?.(x,z)??0;
 // Never paint ground far below a bridge or a car clearing a jump.
 if(Math.abs(c.y-y)>.65)return null;
 return{y:y+.035,soil:true,paved:false};
}

export class TyreMarks{
 constructor(world,track,capacity=6000){
  this.track=track;this.capacity=capacity;this.cursor=0;this.count=0;this.previous=new Map();
  const geometry=new THREE.BufferGeometry();
  this.position=new THREE.BufferAttribute(new Float32Array(capacity*12),3).setUsage(THREE.DynamicDrawUsage);
  this.born=new THREE.BufferAttribute(new Float32Array(capacity*4),1).setUsage(THREE.DynamicDrawUsage);
  this.soil=new THREE.BufferAttribute(new Float32Array(capacity*4),1).setUsage(THREE.DynamicDrawUsage);
  this.strength=new THREE.BufferAttribute(new Float32Array(capacity*4),1).setUsage(THREE.DynamicDrawUsage);
  const edge=new Float32Array(capacity*4),indices=new Uint16Array(capacity*6);
  for(let i=0;i<capacity;i++){edge.set([-1,1,-1,1],i*4);indices.set([i*4,i*4+2,i*4+1,i*4+1,i*4+2,i*4+3],i*6);}
  geometry.setAttribute('soil',this.soil);geometry.setAttribute('position',this.position);geometry.setAttribute('born',this.born);geometry.setAttribute('strength',this.strength);geometry.setAttribute('edge',new THREE.BufferAttribute(edge,1));geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.setDrawRange(0,0);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
   uniforms:{time:{value:0}},
   vertexShader:`attribute float soil;varying float earth;attribute float born;attribute float strength;attribute float edge;uniform float time;varying float opacity;varying float tyreEdge;
    void main(){earth=soil;opacity=strength*(1.0-smoothstep(65.0,100.0,time-born));tyreEdge=edge;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
   fragmentShader:`varying float earth;varying float opacity;varying float tyreEdge;void main(){float a=opacity*(1.0-smoothstep(.68,1.0,abs(tyreEdge)));if(a<.01)discard;gl_FragColor=vec4(mix(vec3(.025,.030,.028),vec3(.26,.12,.045),earth),a);}`});
  this.mesh=new THREE.Mesh(geometry,material);this.mesh.name='Persistent tyre marks';this.mesh.frustumCulled=false;this.mesh.renderOrder=1;world.add(this.mesh);
 }
 clear(){this.cursor=0;this.count=0;this.previous.clear();this.mesh.geometry.setDrawRange(0,0);this.mesh.material.uniforms.time.value=0;}
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();this.previous.clear();}
 wheel(c,side){
  const sx=c.hitboxScaleX||1,sz=c.hitboxScaleZ||1,s=Math.sin(c.heading),t=Math.cos(c.heading);
  const bike=c.vehicleType==='motorcycle',lateral=bike?0:side*.84*sx,longitudinal=bike?side*.92:-.94*sz;
  const x=c.x+t*lateral+s*longitudinal,z=c.z-s*lateral+t*longitudinal,surface=tyreSurface(this.track,c,x,z);
  return !surface?null:{x,y:surface.y,soil:surface.soil,z,dx:t*.125*sx,dz:-s*.125*sx};
 }
 segment(a,b,strength,time){
  const i=this.cursor;this.position.array.set([a.x-a.dx,a.y,a.z-a.dz,a.x+a.dx,a.y,a.z+a.dz,b.x-b.dx,b.y,b.z-b.dz,b.x+b.dx,b.y,b.z+b.dz],i*12);
  this.soil.array.fill(b.soil?1:0,i*4,i*4+4);this.born.array.fill(time,i*4,i*4+4);this.strength.array.fill(strength,i*4,i*4+4);
  this.cursor=(i+1)%this.capacity;this.count=Math.min(this.capacity,this.count+1);this.dirty=true;
 }
 update(cars,time){
  this.mesh.material.uniforms.time.value=time;this.dirty=false;
  for(const c of cars){
   const prev=this.previous.get(c.id),speed=Math.hypot(c.vx,c.vz),dt=prev?time-prev.time:0;
   if(prev&&dt<=0)continue;
   const now={x:c.x,z:c.z,y:c.y,heading:c.heading,speed,time,respawns:c.respawns,wheels:null};
   this.previous.set(c.id,now);
   if(c.airborne||c.vehicleType==='boat'||c.finish!==null||c.flash>1.6)continue;
   const soft=tyreSurface(this.track,c)?.soil,strength=Math.max(tyreMarkStrength(c,prev,dt),soft&&speed>2?.5:0),distance=prev?Math.hypot(c.x-prev.x,c.z-prev.z):0;
   if(!prev||prev.respawns!==c.respawns||dt>.15||distance>Math.max(3,speed*dt*2)||strength===0){now.wheels=[this.wheel(c,-1),this.wheel(c,1)];continue;}
   // Subdivide fast movement to keep the strips on the road through corners.
   let wheels=prev.wheels;const steps=Math.max(1,Math.ceil(distance/.4));
   for(let step=1;step<=steps;step++){
    const f=step/steps,sample={...c,x:prev.x+(c.x-prev.x)*f,z:prev.z+(c.z-prev.z)*f,y:prev.y+(c.y-prev.y)*f,heading:prev.heading+angle(c.heading-prev.heading)*f};
    const next=[this.wheel(sample,-1),this.wheel(sample,1)];
    for(let side=0;side<2;side++)if(wheels?.[side]&&next[side]&&wheels[side].soil===next[side].soil&&Math.hypot(next[side].x-wheels[side].x,next[side].z-wheels[side].z)>.015)this.segment(wheels[side],next[side],strength,time);
    wheels=next;
   }
   now.wheels=wheels;
  }
  if(this.dirty){this.soil.needsUpdate=true;this.position.needsUpdate=true;this.born.needsUpdate=true;this.strength.needsUpdate=true;this.mesh.geometry.setDrawRange(0,this.count*6);}
 }
}
