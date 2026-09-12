export const BOOST_LOW=.08;
export function assignCatchup(cars,ranking){const ordered=ranking||[...cars].sort((a,b)=>(b.progress??0)-(a.progress??0));ordered.forEach((car,place)=>{car.place=place+1;car.catchup=1+place*.04})}
export function useBoost(car,wanted,dt){
 if(car.boost<=BOOST_LOW){car.boost=0;car.boostLocked=true}
 const padActive=(car.padBoostTimer||0)>0;car.padBoostTimer=Math.max(0,(car.padBoostTimer||0)-dt);car.padBoostCooldown=Math.max(0,(car.padBoostCooldown||0)-dt);
 car.boosting=padActive||!!wanted&&!car.boostLocked&&car.boost>BOOST_LOW;
 if(car.boosting&&!padActive&&wanted){car.boost=Math.max(0,car.boost-dt*.28);if(car.boost<=BOOST_LOW){car.boost=0;car.boostLocked=true;car.boosting=false}}
}
export function refillBoost(car,source){car.boost=1;car.boostLocked=false;car.boostRefills=(car.boostRefills||0)+1;car.lastBoostSource=source;car.lastRefillProgress=car.collected?.size}
export function refillLap(car,n){const lap=Math.max(0,Math.floor(car.progress/n));if(lap>(car.boostLap||0)){car.boostLap=lap;refillBoost(car,'lap')}}
export function makeBoostPickups(track){
 const count=track.course.mapScale?3:1,result=[];
 if(track.course.mode==='collect'){
  const candidates=track.edges.map(([a,b])=>{const p=track.nodes[a],q=track.nodes[b];return{x:(p.x+q.x)/2,y:.13,z:(p.z+q.z)/2}});
  for(const [x,z]of [[-65,-90],[65,5],[-30,110]]){const p=candidates.filter(p=>result.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>55)).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];result.push({...p})}
 }else{
  for(let k=0;k<count;k++){const fraction=count===1?.56:.18+k*.32,preferred=Math.floor(track.n*fraction);let best=null,score=Infinity;
   track.nodes.forEach((p,index)=>{if(p.gap||p.ramp||Math.abs(p.slope)>.08||track.hazards.some(h=>Math.hypot(p.x-h.x,p.z-h.z)<16)||track.debris.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<7))return;const behind=track.nodes[(index-8+track.n)%track.n],ahead=track.nodes[(index+8)%track.n];if(behind.gap||ahead.gap||Math.abs(Math.atan2(Math.sin(ahead.heading-behind.heading),Math.cos(ahead.heading-behind.heading)))>.22)return;const d=Math.abs(index-preferred);if(d<score){best={x:p.x,y:p.y,z:p.z,index};score=d}});
   if(!best)throw new Error('No safe boost pickup position for '+track.course.name);result.push(best);
  }
 }
 return result.map((p,id)=>({...p,id,readyAt:0,claims:0}));
}
export function makeBoostPads(track){
 const count=track.course.mapScale?6:2,result=[];
 for(let k=0;k<count;k++){const preferred=Math.floor(track.n*(.12+k/count*.76));let best=null,score=Infinity;
  track.nodes.forEach((p,index)=>{if(p.gap||p.ramp||Math.abs(p.slope)>.08||track.hazards.some(h=>Math.hypot(p.x-h.x,p.z-h.z)<14)||track.debris.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<6))return;const d=Math.abs(index-preferred),spacing=result.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>18);if(spacing&&d<score){best={x:p.x,y:p.y,z:p.z,index,heading:p.heading};score=d}});
  if(!best)throw new Error('No safe boost pad position for '+track.course.name);if(track.course.mode==='collect'){const node=track.nodes[best.index],next=track.nodes[node.neighbors[0]];best.heading=Math.atan2(next.x-node.x,next.z-node.z)}result.push({...best,id:k,cooldowns:new Map()});
 }
 return result;
}
export function collectBoostPads(run,cars,starts,dt){
 const events=[],startTime=run.time-dt;
 for(const pad of run.boostPads)for(let i=0;i<cars.length;i++){const c=cars[i],a=starts[i];if(c.finish!==null||c.respawns!==a.respawns||c.padBoostCooldown>0)continue;const dx=c.x-a.x,dz=c.z-a.z,ox=a.x-pad.x,oz=a.z-pad.z,l2=dx*dx+dz*dz,r=2.1,dot=ox*dx+oz*dz,disc=dot*dot-l2*(ox*ox+oz*oz-r*r);let entry=0,exit=1;if(l2<1e-10){if(ox*ox+oz*oz>r*r)continue}else{if(disc<0)continue;entry=Math.max(0,(-dot-Math.sqrt(disc))/l2);exit=Math.min(1,(-dot+Math.sqrt(disc))/l2)}if(entry>exit||entry>1||Math.abs(a.y+(c.y-a.y)*entry-pad.y)>1.4)continue;events.push({pad,c,at:startTime+entry*dt})}
 events.sort((a,b)=>a.at-b.at||a.c.id-b.c.id);for(const {pad,c}of events){if(c.padBoostCooldown>0)continue;c.padBoostTimer=1.1;c.padBoostCooldown=1.5;c.lastBoostSource='pad'}
}
export const boostStart=cars=>cars.map(c=>({x:c.x,y:c.y,z:c.z,respawns:c.respawns}));
// Resolve all swept contacts together, by arrival time rather than car-array
// order. A recovery cannot collect items along its teleport path.
export function collectBoosts(run,cars,starts,dt){
 const events=[],startTime=run.time-dt;
 for(const p of run.boostPickups)for(let i=0;i<cars.length;i++){
  const c=cars[i],a=starts[i];if(c.finish!==null||c.boost>=.999||c.respawns!==a.respawns)continue;
  const dx=c.x-a.x,dz=c.z-a.z,ox=a.x-p.x,oz=a.z-p.z,l2=dx*dx+dz*dz,dot=ox*dx+oz*dz,r=1.85,disc=dot*dot-l2*(ox*ox+oz*oz-r*r);let entry=0,exit=1;
  if(l2<1e-10){if(ox*ox+oz*oz>r*r)continue}else{if(disc<0)continue;entry=Math.max(0,(-dot-Math.sqrt(disc))/l2);exit=Math.min(1,(-dot+Math.sqrt(disc))/l2)}
  entry=Math.max(entry,(p.readyAt-startTime)/dt);if(entry>exit||entry>1||Math.abs(a.y+(c.y-a.y)*entry-p.y)>1.4)continue;
  events.push({p,c,at:startTime+entry*dt});
 }
 events.sort((a,b)=>a.at-b.at||a.c.id-b.c.id);
 for(const {p,c,at}of events){if(p.readyAt>at+1e-9||c.boost>=.999)continue;refillBoost(c,'pickup');p.claims++;p.readyAt=at+3+((p.claims*73+p.id*37+c.id*19)%201)/100;p.lastCollector=c.id}
}
export const BOOST_AI={easy:{need:.25,reach:14,detour:1,extra:6},medium:{need:.6,reach:38,detour:1.6,extra:12},hard:{need:.85,reach:72,detour:2.5,extra:20}};
