import assert from 'node:assert/strict';
import * as THREE from '../dist/three.module.mjs';
import {TyreMarks,tyreMarkStrength,tyreRoadHeight} from '../dist/tyre-marks.mjs';
const car={id:0,vehicleType:'car',x:0,y:2,z:0,heading:0,vx:0,vz:15,engineScale:1,respawns:0,flash:0,finish:null};
const prev={speed:15,heading:0};
assert.equal(tyreMarkStrength(car,prev,.1),0,'Straight cruising stays clean');
assert(tyreMarkStrength({...car,heading:.1},prev,.1)>0,'Turning lays rubber');
assert(tyreMarkStrength({...car,braking:true,vz:13},prev,.1)>.4,'Hard braking darkens marks');
assert(tyreMarkStrength({...car,vz:17},prev,.1)>.4,'Heavy acceleration lays rubber');
for(const state of[{airborne:true},{vehicleType:'boat'},{vz:0},{finish:10}])assert.equal(tyreMarkStrength({...car,...state},prev,.1),0);
const nodes=Array.from({length:201},(_,i)=>({x:0,y:2+(i-100)*.1,z:i-100,gap:false,tx:0,tz:1}));
const track={course:{type:'car',width:8},nodes,n:nodes.length};
assert(Math.abs(tyreRoadHeight(track,car,0,.5)-2.098)<1e-8,'Road elevation is interpolated');
assert.equal(tyreRoadHeight(track,car,5,0),null,'No rubber on runoff');
const marks=new TyreMarks(new THREE.Group(),track,12);
let time=0;marks.update([car],time);
for(let i=1;i<=20;i++){
 const z=i*.1;time=i*.02;marks.update([{...car,z,y:2+z*.1,drifting:true}],time);
}
assert(marks.count>0);assert(marks.count<=12);assert.equal(marks.mesh.geometry.drawRange.count,marks.count*6);
assert([...marks.position.array].every(Number.isFinite));
const copy=[...marks.position.array];marks.update([{...car,x:5,z:70,respawns:1}],time+.02);
assert.deepEqual([...marks.position.array],copy,'Recovery never draws a line across the map');
marks.update([{...car,airborne:true}],time+.04);assert.deepEqual([...marks.position.array],copy,'Airborne tyres leave no marks');
marks.update([],110);assert.equal(marks.mesh.material.uniforms.time.value,110,'Fading follows race time');
marks.clear();assert.equal(marks.mesh.geometry.drawRange.count,0);assert.equal(marks.previous.size,0);
marks.dispose();assert.equal(marks.mesh.parent,null);
console.log('PASS: cornering, braking, acceleration, slopes, runoff, airborne/recovery gaps, bounded storage and reset');
