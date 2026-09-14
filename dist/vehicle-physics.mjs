const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Bumper, wheel and hull extents in the model's local X/Z axes.
export const VEHICLE_BOUNDS={car:{halfWidth:1,halfLength:1.53,height:1.4},buggy:{halfWidth:1,halfLength:1.53,height:1.9},boat:{halfWidth:.96,halfLength:2,height:1.2},traffic:{halfWidth:1,halfLength:1.5,height:1.5}};
export function steeringRate(speed,brake=false,type='car',engineScale=1){
 // Match Commercial's response at the same proportion of class top speed.
 // Boost still moves further up this curve and reduces steering authority.
 const v=Math.abs(speed)/engineScale,falloff=1/(1+(Math.max(0,v-8)/16)**2);
 return (brake?2.5:1.85)*(type==='boat'?.88:1)*clamp(v/5,0,1)*falloff;
}
function box(c){const b=VEHICLE_BOUNDS[c.vehicleType]||VEHICLE_BOUNDS.car,s=Math.sin(c.heading),t=Math.cos(c.heading);return {...b,x:c.x,z:c.z,halfWidth:b.halfWidth*(c.hitboxScaleX||1),halfLength:b.halfLength*(c.hitboxScaleZ||1),axes:[{x:t,z:-s},{x:s,z:t}]}}
function radius(b,n){return b.halfWidth*Math.abs(b.axes[0].x*n.x+b.axes[0].z*n.z)+b.halfLength*Math.abs(b.axes[1].x*n.x+b.axes[1].z*n.z)}
function overlap(a,b){let contact=null;const dx=a.x-b.x,dz=a.z-b.z;for(const n of [...a.axes,...b.axes]){const distance=dx*n.x+dz*n.z,depth=radius(a,n)+radius(b,n)-Math.abs(distance);if(depth<0)return null;if(!contact||depth<contact.depth){const sign=distance<0?-1:1;contact={nx:n.x*sign,nz:n.z*sign,depth}}}return contact}
export function vehicleContact(a,b){const aa=box(a),bb=box(b);if(a.y> b.y+bb.height||b.y>a.y+aa.height)return null;return overlap(aa,bb)}
function push(c,hit,fraction=1){c.x+=hit.nx*(hit.depth+.001)*fraction;c.z+=hit.nz*(hit.depth+.001)*fraction}
export function resolveVehicles(a,b){const hit=vehicleContact(a,b);if(!hit)return false;push(a,hit,.5);push(b,hit,-.5);const rel=(a.vx-b.vx)*hit.nx+(a.vz-b.vz)*hit.nz;if(rel<0){const impulse=-rel*.65;a.vx+=hit.nx*impulse;a.vz+=hit.nz*impulse;b.vx-=hit.nx*impulse;b.vz-=hit.nz*impulse}for(const c of[a,b])c.speed=c.vx*Math.sin(c.heading)+c.vz*Math.cos(c.heading);return true}
export function resolveObstacle(c,o){
 if(Math.abs(c.y-(o.y||0))>2)return false;
 const b=box(c),dx=c.x-o.x,dz=c.z-o.z,local=b.axes.map(n=>dx*n.x+dz*n.z),closest=[clamp(local[0],-b.halfWidth,b.halfWidth),clamp(local[1],-b.halfLength,b.halfLength)],delta=local.map((v,i)=>v-closest[i]),d=Math.hypot(...delta);if(d>o.r)return false;
 let nx,nz,depth;if(d>1e-8){nx=(delta[0]*b.axes[0].x+delta[1]*b.axes[1].x)/d;nz=(delta[0]*b.axes[0].z+delta[1]*b.axes[1].z)/d;depth=o.r-d}else{const margins=[b.halfWidth-Math.abs(local[0]),b.halfLength-Math.abs(local[1])],i=margins[0]<margins[1]?0:1,sign=local[i]<0?-1:1;nx=b.axes[i].x*sign;nz=b.axes[i].z*sign;depth=o.r+margins[i]}
 const hit={nx,nz,depth};push(c,hit);const impact=c.vx*nx+c.vz*nz;if(impact<0){c.vx-=nx*impact*1.2;c.vz-=nz*impact*1.2}return true;
}
export function resolveWall(c,w){
 const dx=w.bx-w.ax,dz=w.bz-w.az,len=Math.hypot(dx,dz);if(!len)return false;
 const along=((c.x-w.ax)*dx+(c.z-w.az)*dz)/(len*len),t=clamp(along,0,1),floor=w.ay+(w.by-w.ay)*t,b=box(c);
 if(c.y>floor+w.height||c.y+b.height<floor)return false;
 let hit=overlap(b,{x:(w.ax+w.bx)/2,z:(w.az+w.bz)/2,halfWidth:w.width/2,halfLength:len/2,axes:[{x:dz/len,z:-dx/len},{x:dx/len,z:dz/len}]});if(!hit)return false;
 if(w.normalA&&w.normalB&&(along>=0||w.joinedA)&&(along<=1||w.joinedB)){
  // Connected spans have no collidable end caps. Use the continuous side
  // normal so rubbing over a join cannot turn into a head-on impact.
  let nx=w.normalA.x*(1-t)+w.normalB.x*t,nz=w.normalA.z*(1-t)+w.normalB.z*t,n=Math.hypot(nx,nz);nx/=n;nz/=n;
  const distance=(c.x-w.ax-dx*t)*nx+(c.z-w.az-dz*t)*nz,sign=distance<0?-1:1;
  hit={nx:nx*sign,nz:nz*sign,depth:radius(b,{x:nx,z:nz})+w.width/2-Math.abs(distance)};
  if(hit.depth<=0)return false;
 }
 push(c,hit);const impact=c.vx*hit.nx+c.vz*hit.nz,speed=Math.hypot(c.vx,c.vz);if(impact<0){c.vx-=hit.nx*impact;c.vz-=hit.nz*impact;
  // Absorb the impact without reflecting the car. One loss per impact,
  // rather than charging a penalty for each connected panel at a corner.
  if(w.barrierMode==='race'&&impact<-.4&&!(c.wallPenaltyCooldown>0)){
   const retain=.72-.4*Math.min(1,-impact/Math.max(1,speed));c.vx*=retain;c.vz*=retain;c.wallPenaltyCooldown=.2;
  }
 }
 c.speed=c.vx*Math.sin(c.heading)+c.vz*Math.cos(c.heading);return true;
}
