import assert from 'node:assert/strict';
import {configureBoosts,useBoost,boostStart,collectBoostPads,boostRecordSuffix} from '../dist/boost-system.mjs';
import {Race,makeTrack,COURSES} from '../dist/race.mjs';
import {CarpetRun,makeCarpetTrack} from '../dist/carpet-run.mjs';
const suffixes=new Set();
for(const manual of [false,true])for(const ground of [false,true]){
 const options={manual,ground};suffixes.add(boostRecordSuffix(options));
 for(const factory of [()=>new Race(makeTrack(COURSES[0])),()=>new CarpetRun(makeCarpetTrack(),'medium',123)]){
  const run=factory(),pad=run.boostPads[0];configureBoosts(run,options);
  assert.equal(run.boostPickups.length>0,manual);assert.equal(run.boostPads.length>0,ground);
  for(const c of run.cars){useBoost(c,true,.1);assert.equal(c.boosting,manual,'Manual boost follows its toggle for every car');assert.equal(c.boost<1,manual);}
  const c=run.cars[0];Object.assign(c,{x:pad.x,y:pad.y,z:pad.z,padBoostTimer:0,padBoostCooldown:0,boost:1});
  collectBoostPads(run,[c],boostStart([c]),.01);useBoost(c,false,.01);
  assert.equal(c.boosting,ground,'Ground pads work independently of manual boost');assert.equal(c.boost,1,'Ground pads never spend manual fuel');
 }
}
assert.equal(suffixes.size,4);assert.equal(boostRecordSuffix({manual:true,ground:true}),'','Preserve records with original settings');
console.log('PASS: all four independent boost combinations, all cars, both race modes and separate records');
