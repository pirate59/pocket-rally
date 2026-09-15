import assert from 'node:assert/strict';
import {PIECES,RADIUS,EXAMPLES,parsePiece,layoutCourse,validateLayout,addBarriers,addDecorations,makeCourse,BRIDGE_CLEARANCE,JUMP_CREST} from '../dist/course-pieces.mjs';
import {makeTrack,Race} from '../dist/race.mjs';
const near=(a,b,tol=1e-6)=>Math.abs(a-b)<=tol;

// Each piece must land exactly where its geometry says, with the correct heading.
for(const angle of[45,90,135])for(const profile of['sharp','sweeper'])for(const side of['L','R']){
 const l=layoutCourse([PIECES.turn(angle,side,profile)]),r=RADIUS[profile],theta=angle*Math.PI/180,s=side==='L'?1:-1;
 assert(near(l.cursor.heading,s*theta),`${angle}° ${side} heading`);
 assert(near(l.cursor.x,s*r*(1-Math.cos(theta)))&&near(l.cursor.z,r*Math.sin(theta)),`${angle}° ${side} ${profile} end position`);
 assert(near(l.length,r*theta),'arc length');
}
for(const side of['L','R']){
 const round=layoutCourse([PIECES.hairpin(side,'round')]),square=layoutCourse([PIECES.hairpin(side,'square',{gap:4})]),s=side==='L'?1:-1;
 assert(near(round.cursor.x,s*2*RADIUS.hairpin)&&near(round.cursor.z,0)&&near(Math.abs(round.cursor.heading),Math.PI),`round ${side} hairpin returns alongside its entry`);
 assert(near(square.cursor.x,s*(2*RADIUS.hairpin+4))&&near(square.cursor.z,0)&&near(Math.abs(square.cursor.heading),Math.PI),`square ${side} hairpin returns alongside its entry`);
 const tip=Math.max(...square.points.map(p=>p[2]));assert(near(tip,RADIUS.hairpin,.3),'square hairpin has a flat tip');
}
const straight=layoutCourse([PIECES.straight(20,{rise:3})]);assert(near(straight.cursor.z,20)&&near(straight.cursor.y,3),'straight rises');
assert.deepEqual(parsePiece('R135 sweeper rise=2 runoff=1'),{kind:'turn',angle:135,side:-1,profile:'sweeper',rise:2,runoff:1});
assert.deepEqual(parsePiece('hairpin L square gap=6'),{kind:'hairpin',side:1,shape:'square',gap:6});
assert.deepEqual(parsePiece('straight 24 jump'),{kind:'straight',length:24,jump:true});
console.log('PASS: turn, hairpin and straight geometry, text piece parsing');

// A closed loop passes; an open one and a same-level overlap are rejected.
const oval=['straight 30','L90 sweeper','L90 sweeper','straight 30','L90 sweeper','L90 sweeper'];
const ovalCheck=validateLayout(layoutCourse(oval));assert(ovalCheck.ok,ovalCheck.problems.join('; '));
const open=validateLayout(layoutCourse(['straight 30','L90 sweeper','L90 sweeper','straight 20','L90 sweeper','L90 sweeper']));
assert(!open.ok&&open.problems[0].includes('does not close'),'open loop detected');
// A bow tie crosses itself once; the same geometry with a raised deck is a bridge.
const bowTie=['straight 34.5','R135 sharp','straight 14.5','R135 sharp','straight 34.5','L135 sharp','straight 14.5','L135 sharp'];
const crossing=validateLayout(layoutCourse(bowTie));assert(!crossing.ok&&crossing.problems.length===1&&crossing.problems[0].includes('meets itself at the same level'),'same-level crossing detected once');
const bridgeCheck=validateLayout(layoutCourse(EXAMPLES.bowtie.spec));
assert(bridgeCheck.ok,bridgeCheck.problems.join('; '));assert.equal(bridgeCheck.crossings.length,1,'one bridge crossing');assert(bridgeCheck.crossings[0].upper-bridgeCheck.crossings[0].lower>=BRIDGE_CLEARANCE);
const lowDeck=validateLayout(layoutCourse(['straight 13 rise=3','straight 8.5','straight 13 rise=-3','R135 sharp','straight 14.5','R135 sharp','straight 34.5','L135 sharp','straight 14.5','L135 sharp']));assert(!lowDeck.ok&&lowDeck.problems[0].includes('a bridge needs'),'a low deck is not a bridge');
const sunk=validateLayout(layoutCourse(['straight 30 rise=-2','L90 sweeper','L90 sweeper','straight 30 rise=2','L90 sweeper','L90 sweeper']));assert(sunk.problems.some(t=>t.includes('below ground')));
assert.deepEqual(layoutCourse(['straight 40 jump=22','L90 sweeper']).jumpAnchors,[[0,22]],'jump=N places the crest N units in');
console.log('PASS: closure, overlap, bridge and elevation validation');

// Sequencing rules: problems block, warnings advise.
const problemsOf=spec=>validateLayout(layoutCourse(spec)).problems,warningsOf=spec=>validateLayout(layoutCourse(spec)).warnings;
const ring=(first,...rest)=>[first,...rest,'L90 sweeper','L90 sweeper','straight 40','L90 sweeper','L90 sweeper','straight 10'];
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 24 jump','L90 sharp','L90 sharp','straight 16']).some(t=>t.includes('catch them mid-air')),'landing inside a turn is an error');
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 36 jump','L90 sharp','L90 sharp','straight 4']).some(t=>t.includes('harsh turn')),'harsh turn within 30 units of a jump is an error');
assert(warningsOf(['straight 40','L90 sweeper','L90 sweeper','straight 36 jump','straight 4','L90 sweeper','L90 sweeper']).some(t=>t.includes('safer')),'sweeper within 30 units is only a warning');
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 36 jump','straight 4','L90 sweeper','L90 sweeper']).length===0,'…and not an error');
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 20 jump','straight 10 rise=2','straight 10 rise=-2','L90 sweeper','L90 sweeper']).some(t=>t.includes('onto a slope')),'landing on a slope is an error');
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 40 jump rise=3','L90 sweeper','L90 sweeper','straight 20 rise=-3']).some(t=>t.includes('must be flat')),'a sloped jump straight is an error');
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 40 jump=8','L90 sweeper','L90 sweeper']).some(t=>t.includes('at least '+JUMP_CREST)),'crest too early for the ramp');
assert(problemsOf(['straight 20 jump','L90 sweeper','L90 sweeper','straight 40','L90 sweeper','L90 sweeper','straight 20']).some(t=>t.includes('after the start line')),'crest just after the grid is an error');
assert(problemsOf(['straight 40 jump','straight 20 jump','L90 sweeper','L90 sweeper','straight 60','L90 sweeper','L90 sweeper']).some(t=>t.includes('crests are')),'jumps too close together');
assert(problemsOf(['L90 sweeper','straight 40','L90 sweeper','L90 sweeper','straight 40','L90 sweeper']).some(t=>t.includes('start on a straight')),'lap must start on a straight');
assert(warningsOf(['straight 40','L90 sweeper','L90 sweeper','straight 40','L90 sweeper','L90 sweeper']).some(t=>t.includes('grid sits')),'grid on a bend is a warning');
assert(warningsOf(['straight 40','R90 sharp','L90 sharp','straight 40','hairpin R round','straight 40','hairpin L round','straight 40','hairpin L round','straight 4']).some(t=>t.includes('opposite harsh turns')),'snap chicane is a warning');
for(const [key,example] of Object.entries(EXAMPLES)){const v=validateLayout(layoutCourse(example.spec));assert(v.ok&&v.warnings.length===0,key+' must be problem- and warning-free: '+[...v.problems,...v.warnings].join('; '));}
console.log('PASS: jump landing, slope, spacing, start-line and chicane rules');
// Stages must run in order.
const raw={layout:layoutCourse(oval),width:6.8};
assert.throws(()=>addBarriers(raw),/Validate/);assert.throws(()=>addDecorations({...raw,layoutValid:true}),/barriers/);
const staged=addDecorations(addBarriers({...raw,layoutValid:true}),{theme:'garden'});assert(staged.walls&&staged.deco==='garden'&&staged.type==='buggy');
assert.throws(()=>makeCourse(bowTie),/not connected up/);
console.log('PASS: barriers only after validation, decorations only after barriers');

// Example courses: a paperclip of square hairpins, a bow-tie with a bridge, and
// a proving ground with a jump, every turn type, a round hairpin and a flyover.
for(const [key,example] of Object.entries(EXAMPLES)){
 const course=makeCourse(example.spec,example),track=makeTrack(course);
 assert(course.validation.ok&&course.walls&&course.decorated,key+' passes every stage');
 assert(track.n>0&&track.barriers.length>100,key+' builds a track with barriers');
 if(course.grand){const e=course.layout.extent;assert(course.mapScale===3&&course.width===9&&course.base===3,key+' is a grand beach course');assert(e.minX>=-160&&e.maxX<=195&&e.minZ>=-105&&e.maxZ<=235,key+' stays inside the grand beach interior and shoreline');}
 else assert(course.bounds[0]-5<=44&&course.bounds[1]-5<=31,key+' fits the standard board');
 if(example.spec.some(t=>t.includes('jump')))assert(track.nodes.some(p=>p.gap)&&track.nodes.some(p=>p.ramp),key+' has a jump gap and ramp');
 if(course.validation.crossings.length){assert(track.nodes.some(p=>p.y>4),key+' has a raised deck');const c=course.validation.crossings[0];assert(c.upper-c.lower>=BRIDGE_CLEARANCE);}
 const race=new Race(track);race.countdown=0;race.cars[0].finish=0;
 for(let i=0;i<900*90&&!race.cars.slice(1).every(c=>c.finish!==null);i++)race.step(1/90);
 if(course.grand)for(const c of race.cars.slice(1))assert(c.finish/3>=90&&c.finish/3<=180,key+': grand tour laps must take 90–180 s, got '+(c.finish/3).toFixed(0));
 const rivals=race.cars.slice(1);assert(rivals.every(c=>c.finish!==null),key+': CPU rivals must finish three laps');
 console.log('PASS:',key,'·',course.name,'·',track.length.toFixed(0),'units ·',track.barriers.length,'wall spans · rivals',rivals.map(c=>c.finish.toFixed(1)+'s/'+c.respawns+' respawns').join(', '));
}
