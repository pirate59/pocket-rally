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
// Adventurous pieces: corkscrew geometry, choke and split width profiles.
const cork=layoutCourse(['corkscrew L']);assert(near(cork.cursor.x,0)&&near(cork.cursor.z,0)&&near(cork.cursor.y,6)&&near(Math.abs(Math.sin(cork.cursor.heading)),0),'a corkscrew returns to its entry point one deck higher, same heading');
const choke=layoutCourse(['straight 30 choke=3.6']),widths=choke.points.map(p=>p[3]);assert(near(Math.min(...widths),3.6,.01)&&near(widths[0],6.8)&&near(widths.at(-1),6.8,.2),'choke narrows to its width mid-straight and tapers back out');
const split=layoutCourse(['straight 40 split=1.2']);assert(near(Math.max(...split.points.map(p=>p[3])),2*4.42+1.2,.01)&&near(Math.max(...split.points.map(p=>p[4])),.6),'split widens into two lanes around a 1.2 island');
assert(layoutCourse(['L90 sweeper']).points.every(p=>p[3]===6.8&&p[4]===0),'plain pieces carry the full width and no island');
assert.deepEqual(parsePiece('corkscrew R radius=12 rise=6 turns=1'),{kind:'corkscrew',side:-1,radius:12,turns:1,rise:6});
assert.deepEqual(parsePiece('corkscrew L down'),{kind:'corkscrew',side:1,radius:12,turns:1,down:true});
const down=layoutCourse(['straight 20 rise=6','straight 12','corkscrew L down','straight 12']);assert(near(down.cursor.y,0)&&near(down.points[down.points.length-1][1],0,.01),'a corkscrew down descends one deck');
const loop=layoutCourse(['loop L']);assert(near(loop.cursor.x,7.8)&&near(loop.cursor.z,0)&&near(loop.cursor.heading,0),'a loop exits beside its entry at the same heading');
assert(near(Math.max(...loop.points.map(p=>p[1])),16,.01)&&loop.points.every(p=>p[5]===1),'a loop is 2R tall and entirely rail');
const top=loop.points[Math.floor(loop.points.length/2)];assert(near(top[7],-1,.01),'the up vector points down at the top of the loop');
assert(layoutCourse(['loop R']).cursor.x<-7.7,'a right loop drifts right');
console.log('PASS: turn, hairpin and straight geometry, corkscrew, choke, split, text piece parsing');

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
const problems=spec=>validateLayout(layoutCourse(spec)).problems;
assert(problems(['straight 20','corkscrew L','straight 20 rise=-6']).some(t=>t.includes('exit deck passes over')),'descending straight off a corkscrew is rejected');
assert(problems(['straight 20 rise=6','straight 4','corkscrew L down','straight 12']).some(t=>t.includes('entry deck passes over')),'a short deck into a corkscrew down is rejected');
assert(problems(['straight 10','loop L','straight 12']).some(t=>t.includes('before it')),'a loop needs its approach straight');
assert(problems(['straight 24','loop L','L90 sweeper']).some(t=>t.includes('after it')),'a loop needs its exit straight');
assert(problems(['straight 24','loop L radius=4','straight 12']).some(t=>t.includes('radius of at least')),'a tiny loop is rejected');
assert(problems(['straight 20','corkscrew L rise=3']).some(t=>t.includes('each turn must climb')),'a low corkscrew is rejected');
assert(problems(['straight 20','corkscrew L radius=5']).some(t=>t.includes('too tight')),'a tight corkscrew is rejected');
assert(problems(['straight 30 choke=2']).some(t=>t.includes('narrower than a car')),'a choke narrower than a car is rejected');
assert(problems(['straight 30 split=1.2 lane=2']).some(t=>t.includes('too narrow')),'narrow split lanes are rejected');
assert(problems(['straight 10 split=1.2']).some(t=>t.includes('at least 24')),'a short split straight is rejected');
assert(problems(['straight 6','straight 24 split=1.2','L90 sweeper','L90 sweeper','straight 30','L90 sweeper','L90 sweeper']).some(t=>t.includes('after the start line')),'a split right after the grid is rejected');
assert(problems(['straight 40','L90 sweeper','L90 sweeper','straight 30 jump','straight 24 split=1.2','L90 sweeper','L90 sweeper']).some(t=>t.includes('a split island')),'landing a jump into a split is rejected');
console.log('PASS: closure, overlap, bridge, elevation, corkscrew, choke and split validation');

// Sequencing rules: problems block, warnings advise.
const problemsOf=spec=>validateLayout(layoutCourse(spec)).problems,warningsOf=spec=>validateLayout(layoutCourse(spec)).warnings;
const ring=(first,...rest)=>[first,...rest,'L90 sweeper','L90 sweeper','straight 40','L90 sweeper','L90 sweeper','straight 10'];
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 24 jump','L90 sharp','L90 sharp','straight 16']).some(t=>t.includes('catch them mid-air')),'landing inside a turn is an error');
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 36 jump','L90 sharp','L90 sharp','straight 4']).some(t=>t.includes('harsh turn')),'harsh turn within 30 units of a jump is an error');
assert(warningsOf(['straight 40','L90 sweeper','L90 sweeper','straight 36 jump','straight 4','L90 sweeper','L90 sweeper']).some(t=>t.includes('safer')),'sweeper within 30 units is only a warning');
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 36 jump','straight 4','L90 sweeper','L90 sweeper']).length===0,'…and not an error');
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 20 jump','straight 10 rise=2','straight 10 rise=-2','L90 sweeper','L90 sweeper']).some(t=>t.includes('(a slope)')),'landing on a slope is an error');
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 40 jump rise=3','L90 sweeper','L90 sweeper','straight 20 rise=-3']).some(t=>t.includes('must be flat')),'a sloped jump straight is an error');
assert(problemsOf(['straight 40','L90 sweeper','L90 sweeper','straight 40 jump=8','L90 sweeper','L90 sweeper']).some(t=>t.includes('at least '+JUMP_CREST)),'crest too early for the ramp');
assert(problemsOf(['straight 20 jump','L90 sweeper','L90 sweeper','straight 40','L90 sweeper','L90 sweeper','straight 20']).some(t=>t.includes('after the start line')),'crest just after the grid is an error');
assert(problemsOf(['straight 40 jump','straight 20 jump','L90 sweeper','L90 sweeper','straight 60','L90 sweeper','L90 sweeper']).some(t=>t.includes('crests are')),'jumps too close together');
assert(problemsOf(['L90 sweeper','straight 40','L90 sweeper','L90 sweeper','straight 40','L90 sweeper']).some(t=>t.includes('start on a straight')),'lap must start on a straight');
assert(warningsOf(['straight 40','L90 sweeper','L90 sweeper','straight 40','L90 sweeper','L90 sweeper']).some(t=>t.includes('grid sits')),'grid on a bend is a warning');
assert(warningsOf(['straight 40','R90 sharp','L90 sharp','straight 40','hairpin R round','straight 40','hairpin L round','straight 40','hairpin L round','straight 4']).some(t=>t.includes('opposite harsh turns')),'snap chicane is a warning');
for(const [key,example] of Object.entries(EXAMPLES)){const width=example.width??(example.grand?9:6.8);
 const v=validateLayout(layoutCourse(example.spec,{width}),{width});
 assert(v.ok&&v.warnings.length===0,key+' must be problem- and warning-free: '+[...v.problems,...v.warnings].join('; '));}
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
 if(course.grand){const e=course.layout.extent,[boardX,boardZ]=course.mapSize;
  assert(course.mapScale===3&&course.width===9,key+' is a grand tour course');
  // The beach board reaches past its bounds into the shoreline and dunes; every
  // other board is a flat rectangle, so the road and its barriers must fit inside it.
  if(course.base===3)assert(e.minX>=-160&&e.maxX<=195&&e.minZ>=-105&&e.maxZ<=235,key+' stays inside the grand beach interior and shoreline');
  else assert(Math.max(-e.minX,e.maxX)+course.width/2<=boardX/2-4&&Math.max(-e.minZ,e.maxZ)+course.width/2<=boardZ/2-4,key+' stays inside the '+boardX+'x'+boardZ+' grand board');
 }
 else{const e=course.layout.extent;assert(Math.max(-e.minX,e.maxX)<=44&&Math.max(-e.minZ,e.maxZ)<=31,key+' fits the standard board');}
 if(example.spec.some(t=>t.includes('jump')))assert(track.nodes.some(p=>p.gap)&&track.nodes.some(p=>p.ramp),key+' has a jump gap and ramp');
 if(course.validation.crossings.length){assert(track.nodes.some(p=>p.y>4),key+' has a raised deck');const c=course.validation.crossings[0];assert(c.upper-c.lower>=BRIDGE_CLEARANCE);}
 if(example.spec.some(t=>t.includes('split'))){assert(track.barriers.some(w=>w.island),key+' has island walls');assert(Math.max(...track.nodes.map(p=>p.width))>course.width+2,key+' widens at the split');}
 if(example.spec.some(t=>t.includes('choke')))assert(Math.min(...track.nodes.map(p=>p.width))<course.width-2,key+' narrows at the choke');
 if(example.spec.some(t=>t.startsWith('loop'))){const rail=track.nodes.filter(p=>p.rail);assert(rail.length>50&&Math.max(...rail.map(p=>p.y))>15&&rail.every(p=>Number.isFinite(p.t3x+p.t3y+p.t3z+p.tx+p.tz)),key+' has finite 3D rail frames up to 2R');assert(track.barriers.every(w=>!track.nodes[w.index].rail),key+' has no walls on the rail');}
 const race=new Race(track);race.countdown=0;race.cars[0].finish=0;let loops=0,top=0;
 for(let i=0;i<900*90&&!race.cars.slice(1).every(c=>c.finish!==null);i++){race.step(1/90);for(const c of race.cars.slice(1)){if(c.rail&&!c.wasRail)loops++;c.wasRail=c.rail;if(c.rail)top=Math.max(top,c.y);}}
 if(example.spec.some(t=>t.startsWith('loop'))){const count=example.spec.filter(t=>t.startsWith('loop')).length;assert.equal(loops,count*3*3,key+': every rival rides every loop on every lap');assert(top>15,key+': cars reach the top of the loop');}
 // Rivals hold about 20 units/s, so a lap should track the length of the road;
 // the outer band keeps a grand tour between a sprint and a slog either way.
 if(course.grand)for(const c of race.cars.slice(1)){const lap=c.finish/3;
  assert(lap>=45&&lap<=180,key+': a grand tour lap must take 45–180 s, got '+lap.toFixed(0));
  assert(lap<=track.length/20*1.35,key+': rivals should average close to 20 units/s, got '+(track.length/lap).toFixed(1));}
 const rivals=race.cars.slice(1);assert(rivals.every(c=>c.finish!==null),key+': CPU rivals must finish three laps');
 console.log('PASS:',key,'·',course.name,'·',track.length.toFixed(0),'units ·',track.barriers.length,'wall spans · rivals',rivals.map(c=>c.finish.toFixed(1)+'s/'+c.respawns+' respawns').join(', '));
}
