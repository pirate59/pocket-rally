import assert from 'node:assert/strict';
import {ENGINE_CLASSES,engineRecordSuffix,isBraking} from '../dist/engine-classes.mjs';
import {driveRealCar} from '../dist/real-driving.mjs';
import {steeringRate} from '../dist/vehicle-physics.mjs';
import {COURSES,makeTrack,Race} from '../dist/race.mjs';
import {CarpetRun,makeCarpetTrack} from '../dist/carpet-run.mjs';
import {attachBrakeLights,updateBrakeLights} from '../dist/vehicle-lights.mjs';
import * as THREE from '../dist/three.module.mjs';
const dt=1/90,flat={throttle:1,steer:0,brake:false,onRoad:true,p:{tx:0,tz:1,slope:0},track:{course:{}}};
const car=engineScale=>({engineScale,x:0,z:0,heading:0,vx:0,vz:0,catchup:1});
assert.deepEqual(Object.values(ENGINE_CLASSES).map(e=>e.multiplier),[1,1.25,1.5]);
for(const speed of [9,20,29])for(const brake of [false,true]){
 const cars=Object.values(ENGINE_CLASSES).map(e=>({...car(e.multiplier),vz:speed*e.multiplier}));
 for(let frame=0;frame<45;frame++)cars.forEach(c=>driveRealCar(c,{...flat,steer:.5,brake},dt));
 for(const c of cars){
  assert(Math.abs(c.heading-cars[0].heading)<1e-8,'Real-world turn response matches Commercial at comparable class speed');
  assert.equal(steeringRate(speed*c.engineScale,brake,'car',c.engineScale),steeringRate(speed,brake),'Arcade turn response matches Commercial');
  assert(steeringRate(29*c.engineScale,false,'car',c.engineScale)<steeringRate(20*c.engineScale,false,'car',c.engineScale),'Boost still reduces steering');
 }
}
assert.equal(engineRecordSuffix('sport'),'-engine-sport-v2','Old faster-class times stay separate');
for(const boost of [false,true]){
 const cars=Object.values(ENGINE_CLASSES).map(e=>({...car(e.multiplier),boosting:boost}));
 for(let frame=0;frame<1800;frame++){
  cars.forEach(c=>driveRealCar(c,flat,dt));
  for(const c of cars)assert(Math.abs(c.speed/c.engineScale-cars[0].speed)<1e-8,'Real-world acceleration and terminal speed scale exactly on flat tarmac');
 }
 console.log('Real-world '+(boost?'boosted':'normal')+' speeds:',cars.map(c=>c.speed.toFixed(2)).join(', '));
}
const tracks=[makeTrack(COURSES[3]),makeCarpetTrack(COURSES[6])];
for(const track of tracks){
 let baseline;
 for(const [name,{multiplier}] of Object.entries(ENGINE_CLASSES)){
  const race=track.course.mode==='collect'?new CarpetRun(track,'medium',123,name):new Race(track,'medium',name);
  assert(race.cars.every(c=>c.engineScale===multiplier));race.countdown=0;
  race.cars.splice(1);if(race.racers)race.racers=[race.cars[0]];
  race.step(dt,{forward:true});const c=race.cars[0],speed=Math.hypot(c.vx,c.vz);
  baseline??=speed;assert(Math.abs(speed/baseline-multiplier)<1e-8,'Arcade acceleration multiplier');
  race.step(dt,{reverse:true});assert(c.braking,'Brake pedal lights lamps');
  race.step(dt,{});assert(!c.braking,'Coasting extinguishes lamps');
  race.step(dt,{brake:true});assert(c.braking,'Handbrake lights lamps');
  race.recover(c);assert(!c.braking,'Recovery clears lamps');
 }
}
assert.equal(engineRecordSuffix('commercial'),'');assert.notEqual(engineRecordSuffix('sport'),engineRecordSuffix('racing'));
assert(!isBraking(-1,false,-4),'Reversing is not braking');assert(isBraking(-1,false,0),'Brake lights at rest');
for(const type of ['car','buggy','traffic']){
 const a=new THREE.Group(),b=new THREE.Group();attachBrakeLights(a,type);attachBrakeLights(b,type);updateBrakeLights(a,true);
 assert(a.userData.brakeLights.lens.emissiveIntensity>2);assert(b.userData.brakeLights.lens.emissiveIntensity<.1);
 assert(a.children.filter(m=>m.name==='Brake light').every(m=>m.position.z<-1.5),'Lenses sit outside the rear body');
 updateBrakeLights(a,false);assert.equal(a.userData.brakeLights.halo.opacity,0);
}
console.log('PASS: all engine multipliers, separate records, brake controls and independent lamps for cars, buggies and traffic');
