import assert from 'node:assert/strict';
import {COURSES,makeTrack} from '../dist/race.mjs';
const course=COURSES.find(c=>c.id==='adelaide'),track=makeTrack(course);
assert.equal(track.sections.length,15);
assert(track.nodes[0].tx<0&&track.nodes[0].tz>0,'Start heads toward the Senna Chicane');
assert(track.nodes.reduce((sum,p,i)=>{const q=track.nodes[(i+1)%track.n];return sum+p.x*q.z-q.x*p.z},0)>0,'Clockwise direction in map coordinates');
assert(track.nodes.every(p=>Number.isFinite(p.y)&&!p.gap&&Math.abs(p.slope)<.04),'Continuous gentle relief, without artificial jumps');
for(const p of track.nodes){assert(Math.abs(p.y-track.terrainHeight(p.x,p.z)-.13)<.02,'Road follows the whole-board relief');assert(Math.abs(p.x)<course.bounds[0]&&Math.abs(p.z)<course.bounds[1]);}
assert(track.sections.find(s=>s.name.startsWith('Turn 8')).index<track.sections.find(s=>s.name.startsWith('Turn 9')).index);
console.log('PASS: Adelaide start, clockwise layout, 14 turns, road/terrain alignment and gentle slopes');
