import assert from 'node:assert/strict';
import {COURSES,makeTrack} from '../dist/race.mjs';
const course=COURSES.find(c=>c.id==='homebush'),t=makeTrack(course);
assert.equal(t.sections.length,14);
assert.equal(new Set(t.sections.map(s=>s.index)).size,14);
assert(t.nodes[0].tz<-.95,'Pit straight heads north toward T1');
assert(t.nodes.reduce((s,p,i)=>{const q=t.nodes[(i+1)%t.n];return s+p.x*q.z-q.x*p.z},0)<0,'Anti-clockwise map direction');
for(const p of t.nodes){assert(Number.isFinite(p.y)&&!p.gap&&Math.abs(p.slope)<.05);assert(Math.abs(p.y-t.terrainHeight(p.x,p.z)-.13)<1e-8);assert(Math.abs(p.x)<course.bounds[0]&&Math.abs(p.z)<course.bounds[1]);}
const section=n=>t.sections.find(s=>s.name.startsWith('Turn '+n+' ·')).index;
for(let n=1;n<13;n++)assert(section(n)<section(n+1),'Turn order');
assert(Math.max(...t.nodes.slice(section(8),section(9)).map(p=>Math.abs(p.slope)))>.025,'Dawn Fraser undulations affect the driving surface');
assert.equal(course.elevationScale,null,'No invented metre values');
console.log('PASS: Homebush direction, 13 corners, continuous road/terrain, gentle slopes and Dawn Fraser relief');

// Guard against restoring the sharp miniature chicanes or view-blocking labels.
const curvature=(from,to)=>Math.max(...t.nodes.slice(from,to).map((p,j)=>{const q=t.nodes[(from+j+3)%t.n];return Math.abs(Math.atan2(Math.sin(q.heading-p.heading),Math.cos(q.heading-p.heading)))/(3*t.spacing);}));
assert(curvature(section(2)-15,section(4)+30)<.23,'Olympic chicane allows a gentler steering transition');
assert(curvature(section(9)-15,section(13)+15)<.15,'Final sector corners retain larger radii');
assert(course.width>=6.8,'Usable road clearance');
const THREE=await import('../dist/three.module.mjs');
const {buildHomebushWorld}=await import('../dist/homebush-world.mjs');
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const world=new THREE.Group(),colliders=[],scenery=buildHomebushWorld({world,track:t,addCollider:(x,z,r)=>colliders.push({x,z,r})}),labels=[];
world.traverse(o=>{if(o.isSprite)labels.push(o);});
assert(labels.length>0);
scenery.update({racing:true});assert(labels.every(o=>!o.visible),'No floating signs can obscure any racing camera');
scenery.update({racing:false});assert(labels.every(o=>o.visible),'Labels return in course overview');
assert(colliders.every(o=>t.terrainDistance(o.x,o.z)>o.r+course.width/2),'Scenery colliders clear the wider road');
scenery.dispose();delete globalThis.document;
console.log('PASS: gentler chicanes, wider road, unobstructed race cameras and overview labels');
