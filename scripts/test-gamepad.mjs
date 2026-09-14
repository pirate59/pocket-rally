import assert from 'node:assert/strict';
import {deadzone,readPad,GamepadInput} from '../dist/gamepad.mjs';
import {COURSES,makeTrack,Race} from '../dist/race.mjs';
import {CarpetRun,makeCarpetTrack} from '../dist/carpet-run.mjs';
const pad=()=>({index:0,mapping:'standard',connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({value:0}))});
assert.equal(deadzone(.1),0);assert.equal(deadzone(-1),-1);assert.equal(deadzone(NaN),0);
let p=pad();p.axes[0]=-.58;p.buttons[7].value=.525;let v=readPad(p);assert(Math.abs(v.left-.5)<1e-10);assert(Math.abs(v.forward-.5)<1e-10);assert.equal(v.right,0);
p.buttons[6].value=1;p.buttons[0].value=1;p.buttons[1].value=1;v=readPad(p);assert.equal(v.reverse,1);assert(v.boost&&v.brake);
const input=new GamepadInput();p=pad();input.poll([null,p],0);p.buttons[9].value=1;assert(input.poll([p],.1).actions.pause);assert(!input.poll([p],.2).actions.pause,'Held pause is edge-triggered');
input.block();p.buttons[7].value=1;assert.deepEqual(input.poll([p],.3).input,{},'Held gas cannot carry across pause');p=pad();input.poll([p],.4);p.buttons[7].value=.5;assert(input.poll([p],.5).input.forward>0);
assert(input.poll([],.6).disconnected);assert(!input.poll([],.7).disconnected);assert.equal(input.poll([{...pad(),mapping:''}],.8).connected,false);
p=pad();p.buttons[0].value=1;assert(!input.poll([p],1).actions.confirm,'Connecting must not click a menu item');
for(const factory of[()=>new Race(makeTrack(COURSES[0])),()=>new Race(makeTrack(COURSES[7])),()=>new CarpetRun(makeCarpetTrack(),'medium',123)]){
 const drive=forward=>{const race=factory();race.countdown=0;for(const c of race.cars.slice(1))c.finish=0;race.step(1/90,{forward});return Math.hypot(race.cars[0].vx,race.cars[0].vz);};
 assert(drive(.5)<drive(1)*.8,'Half trigger must produce partial acceleration');assert.equal(drive(true),drive(1),'Keyboard input retains full acceleration');
}
console.log('PASS: analog steering/triggers, deadzone, button edges, neutral re-arm, disconnect and both driving modes');
