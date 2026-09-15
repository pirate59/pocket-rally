import {withBarriers,barrierRecordSuffix} from '../dist/barrier-modes.mjs';
import assert from 'node:assert/strict';
import {COURSES,makeTrack,Race} from '../dist/race.mjs';
import {resolveWall} from '../dist/vehicle-physics.mjs';
for(const mode of ['bumper','race'])for(const original of COURSES.filter(c=>c.walls)){
 const course=withBarriers(original,mode);
 const tr=makeTrack(course);
 for(const w of tr.barriers){
  // Check the visible cap, not just the wall centre, against the driveable road.
  for(const t of[0,.5,1]){
   const x=w.ax+(w.bx-w.ax)*t,z=w.az+(w.bz-w.az)*t,y=w.ay+(w.by-w.ay)*t;let distance=Infinity;
   for(let k=w.index-100;k<w.index+100;k++){
    const a=tr.nodes[(k%tr.n+tr.n)%tr.n],b=tr.nodes[((k+1)%tr.n+tr.n)%tr.n],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    if(Math.abs(y-a.y-(b.y-a.y)*u)>1.2)continue;
    distance=Math.min(distance,Math.hypot(x-a.x-dx*u,z-a.z-dz*u));
   }
   assert(distance-(w.width+.08)/2>course.width/2-.025,`${course.name}: wall intrudes on road at ${w.index}`);
  }
  assert(!tr.nodes[w.index].gap&&!tr.nodes[(w.index+1)%tr.n].gap,'Keep jump openings clear');
 }
 // Check matching mitred corners even at a trimmed/collapsed inner bend.
 for(const side of[-1,1]){const spans=tr.barriers.filter(w=>w.side===side);for(let i=0;i<spans.length;i++){const a=spans[i],b=spans[(i+1)%spans.length];if(Math.hypot(a.bx-b.ax,a.bz-b.az)>1e-5)continue;for(const s of[-1,1])assert(Math.hypot(a.bx+s*a.miterB.x*.21-b.ax-s*b.miterA.x*.21,a.bz+s*a.miterB.z*.21-b.az-s*b.miterA.z*.21)<1e-5,'Wall caps must meet without steps');}}
 console.log('PASS continuous walls and road clearance:',mode,course.name);
 if(process.argv.includes('--arcade-races')&&!course.realWorld){const race=new Race(tr);race.countdown=0;race.cars[0].finish=0;for(let i=0;i<360*90&&!race.cars.slice(1).every(c=>c.finish!==null);i++)race.step(1/90);console.log('Arcade finish:',course.name,race.cars.slice(1).map(c=>({time:c.finish,respawns:c.respawns})));assert(race.cars.slice(1).every(c=>c.finish!==null),'Arcade rivals must still finish');}
}
const spans=Array.from({length:100},(_,i)=>({ax:0,az:i*.5,ay:0,bx:0,bz:(i+1)*.5,by:0,width:.34,height:.62,normalA:{x:1,z:0},normalB:{x:1,z:0},joinedA:true,joinedB:true}));
const car={vehicleType:'car',x:-1.16,y:0,z:3,heading:0,vx:0,vz:20};
for(let i=0;i<150;i++){car.vx=.3;car.x+=car.vx/90;car.z+=car.vz/90;for(const w of spans)resolveWall(car,w);}
assert(car.vz>19.99,'Scraping many panel joins must preserve forward speed');
assert(car.x<=-1.169,'Car stays on its side of the barrier');
const impact={...car,x:-.8,z:10,heading:Math.PI/2,vx:20,vz:0};for(const w of spans)resolveWall(impact,w);assert(impact.vx<.01,'Head-on impacts still block the car');
const airborne={...impact,x:-.8,y:3,vx:20};assert(!resolveWall(airborne,spans[20]),'Low walls do not hit airborne cars');
console.log('PASS: glancing contact across 60+ joins, head-on collision, and height separation');

const forgiving={vehicleType:'car',x:-1,y:0,z:10.25,heading:0,vx:5,vz:20};
const absorbing={...forgiving};resolveWall(forgiving,spans[20]);resolveWall(absorbing,{...spans[20],barrierMode:'race'});
assert(absorbing.vz<forgiving.vz*.73,'Race barriers must remove substantially more forward speed');assert(Math.abs(absorbing.vx)<1e-8,'Absorbing barrier must not bounce the car back');
const afterImpact=absorbing.vz;absorbing.x=-1;absorbing.vx=5;resolveWall(absorbing,{...spans[21],barrierMode:'race'});assert.equal(absorbing.vz,afterImpact,'Adjacent panels must not multiply the speed penalty');
for(const original of COURSES.filter(c=>c.walls)){const current=makeTrack(original),bumper=makeTrack(withBarriers(original,'bumper')),race=makeTrack(withBarriers(original,'race'));assert.deepEqual(current.barriers.map(w=>[w.ax,w.az,w.bx,w.bz]),bumper.barriers.map(w=>[w.ax,w.az,w.bx,w.bz]),'Bumper Kart preserves existing walls');assert(race.barriers.some(w=>w.runoff>Math.max(...current.barriers.map(v=>v.runoff))+.3),'Race mode provides more runoff');assert.equal(original.barrierMode,undefined,'Options do not mutate shared course definitions');}
assert.equal(barrierRecordSuffix(COURSES[0],'bumper'),'');assert.equal(barrierRecordSuffix(COURSES.find(c=>c.mode==='collect'),'race'),'');assert.notEqual(barrierRecordSuffix(COURSES.find(c=>c.realWorld),'race'),'');
console.log('PASS: absorbing impacts, join cooldown, wider runoff, unchanged defaults and separate records');
