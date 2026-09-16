import assert from 'node:assert/strict';
import {COURSES,makeTrack} from '../dist/race.mjs';
import {HIDDEN_VALLEY,hiddenValleyPoint,hiddenValleyRelief} from '../dist/hidden-valley.mjs';
const course=COURSES.find(c=>c.id==='hidden-valley'),track=makeTrack(course);
assert(course===HIDDEN_VALLEY&&track.sections.length===16,'Fourteen numbered turns, plus the main straight either side of the line');
assert(track.sections.filter(s=>s.name==='Main Straight').length===2&&track.sections.at(-1).name==='Main Straight','The grid and the run to Turn 1 both read as the main straight');
assert(track.nodes[0].tx>.99,'The race starts along the main straight toward Turn 1');
assert(track.nodes.reduce((sum,p,i)=>{const q=track.nodes[(i+1)%track.n];return sum+p.x*q.z-q.x*p.z},0)>0,'Clockwise direction in map coordinates');
// The long main straight is the circuit's signature: about a third of the lap.
const straight=track.nodes.filter(p=>Math.abs(p.slope)<.05&&Math.abs(p.tx)>.999).length/track.n;
assert(straight>.25,'A continuous main straight must dominate the lap, got '+straight.toFixed(2));
const at=name=>track.nodes[track.sections.find(s=>s.name.startsWith(name)).index];
assert(at('Turn 3').y>at('Turn 1').y+.8,'The esses climb away from Turn 1');
assert(at('Turn 6').y<at('Turn 5').y-.8,'Turn 6 sits in its natural amphitheatre');
assert(at('Turn 10').y>at('Turn 8').y+.8,'The back leg rises to the Turn 10 crest');
assert(track.nodes.every(p=>Number.isFinite(p.y)&&!p.gap&&!p.ramp),'No artificial jumps or invalid elevations');
assert(track.nodes.every(p=>Math.abs(p.slope)<.16),'Relief stays driveable, not a ramp');
for(const p of track.nodes){
 assert(Math.abs(p.y-track.terrainHeight(p.x,p.z)-.13)<.12,'The road follows the whole-board relief');
 assert(Math.abs(p.x)<course.bounds[0]&&Math.abs(p.z)<course.bounds[1],'The circuit stays inside the board');
}
const order=['Turn 1','Turn 5','Turn 6','Turn 10','Turn 14'].map(n=>track.sections.findIndex(s=>s.name.startsWith(n)));
assert(order.every((v,i)=>i===0||v>order[i-1]),'Turns are numbered along the racing direction');
const strip=hiddenValleyPoint(1000,-62);
assert(hiddenValleyRelief(strip.x,strip.z)>0&&Math.abs(strip.z)<course.mapSize[1]/2,'The drag strip alongside the main straight sits on the board');
console.log('PASS: Hidden Valley start, clockwise 14-turn layout, long main straight, esses climb, Turn 6 bowl and Turn 10 crest');
