import {engineClass,engineMultiplier,isBraking} from './engine-classes.mjs';
import {steeringRate,resolveVehicles,resolveObstacle} from './vehicle-physics.mjs';
import {referenceCarpetLayout} from './carpet-layout.mjs';
import {CarpetNavigation} from './carpet-rivals.mjs';
import {BOOST_AI,useBoost,makeBoostPickups,makeBoostPads,boostStart,collectBoosts,collectBoostPads,assignCatchup} from './boost-system.mjs';
// Free-roaming collection mode: no lap counters or ordered checkpoints.
export const CARPET_COURSE={name:'Carpet City Collect',tag:'THE PLAYROOM SCAVENGER RACE',desc:'Three rivals. Twelve different blocks each.<br>Be first to collect the full set, in any order.',tags:['12 UNIQUE BLOCKS','3 RIVALS','MOVING TRAFFIC'],type:'car',mode:'collect',revision:3,mapScale:3,mapSize:[207,299],bounds:[100,146],width:10.6,color:0x82b59b,road:0x526271};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
export function makeCarpetTrack(course=CARPET_COURSE){
 return referenceCarpetLayout(course);
}
export function nearestCarpetRoad(track,x,z){
 let best={d:Infinity};
 for(const [a,b] of track.edges){const p=track.nodes[a],q=track.nodes[b],dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz),t=clamp(((x-p.x)*dx+(z-p.z)*dz)/(len*len),0,1),px=p.x+dx*t,pz=p.z+dz*t,d=Math.hypot(x-px,z-pz);if(d<best.d)best={d,x:px,z:pz,heading:Math.atan2(dx,dz)}}
 return best;
}
export const TRAFFIC_LEVELS={easy:{count:8,speed:7},medium:{count:12,speed:9},hard:{count:16,speed:11}};
const vehicle=(id,color,x,z,heading=0)=>({vehicleType:id>3?'traffic':'car',id,color,name:id?'Traffic '+id:'YOU',x,y:.13,z,heading,vx:0,vz:0,vy:0,speed:0,braking:false,index:0,progress:0,boost:1,airborne:false,boosting:false,drifting:false,finish:null,flash:0,respawns:0,hazard:''});
export class CarpetRun{
 constructor(track,difficulty='medium',seed=(Math.random()*4294967296)>>>0,engine='commercial'){
  this.engineClass=engineClass(engine);
  this.track=track;this.difficulty=TRAFFIC_LEVELS[difficulty]?difficulty:'medium';this.seed=seed;this.random=()=>{this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296};this.time=0;this.countdown=3.4;this.paused=false;this.obstacles=[];this.finished=[];this.collected=new Set();this.lastPickup=null;this.distance=0;this.collisions=0;this.collisionCooldown=0;
  this.cars=[vehicle(0,'#ef5b3f',track.start.x,track.start.z,track.start.heading)];
  this.cars[0].collected=this.collected;this.cars[0].racer=true;this.winner=null;this.boostPickups=makeBoostPickups(track);this.boostPads=makeBoostPads(track);
  // Maximise separation on clear roads, keeping all four starts far apart.
  for(let i=1;i<=3;i++){const p=track.nodes.reduce((best,n)=>{const separation=Math.min(...this.cars.map(c=>Math.hypot(n.x-c.x,n.z-c.z)));return separation>best.separation?{...n,separation}:best},{separation:-1});const c=vehicle(i,['#4c79f1','#ad53cd','#e8b127'][i-1],p.x,p.z,p.heading);Object.assign(c,{racer:true,name:['NOVA','PIP','BOLT'][i-1],collected:new Set(),route:null,blockedTime:0,cruise:{easy:11,medium:14,hard:17}[this.difficulty]});this.cars.push(c)}
  this.racers=this.cars.slice();
  const level=TRAFFIC_LEVELS[this.difficulty],colors=['#f6c64b','#6e87e7','#88bf73','#cf89ae','#e7e7d4','#66b9c9'];
  for(let i=1;i<=level.count;i++){
   const from=Math.floor(this.random()*track.n),to=this.choose(from,null),next=this.choose(to,from),c=vehicle(i+3,colors[(i-1)%colors.length],0,0);c.from=from;c.to=to;c.next=next;c.cruise=level.speed*(.82+this.random()*.3);this.makeLeg(c);
   // Leave a clear start zone, and avoid stacking traffic at its initial positions.
   let bestPoint=c.path[0],bestDistance=-1;
   for(let attempt=0;attempt<30;attempt++){const fraction=.1+this.random()*.75,p0=c.path[0],p1=c.path[1],x=p0.x+(p1.x-p0.x)*fraction,z=p0.z+(p1.z-p0.z)*fraction,d=Math.min(...this.cars.map(o=>Math.hypot(x-o.x,z-o.z)));if(d>bestDistance){bestPoint={x,z};bestDistance=d}if(d>9)break}
   c.x=bestPoint.x;c.z=bestPoint.z;c.waypoint=1;c.heading=Math.atan2(c.path[1].x-c.x,c.path[1].z-c.z);this.cars.push(c);
  }
  for(const c of this.cars){c.engineScale=engineMultiplier(this.engineClass);if(c.cruise)c.cruise*=c.engineScale;}
 }
 choose(at,previous){const node=this.track.nodes[at];const options=node.neighbors.filter(i=>i!==previous&&(!node.roundabout||!this.track.nodes[i].roundabout||i===node.ringNext));return options[Math.floor(this.random()*options.length)]??node.ringNext??previous}
 makeLeg(c){
  const a=this.track.nodes[c.from],b=this.track.nodes[c.to],n=this.track.nodes[c.next],l=Math.hypot(b.x-a.x,b.z-a.z),k=Math.hypot(n.x-b.x,n.z-b.z),ux=(b.x-a.x)/l,uz=(b.z-a.z)/l,vx=(n.x-b.x)/k,vz=(n.z-b.z)/k,lane=2.1,r=b.turnRadius||5,rs=a.turnRadius||5;
  const start={x:a.x+ux*rs-uz*lane,z:a.z+uz*rs+ux*lane},entry={x:b.x-ux*r-uz*lane,z:b.z-uz*r+ux*lane},exit={x:b.x+vx*r-vz*lane,z:b.z+vz*r+vx*lane};
  const straight=ux===vx&&uz===vz,control=straight?{x:(entry.x+exit.x)/2,z:(entry.z+exit.z)/2}:{x:b.x-uz*lane-vz*lane,z:b.z+ux*lane+vx*lane};
  c.path=[start,entry];for(let i=1;i<=10;i++){const t=i/10;c.path.push({x:(1-t)**2*entry.x+2*(1-t)*t*control.x+t*t*exit.x,z:(1-t)**2*entry.z+2*(1-t)*t*control.z+t*t*exit.z})}c.waypoint=1;
 }
 recover(c){const p=nearestCarpetRoad(this.track,c.x,c.z);let heading=p.heading;if(Math.abs(angle(c.heading-heading))>Math.PI/2)heading+=Math.PI;let x=p.x,z=p.z;for(const offset of[0,4,-4,8,-8]){const q=nearestCarpetRoad(this.track,p.x+Math.sin(heading)*offset,p.z+Math.cos(heading)*offset);if(this.cars.slice(1).every(o=>Math.hypot(q.x-o.x,q.z-o.z)>3)){x=q.x;z=q.z;break}}Object.assign(c,{x,z,y:.13,heading,vx:0,vz:0,speed:0,braking:false,flash:1.8});c.respawns++}
 step(dt,input={}){
  if(this.paused||this.winner!==null)return;dt=Math.min(.04,dt);if(this.countdown>0){this.countdown-=dt;return}this.time+=dt;this.collisionCooldown=Math.max(0,this.collisionCooldown-dt);const boostStarts=boostStart(this.racers);assignCatchup(this.racers,this.ranking());
  const c=this.cars[0],road=nearestCarpetRoad(this.track,c.x,c.z),onRoad=road.d<this.track.course.width/2,throttle=(input.forward?1:0)-(input.reverse?1:0),steer=(input.left?1:0)-(input.right?1:0),brake=!!input.brake;
  c.speed=c.vx*Math.sin(c.heading)+c.vz*Math.cos(c.heading);c.flash=Math.max(0,c.flash-dt);c.braking=isBraking(throttle,brake,c.speed);c.drifting=brake&&Math.abs(c.speed)>5;useBoost(c,input.boost&&throttle>0&&c.speed>2,dt);
  c.heading+=steer*steeringRate(Math.hypot(c.vx,c.vz),brake,'car',c.engineScale)*Math.sign(c.speed||1)*dt;
  const fx=Math.sin(c.heading),fz=Math.cos(c.heading),lateral=c.vx*fz-c.vz*fx,grip=brake?1.7:8.2;c.vx-=fz*lateral*Math.min(1,grip*dt);c.vz+=fx*lateral*Math.min(1,grip*dt);
  const accel=(throttle*(throttle<0&&c.speed>0?24:14)*c.catchup+(c.boosting?20*c.catchup:0))*c.engineScale;c.vx+=fx*accel*dt;c.vz+=fz*accel*dt;
  const damping=Math.exp(-((onRoad?.64:1.45)+(brake?.9:0))*dt);c.vx*=damping;c.vz*=damping;const speed=Math.hypot(c.vx,c.vz),max=(c.boosting?29:20)*c.catchup*c.engineScale;if(speed>max){c.vx*=max/speed;c.vz*=max/speed}if(c.speed<-7*c.engineScale){c.vx*=.94;c.vz*=.94}
  const oldX=c.x,oldZ=c.z;c.x+=c.vx*dt;c.z+=c.vz*dt;
  const [bx,bz]=this.track.course.bounds;if(Math.abs(c.x)>bx){c.x=clamp(c.x,-bx,bx);c.vx*=-.25}if(Math.abs(c.z)>bz){c.z=clamp(c.z,-bz,bz);c.vz*=-.25}
  for(const o of this.obstacles)resolveObstacle(c,o);
  c.hazard=onRoad?'':'CARPET · SOFT SURFACE';this.distance+=Math.hypot(c.x-oldX,c.z-oldZ);
  for(const car of this.cars.slice(1)){if(car.racer){const x=car.x,z=car.z;this.moveRival(car,dt);this.collect(car,x,z,dt)}else this.moveTraffic(car,dt)}
  for(let i=0;i<this.cars.length;i++)for(let j=i+1;j<this.cars.length;j++){const a=this.cars[i],b=this.cars[j];if(a.finish!==null||b.finish!==null)continue;if(resolveVehicles(a,b)&&i===0){if(this.collisionCooldown===0){this.collisions++;this.collisionCooldown=1}c.hazard='TRAFFIC BUMP'}}
  this.collect(c,oldX,oldZ,dt);
  collectBoosts(this,this.racers,boostStarts,dt);collectBoostPads(this,this.racers,boostStarts,dt);
  this.finished=this.racers.filter(c=>c.finish!==null).sort((a,b)=>a.finish-b.finish||a.id-b.id).map(c=>c.id);if(this.finished.length)this.winner=this.finished[0];
 }
 collect(c,oldX,oldZ,dt){
  if(c.finish!==null)return;const dx=c.x-oldX,dz=c.z-oldZ,l2=dx*dx+dz*dz,hits=[];
  for(const p of this.track.pickups){if(c.collected.has(p.id))continue;const ox=oldX-p.x,oz=oldZ-p.z,t=l2?clamp(-(ox*dx+oz*dz)/l2,0,1):0;if(Math.hypot(ox+dx*t,oz+dz*t)>=2.4)continue;const dot=ox*dx+oz*dz,disc=dot*dot-l2*(ox*ox+oz*oz-2.4**2),entry=ox*ox+oz*oz<=2.4**2?0:l2?clamp((-dot-Math.sqrt(Math.max(0,disc)))/l2,0,1):0;hits.push({p,entry})}
  hits.sort((a,b)=>a.entry-b.entry);for(const {p,entry}of hits){c.collected.add(p.id);if(c.id===0)this.lastPickup={name:p.name,at:this.time};if(c.collected.size===this.track.pickups.length)c.finish=this.time-dt+entry*dt}
 }
 moveRival(c,dt){
  if(c.finish!==null){c.speed=0;c.vx=0;c.vz=0;c.boosting=false;c.braking=false;return}
  this.navigation??=new CarpetNavigation(this.track,this.obstacles,nearestCarpetRoad);const nav=this.navigation;
  const skill=BOOST_AI[this.difficulty];let boostGoal=c.route?.targetType==='boost'?this.boostPickups[c.route.target]:null;
  if(boostGoal&&(boostGoal.readyAt>this.time||c.boost>=skill.need)){boostGoal=null;c.route=null}
  if(!boostGoal&&c.boost<skill.need&&c.collected.size>(c.lastRefillProgress??-1)&&this.time>=(c.boostPlanAt||0)){c.boostPlanAt=this.time+.65;const remaining=this.track.pickups.filter(p=>!c.collected.has(p.id)),blockDistance=Math.min(...remaining.map(p=>Math.hypot(p.x-c.x,p.z-c.z)));boostGoal=this.boostPickups.filter(p=>p.readyAt<=this.time&&Math.hypot(p.x-c.x,p.z-c.z)+Math.min(...remaining.map(b=>Math.hypot(b.x-p.x,b.z-p.z)))<=blockDistance+skill.extra&&Math.hypot(p.x-c.x,p.z-c.z)<Math.min(skill.reach,blockDistance*skill.detour+8)).sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z))[0];if(boostGoal)c.route=null}
  if(!c.route||(c.route.targetType!=='boost'&&c.collected.has(c.route.target))){c.route=nav.route(c,[],boostGoal);c.waypoint=0}if(!c.route){c.speed=0;return}
  const path=c.route.path;while(c.waypoint<path.length-1&&Math.hypot(c.x-path[c.waypoint].x,c.z-path[c.waypoint].z)<.25)c.waypoint++;
  // Round off grid corners only when the whole shortcut clears the scenery.
  for(let i=Math.min(path.length-1,c.waypoint+3);i>c.waypoint;i--)if(nav.clear(c,path[i],c.route.avoid)){c.waypoint=i;break}
  const p=path[c.waypoint],dx=p.x-c.x,dz=p.z-c.z,d=Math.hypot(dx,dz);if(d<.001){c.route=null;return}const fx=dx/d,fz=dz/d,road=nearestCarpetRoad(this.track,c.x,c.z).d<this.track.course.width/2;
  const next=path[Math.min(c.waypoint+3,path.length-1)],straight=Math.abs(angle(Math.atan2(next.x-c.x,next.z-c.z)-c.heading))<.3;
  useBoost(c,road&&straight&&c.speed>8,dt);
  let desired=(c.cruise+(c.boosting?7*c.engineScale:0))*(road?1:.55);const nearby=this.cars.filter(o=>o!==c&&o.finish===null&&Math.hypot(o.x-c.x,o.z-c.z)<8);
  for(const o of nearby){const x=o.x-c.x,z=o.z-c.z,ahead=x*fx+z*fz;if(ahead>0&&ahead<5&&Math.abs(x*fz-z*fx)<1.8)desired=Math.min(desired,Math.max(0,(ahead-2.3)*2))}
  c.blockedTime=desired<2?c.blockedTime+dt:0;if(c.blockedTime>1.2){const detour=nav.route(c,nearby,boostGoal);if(detour){c.route=detour;c.waypoint=0;c.blockedTime=0;return}c.blockedTime=0}
  const error=angle(Math.atan2(fx,fz)-c.heading);desired*=c.catchup;desired=Math.min(desired,Math.max(3,34*c.engineScale/(1+Math.abs(error)*5)),Math.max(3,d*3));c.braking=desired<c.speed-.3;c.speed+=(desired-c.speed)*Math.min(1,dt*3);const turn=steeringRate(c.speed,false,'car',c.engineScale)*dt;c.heading+=clamp(error,-turn,turn);const travel=Math.min(d,c.speed*dt),oldX=c.x,oldZ=c.z;c.x+=Math.sin(c.heading)*travel;c.z+=Math.cos(c.heading)*travel;for(const o of this.obstacles)resolveObstacle(c,o);c.vx=(c.x-oldX)/dt;c.vz=(c.z-oldZ)/dt;
  if(Math.hypot(c.x-p.x,c.z-p.z)<.35)c.waypoint=Math.min(path.length-1,c.waypoint+1);
 }
 moveTraffic(c,dt){
  let desired=c.cruise,fx=Math.sin(c.heading),fz=Math.cos(c.heading);
  for(const o of this.cars){if(o===c)continue;const dx=o.x-c.x,dz=o.z-c.z,ahead=dx*fx+dz*fz,side=Math.abs(dx*fz-dz*fx);if(ahead>0&&ahead<7&&side<1.65)desired=Math.min(desired,Math.max(0,(ahead-2.6)*2));}
  const junction=this.track.nodes[c.to],near=Math.hypot(c.x-junction.x,c.z-junction.z);
  if(near<12&&near>5&&this.cars.some(o=>o.id!==c.id&&Math.hypot(o.x-junction.x,o.z-junction.z)<6&&(o.id<c.id||Math.hypot(o.x-junction.x,o.z-junction.z)<3)))desired=0;
  c.braking=desired<c.speed-.3||desired===0;c.speed+=(desired-c.speed)*Math.min(1,dt*4);let remaining=c.speed*dt,previousX=c.x,previousZ=c.z;
  for(let safety=0;remaining>0&&safety<20;safety++){
   const p=c.path[c.waypoint],dx=p.x-c.x,dz=p.z-c.z,d=Math.hypot(dx,dz);
   if(d>.0001){const travel=Math.min(d,remaining);c.x+=dx/d*travel;c.z+=dz/d*travel;c.heading=Math.atan2(dx,dz);remaining-=travel}
   if(d<=remaining+.0001||Math.hypot(c.x-p.x,c.z-p.z)<.001){c.waypoint++;if(c.waypoint===c.path.length){c.from=c.to;c.to=c.next;c.next=this.choose(c.to,c.from);this.makeLeg(c)}}else break;
  }
  c.vx=(c.x-previousX)/dt;c.vz=(c.z-previousZ)/dt;
 }
 ranking(){return [...this.racers].sort((a,b)=>(a.finish??Infinity)-(b.finish??Infinity)||b.collected.size-a.collected.size||a.id-b.id)}
 nearestPickup(){const c=this.cars[0];return this.track.pickups.filter(p=>!this.collected.has(p.id)).sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z))[0]}
}
