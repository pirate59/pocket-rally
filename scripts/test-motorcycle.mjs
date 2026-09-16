import assert from 'node:assert/strict';
import {driveMotorcycle} from '../dist/motorcycle-physics.mjs';
import {makeMotorcycle} from '../dist/motorcycle.mjs';
import {COURSES,makeTrack} from '../dist/race.mjs';
import {buildIslandWorld} from '../dist/island-world.mjs';
import * as THREE from '../dist/three.module.mjs';
const context={throttle:0,steer:0,brake:false,onRoad:true,p:{tx:0,tz:1,slope:0},track:{course:{offroadDrag:3.4}}};
const rider=()=>({x:0,z:0,heading:0,vx:0,vz:20,speed:20,lean:0});
function run(c,seconds,input={}){for(let i=0;i<seconds*120;i++){const before=c.lean;driveMotorcycle(c,{...context,...input},1/120);assert(Math.abs(c.lean-before)<=2.8/120+1e-8);assert(Number.isFinite(c.heading));}return c;}
const left=run(rider(),.6,{steer:.6}),right=run(rider(),.6,{steer:-.6});assert(left.lean>.2&&left.heading>.1);assert(Math.abs(left.lean+right.lean)<1e-6);assert(Math.abs(left.heading+right.heading)<1e-6);
run(left,1.5);assert(Math.abs(left.lean)<.001,'Returns upright on release');
assert(run(rider(),1,{brake:true}).speed<run(rider(),1).speed-8);
assert(run(rider(),1,{onRoad:false}).speed<run(rider(),1).speed-5);
const air=run({...rider(),airborne:true},1,{steer:1});assert.equal(air.heading,0);
const track=makeTrack(COURSES.find(c=>c.id==='phillip-island')),world=new THREE.Group();buildIslandWorld({world,track,addCollider(){}});let facilities=0;
world.updateMatrixWorld(true);world.traverse(o=>{const f=o.userData.sceneryFootprint;if(!f)return;facilities++;for(let x=-f.w/2;x<=f.w/2;x+=.5)for(let z=-f.d/2;z<=f.d/2;z+=.5){const p=o.localToWorld(new THREE.Vector3(x,0,z));assert(track.terrainDistance(p.x,p.z)>track.course.width/2+1,'Facilities stay outside road');}});assert(facilities>=3);
assert(track.nodes.every(p=>Math.abs(p.y-track.terrainHeight(p.x,p.z))<.3));assert(Math.max(...track.nodes.map(p=>p.y))-Math.min(...track.nodes.map(p=>p.y))>4);
const bike=makeMotorcycle('#ef5b3f');assert.equal(bike.userData.wheels.length,2);bike.userData.leanBody.rotation.z=-.7;assert.equal(bike.rotation.z,0,'External camera root stays level when body leans');
console.log('PASS motorcycle lean response, grip, braking, airborne steering, terrain, scenery clearance and model hierarchy');
