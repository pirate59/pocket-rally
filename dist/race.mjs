import {engineClass,engineMultiplier,isBraking} from './engine-classes.mjs';
import {ORAN_PARK,makeOranTerrain} from './oran-park.mjs';
import {ALBERT_PARK,makeAlbertTerrain} from './albert-park.mjs';
import {SANDOWN,makeSandownTerrain} from './sandown.mjs';
import {makeBarriers} from './track-boundaries.mjs';
import {driveRealCar,REAL_GRIP} from './real-driving.mjs';
import {PANORAMA,makePanoramaTerrain} from './real-courses.mjs';
import {steeringRate,resolveVehicles,resolveObstacle,resolveWall} from './vehicle-physics.mjs';
import {CARPET_COURSE} from './carpet-run.mjs';
import {grandCourses} from './grand-courses.mjs';
import {makeCourse,EXAMPLES} from './course-pieces.mjs';
import {BOOST_LOW,BOOST_AI,useBoost,refillLap,makeBoostPickups,makeBoostPads,boostStart,collectBoosts,collectBoostPads,assignCatchup} from './boost-system.mjs';
// An exact rounded outline avoids spline overshoot and pinched barrier joins.
function desktopLoop(){
 const points=[],line=(ax,az,bx,bz)=>{const n=Math.ceil(Math.hypot(bx-ax,bz-az)/.2);for(let i=0;i<n;i++)points.push([ax+(bx-ax)*i/n,0,az+(bz-az)*i/n])},arc=(x,z,start)=>{for(let i=0;i<95;i++){const a=start+i/95*Math.PI/2;points.push([x+12*Math.cos(a),0,z+12*Math.sin(a)])}};
 line(-26,-22,27,-22);arc(27,-10,-Math.PI/2);line(39,-10,39,10);arc(27,10,0);line(27,22,-27,22);arc(-27,10,Math.PI/2);line(-39,10,-39,-10);arc(-27,-10,Math.PI);line(-27,-22,-26,-22);return points;
}
// A compact stadium kept well inland (|x|<=35, |z|<=18) so the shoreline and
// dune bands can sit outside the track with clear, unobstructed margin.
function beachLoop(){
 const points=[],line=(ax,az,bx,bz)=>{const n=Math.ceil(Math.hypot(bx-ax,bz-az)/.2);for(let i=0;i<n;i++)points.push([ax+(bx-ax)*i/n,0,az+(bz-az)*i/n])},arc=(x,z,start)=>{for(let i=0;i<95;i++){const a=start+i/95*Math.PI/2;points.push([x+10*Math.cos(a),0,z+10*Math.sin(a)])}};
 line(-24,-18,25,-18);arc(25,-8,-Math.PI/2);line(35,-8,35,8);arc(25,8,0);line(25,18,-25,18);arc(-25,8,Math.PI/2);line(-35,8,-35,-8);arc(-25,-8,Math.PI);line(-25,-18,-24,-18);return points;
}
export const COURSES = [
 {name:'Desktop Dash',revision:3,tag:'THE DESKTOP SPRINT CIRCUIT',desc:'Sweep around the stationery islands.<br>Two ruler jumps with long, straight landings.',tags:['TWIN RULER JUMPS','SWEEPING BENDS','LONG LANDINGS'],type:'car',color:0xc49360,road:0x303d43,width:6.8,bounds:[44,31],walls:true,barrierOffset:.34,jumpAnchors:[[-12,-22],[12,22]],sampledPath:true,deco:'table',points:desktopLoop()},
 {name:'Bathwater Bay',revision:2,tag:'THE BUBBLE GRAND PRIX',desc:'Follow the soap-bubble channels.<br>Skim the flyover. Clear the soap jumps.',tags:['SOAP JUMPS','WATER FLYOVER','BUBBLE CHICANES'],type:'boat',color:0x258ee5,road:0x238bed,width:6.8,bounds:[44,31],walls:true,gap:[.36,.376],rampStart:.338,extraJumps:[{rampStart:.815,gap:[.838,.854]}],deco:'bath',points:[[-34,0,-18],[-23,0,-25],[-10,0,-20],[0,0,0],[12,0,20],[24,0,25],[38,0,18],[39,0,6],[28,0,3],[27,0,-6],[38,0,-13],[31,0,-25],[17,0,-25],[8,2,-14],[0,5.5,0],[-10,2,15],[-20,0,24],[-34,0,24],[-40,0,12],[-31,0,7],[-20,0,6],[-23,0,-5],[-36,0,-6]]},
 {name:'Backyard Wilds',revision:2,tag:'THE WILD GARDEN RALLY',desc:'Carve through the roots and toys.<br>Two dirt jumps. One timber skybridge.',tags:['ROOT CHICANES','TWIN DIRT JUMPS','TIMBER SKYBRIDGE'],type:'buggy',color:0x688849,road:0x755333,width:6.1,bounds:[44,31],walls:true,gap:[.335,.351],rampStart:.313,extraJumps:[{rampStart:.782,gap:[.804,.820]}],deco:'garden',points:[[-35,0,-18],[-21,0,-25],[-8,0,-24],[-2,1,-14],[6,0,-7],[19,0,-18],[32,0,-24],[39,0,-13],[29,0,-5],[25,0,5],[37,0,11],[34,0,24],[21,0,25],[11,2,14],[0,6,0],[-11,2,-5],[-23,0,2],[-17,0,14],[-24,0,25],[-38,0,23],[-40,0,10],[-33,0,3],[-39,0,-6]]},
 {name:'Sandy Shores',revision:1,tag:'THE COASTAL SPRINT CIRCUIT',desc:'Race the dune bowl, well back from the water.<br>Launch off two sand jumps on the long straights.',tags:['DUNE JUMPS','SWEEPING BENDS','CLEAR SIGHTLINES'],type:'buggy',color:0xe0793f,road:0xdac697,width:6.6,bounds:[44,31],walls:true,barrierOffset:.34,jumpAnchors:[[-8,-18],[8,18]],sampledPath:true,deco:'beach',points:beachLoop()}
];
COURSES.push(...grandCourses(COURSES),CARPET_COURSE,PANORAMA,ORAN_PARK,ALBERT_PARK,SANDOWN);
// Piece-built example courses from the imagined-course building blocks.
COURSES.push(...Object.values(EXAMPLES).map(example=>makeCourse(example.spec,example)));
// Boost pickups replace regenerating boost; keep earlier time records separate.
COURSES.forEach(course=>{course.revision=(course.revision||0)+2+(course.realWorld?1:0)});
export const COLORS=['#ef5b3f','#f6c64b','#6e87e7','#88bf73'];
export const NAMES=['YOU','Miso','Bolt','Clover'];
export function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
export function wrap(v,n){return((v%n)+n)%n}
export function angle(v){return Math.atan2(Math.sin(v),Math.cos(v))}
function cat(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)}
export function makeTrack(course){
 const p=course.points,raw=[],count=course.mapScale?9000:1800;
 if(course.sampledPath)raw.push(...p,p[0]);
 else for(let i=0;i<=count;i++){let f=i/count*p.length,k=Math.floor(f),t=f-k;raw.push([0,1,2].map(a=>cat(p[wrap(k-1,p.length)][a],p[wrap(k,p.length)][a],p[wrap(k+1,p.length)][a],p[wrap(k+2,p.length)][a],t)));}
 let lengths=[0];for(let i=1;i<raw.length;i++)lengths.push(lengths[i-1]+Math.hypot(raw[i][0]-raw[i-1][0],raw[i][2]-raw[i-1][2]));
 const total=lengths.at(-1),nodes=[],n=course.mapScale?Math.ceil(total/.5):640,jumps=course.jumpAnchors?course.jumpAnchors.map(([x,z])=>{let k=0,best=Infinity;for(let i=0;i<raw.length;i++){let d=Math.hypot(raw[i][0]-x,raw[i][2]-z);if(d<best){best=d;k=i;}}let crest=lengths[k];return{rampStart:(crest-12)/total,gap:[crest/total,(crest+3.4)/total]};}):[{rampStart:course.rampStart,gap:course.gap},...(course.extraJumps||[])];let j=0;
 for(let i=0;i<n;i++){let d=i/n*total;while(lengths[j+1]<d)j++;let t=(d-lengths[j])/(lengths[j+1]-lengths[j]),v=raw[j].map((a,k)=>a+(raw[j+1][k]-a)*t),u=i/n;v[1]=Math.max(0,v[1]);for(const jump of jumps)if(u>=jump.rampStart&&u<jump.gap[0])v[1]+=2.1*(u-jump.rampStart)/(jump.gap[0]-jump.rampStart);nodes.push({x:v[0],y:v[1]+.13,z:v[2],gap:jumps.some(jump=>u>=jump.gap[0]&&u<jump.gap[1]),ramp:jumps.some(jump=>u>=jump.rampStart&&u<jump.gap[0])});}
 for(let i=0;i<n;i++){let a=nodes[wrap(i-1,n)],b=nodes[(i+1)%n],q=nodes[i],len=Math.hypot(b.x-a.x,b.z-a.z);q.tx=(b.x-a.x)/len;q.tz=(b.z-a.z)/len;q.heading=Math.atan2(q.tx,q.tz);q.slope=(b.y-a.y)/len;}
 const track={nodes,n,length:total,spacing:total/n,course,jumps};if(course.id==='sandown')makeSandownTerrain(track);else if(course.id==='albert-park')makeAlbertTerrain(track);else if(course.id==='oran-park')makeOranTerrain(track);else if(course.realWorld)makePanoramaTerrain(track);
 const barriers=makeBarriers(nodes,course,track);
 // Seat moved walls on the surrounding terrain while preserving bridge decks.
 if(course.extraRunoff&&course.realWorld)for(const w of barriers){for(const end of['a','b']){const i=end==='a'?w.index:(w.index+1)%n;if(!track.isBridgeIndex?.(i))w[end+'y']=Math.min(w[end+'y'],track.terrainHeight(w[end+'x'],w[end+'z'])+.13);}}
 const hazards=[],debris=[];
 if(course.hazard){let p=nodes.reduce((best,p)=>Math.hypot(p.x-course.hazardAnchor[0],p.z-course.hazardAnchor[1])<Math.hypot(best.x-course.hazardAnchor[0],best.z-course.hazardAnchor[1])?p:best,nodes[0]);hazards.push({x:p.x,z:p.z,tx:p.tx,tz:p.tz,length:14,width:course.width+1,kind:course.hazard,label:course.hazardLabel,fx:p.tz*(course.hazard==='stream'?4.5:3.8),fz:-p.tx*(course.hazard==='stream'?4.5:3.8)});}
 if(course.mapScale&&!course.realWorld){for(let k=0;k<10;k++){const start=Math.floor((.09+k*.083)*n);for(let j=0;j<Math.floor(n*.03);j++){let i=(start+j)%n,p=nodes[i],u=i/n;if(p.gap||p.ramp||Math.hypot(p.x,p.z)<26||jumps.some(g=>Math.abs(u-g.gap[0])*total<45)||hazards.some(h=>Math.hypot(p.x-h.x,p.z-h.z)<27)||debris.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<36))continue;const side=k%2?1:-1,offset=course.width/2-.52;debris.push({x:p.x+p.tz*offset*side,z:p.z-p.tx*offset*side,y:p.y,r:1.05,index:i,side,heading:p.heading});break;}}}
 const cells=new Map();for(const w of barriers){let minX=Math.floor((Math.min(w.ax,w.bx)-2)/8),maxX=Math.floor((Math.max(w.ax,w.bx)+2)/8),minZ=Math.floor((Math.min(w.az,w.bz)-2)/8),maxZ=Math.floor((Math.max(w.az,w.bz)+2)/8);for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){let key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(w);}}
 Object.assign(track,{barriers,hazards,debris,barrierCells:cells});return track;
}
export function nearest(track,x,z,y=0,hint=null){let best=null,bestScore=Infinity,n=track.n;const start=hint===null?0:hint-65,end=hint===null?n:hint+66;for(let k=start;k<end;k++){let i=wrap(k,n),p=track.nodes[i],d=Math.hypot(x-p.x,z-p.z),score=d*d+Math.pow(Math.max(0,Math.abs(y-p.y)-1),2)*1.8;if(score<bestScore){bestScore=score;best={i,p,d};}}return best;}
export const DIFFICULTIES={
 easy:{cruise:20,boostSpeed:25.8,lateral:19.5,reserve:.40,line:.25,steering:2.0},
 medium:{cruise:20,boostSpeed:29,lateral:23,reserve:.18,line:.55,steering:2.2},
 hard:{cruise:20,boostSpeed:29,lateral:35,reserve:.42,line:.65,steering:2.6}
};
export class Race{
 constructor(track,difficulty='medium',engine='commercial'){this.engineClass=engineClass(engine);this.difficulty=DIFFICULTIES[difficulty]?difficulty:'medium';this.track=track;this.time=0;this.countdown=3.4;this.finished=[];this.obstacles=[];this.paused=false;this.boostPickups=makeBoostPickups(track);this.boostPads=makeBoostPads(track);this.cars=COLORS.map((color,i)=>{const slot=i===0?3:i-1;let progress=-8-slot*5,index=wrap(progress,track.n),p=track.nodes[index],lane=(slot%2?1:-1)*1.25;return{vehicleType:track.course.type,engineScale:engineMultiplier(this.engineClass),braking:false,id:i,color,name:NAMES[i],x:p.x+p.tz*lane,z:p.z-p.tx*lane,y:p.y,heading:p.heading,vx:0,vz:0,vy:0,speed:0,progress,index,lastSafe:progress,boost:1,boostLocked:false,boostLap:0,catchup:1,padBoostTimer:0,padBoostCooldown:0,airborne:false,boosting:false,drifting:false,offTime:0,stuck:0,respawns:0,finish:null,flash:0};});}
 recover(c){let pos=c.lastSafe-3,p=this.track.nodes[wrap(Math.floor(pos),this.track.n)];if(p.gap){pos-=20;p=this.track.nodes[wrap(Math.floor(pos),this.track.n)];}Object.assign(c,{x:p.x,z:p.z,y:p.y+.15,heading:p.heading,vx:p.tx*4,vz:p.tz*4,vy:0,steerAngle:0,yawRate:0,braking:false,index:wrap(Math.floor(pos),this.track.n),progress:pos,airborne:false,offTime:0,stuck:0,flash:1.8});c.respawns++;}
 step(dt,input={}){
  if(this.paused)return;dt=Math.min(dt,.04);if(this.countdown>0){this.countdown-=dt;return}this.time+=dt;const boostStarts=boostStart(this.cars);assignCatchup(this.cars,this.ranking());
  for(const c of this.cars){if(c.finish!==null)continue;const tr=this.track,co=tr.course,engine=c.engineScale;let near=nearest(tr,c.x,c.z,c.y,c.index),p=near.p,onRoad=near.d<co.width/2,throttle=0,steer=0,brake=false,boost=false;
   if(c.id===0){throttle=clamp(Number(input.forward)||0,0,1)-clamp(Number(input.reverse)||0,0,1);steer=clamp(Number(input.left)||0,0,1)-clamp(Number(input.right)||0,0,1);brake=!!input.brake;boost=!!input.boost;}else{
    const skill=DIFFICULTIES[this.difficulty],speed=Math.max(0,c.speed),at=d=>tr.nodes[wrap(near.i+Math.round(d/tr.spacing),tr.n)];
    const look=3.4+speed*(co.realWorld?.32:.22),target=at(look),bend=angle(at(look+4).heading-at(Math.max(0,look-4)).heading);
    let lane=clamp(bend*1.6,-1,1)*skill.line;
    // Keep clear of debris and choose a passing side when a slower rival is ahead.
    for(const o of tr.debris){let dx=o.x-c.x,dz=o.z-c.z,ahead=dx*p.tx+dz*p.tz;if(ahead>0&&ahead<look+4&&Math.hypot(dx,dz)<look+5)lane-=o.side*.7;}
    for(const other of this.cars){if(other===c||Math.abs(other.y-c.y)>1.3)continue;let dx=other.x-c.x,dz=other.z-c.z,ahead=dx*p.tx+dz*p.tz,side=dx*p.tz-dz*p.tx;if(ahead>1&&ahead<look+2&&Math.abs(side)<1.6&&speed>other.speed+.5)lane+=(side>0?-1:1)*1.15;}
    const refillSkill=BOOST_AI[this.difficulty];c.boostTarget=null;
    if(c.boost<refillSkill.need){const target=this.boostPickups.map(p=>({p,d:wrap(p.index-near.i,tr.n)*tr.spacing})).filter(o=>o.d<refillSkill.reach&&o.p.readyAt<=this.time+o.d/Math.max(8,speed)).sort((a,b)=>a.d-b.d)[0];if(target){c.boostTarget=target.p.id;lane*=this.difficulty==='hard'?0:this.difficulty==='medium'?.15:.4}}
    lane=clamp(lane,-co.width/2+1.5,co.width/2-1.5);c.aiLane=(c.aiLane||0)+(lane-(c.aiLane||0))*Math.min(1,dt*3);
    const driftX=c.vx-p.tx*speed,driftZ=c.vz-p.tz*speed;
    const targetHeading=Math.atan2(target.x+target.tz*c.aiLane-c.x-driftX*.15,target.z-target.tx*c.aiLane-c.z-driftZ*.15),err=angle(targetHeading-c.heading);
    steer=clamp(err*skill.steering,-1,1);
    let desired=(skill.boostSpeed-(c.id-1)*.15)*engine;
    // Preview upcoming curvature and brake before the bend, using the same vehicle limits as the player.
    const cornerGrip=co.realWorld?REAL_GRIP*{easy:.53,medium:.60,hard:.68}[this.difficulty]:skill.lateral;
    for(let d=0;d<=(co.realWorld?42:28)*engine;d+=3){const curvature=Math.abs(angle(at(d+3).heading-at(d-3).heading))/6,cornerSpeed=Math.sqrt(cornerGrip*(co.type==='boat'?.85:1)/Math.max(.001,curvature));desired=Math.min(desired,Math.sqrt(cornerSpeed*cornerSpeed+2*(co.realWorld?10:14)*engine*Math.max(0,d-3)));}
    if(Math.abs(err)>.65||near.d>co.width/2-1)desired=Math.min(desired,11);
    boost=desired>skill.cruise*engine+(this.difficulty==='hard'?.4:1)&&Math.abs(err)<(this.difficulty==='hard'?.25:.20)&&!c.boostLocked&&c.boost>(c.boosting?BOOST_LOW:{easy:.18,medium:.12,hard:BOOST_LOW}[this.difficulty])&&onRoad;
    if(!boost)desired=Math.min(desired,skill.cruise*engine);
    if(!co.realWorld)desired*=c.catchup;throttle=clamp((desired-speed)/engine*.8+(co.realWorld?.35:desired/engine*.64/14),-.65,1);c.aiError=err;

   }
   c.wallPenaltyCooldown=Math.max(0,(c.wallPenaltyCooldown||0)-dt);c.flash=Math.max(0,c.flash-dt);c.speed=c.vx*Math.sin(c.heading)+c.vz*Math.cos(c.heading);c.braking=isBraking(throttle,brake,c.speed);c.drifting=brake&&Math.abs(c.speed)>5;useBoost(c,boost&&throttle>0&&c.speed>2,dt);
   if(co.realWorld)driveRealCar(c,{throttle,steer,brake,onRoad,p,track:tr},dt);else{
   const grip=co.type==='boat'?3.3:brake?1.7:8.2,turn=steeringRate(Math.hypot(c.vx,c.vz),brake,co.type,engine);c.heading+=steer*turn*Math.sign(c.speed||1)*dt*(c.airborne?.48:1);
   const fx=Math.sin(c.heading),fz=Math.cos(c.heading),lateral=c.vx*fz-c.vz*fx;c.vx-=fz*lateral*Math.min(1,grip*dt);c.vz+=fx*lateral*Math.min(1,grip*dt);
   let accel=throttle*(throttle<0&&c.speed>0?24:14)*(c.airborne?.25:1)*c.catchup*engine;if(c.boosting)accel+=20*c.catchup*engine;if(co.realWorld&&!c.airborne)accel-=p.slope*8;c.vx+=fx*accel*dt;c.vz+=fz*accel*dt;
   let drag=onRoad?.64:co.offroadDrag??(co.type==='boat'?1.1:2.2);if(brake)drag+=.9;const damping=Math.exp(-drag*dt);c.vx*=damping;c.vz*=damping;let mag=Math.hypot(c.vx,c.vz),max=(c.boosting?29:20)*c.catchup*engine;if(mag>max){c.vx*=max/mag;c.vz*=max/mag}if(c.speed<-7*engine){c.vx*=.94;c.vz*=.94}
   }
   c.hazard='';if(!c.airborne)for(const h of tr.hazards){const dx=c.x-h.x,dz=c.z-h.z;if(Math.abs(dx*h.tx+dz*h.tz)<h.length/2&&Math.abs(dx*h.tz-dz*h.tx)<h.width/2&&c.y<.7){c.hazard=h.label;c.vx+=h.fx*dt;c.vz+=h.fz*dt;if(h.kind==='stream'){c.vx*=Math.exp(-dt*.25);c.vz*=Math.exp(-dt*.25);}}}
   c.x+=c.vx*dt;c.z+=c.vz*dt;
   let next=nearest(tr,c.x,c.z,c.y,near.i),support=next.d<co.width/2&&!next.p.gap,surface=support?next.p.y:tr.terrainHeight?.(c.x,c.z)??0;
   if(!c.airborne){if((p.gap||next.p.gap)&&c.y>.5||c.y-surface>.65){c.airborne=true;c.vy=Math.max(0,p.slope*c.speed)+1.3;}else{c.y=surface;c.vy=0;}}
   if(c.airborne){c.vy-=18*dt;c.y+=c.vy*dt;if(c.y<=surface&&c.vy<=0){c.y=surface;c.vy=0;c.airborne=false;}}
   // Checkpoints follow the route, including height at the overpass; shortcuts cannot award laps.
   let delta=next.i-c.index;if(delta>tr.n/2)delta-=tr.n;if(delta<-tr.n/2)delta+=tr.n;
   if(Math.abs(delta)<35&&next.d<co.width*.75){c.progress+=delta;c.index=next.i;if(support&&!c.airborne&&Math.abs(c.y-next.p.y)<.5)c.lastSafe=c.progress;}
   refillLap(c,tr.n);
   if(next.d>co.width*.9+(co.extraRunoff||0))c.offTime+=dt;else c.offTime=0;c.stuck=Math.abs(c.speed)<1.5?c.stuck+dt:0;
   if(Math.abs(c.x)>((co.bounds?.[0]||36)+(co.extraRunoff||0))||Math.abs(c.z)>((co.bounds?.[1]||24)+(co.extraRunoff||0))||c.y<-4||tr.isWater?.(c.x,c.z)&&!c.airborne||c.offTime>(c.id?2.0:4)||c.id&&c.stuck>2.5)this.recover(c);
   for(const o of this.obstacles)resolveObstacle(c,o);
   const nearbyWalls=new Set();for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const wall of(tr.barrierCells.get((Math.floor(c.x/8)+dx)+','+(Math.floor(c.z/8)+dz))||[]))nearbyWalls.add(wall);
   for(const wall of nearbyWalls)resolveWall(c,wall);
   if(c.progress>=tr.n*3){c.finish=this.time;this.finished.push(c.id);}
  }
  for(let i=0;i<this.cars.length;i++)for(let j=i+1;j<this.cars.length;j++){const a=this.cars[i],b=this.cars[j];if(a.finish===null&&b.finish===null)resolveVehicles(a,b)}
  collectBoosts(this,this.cars,boostStarts,dt);collectBoostPads(this,this.cars,boostStarts,dt);
 }
 ranking(){return [...this.cars].sort((a,b)=>a.finish!==null&&b.finish!==null?a.finish-b.finish:a.finish!==null?-1:b.finish!==null?1:b.progress-a.progress)}
}
export function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`}
