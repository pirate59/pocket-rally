// Course building blocks for imagined (non-reference) courses.
//
// A course is a chain of pieces. Each piece starts at the cursor left by the
// previous piece, traces its centreline and advances the cursor, so pieces
// always connect end-to-end. Build order is enforced in stages: lay the pieces
// out, validate the loop closes and never overlaps itself at one level, then
// add barriers, then decorations. See docs/course-pieces.md for the catalogue.
//
// Conventions match race.mjs: forward is (sin heading, cos heading), the
// driver's left is (cos heading, -sin heading) (the side=+1 barrier offset),
// and a left turn increases the heading. Heights are absolute world units and
// makeTrack clamps them at zero, so ground level is y=0.
export const RADIUS={sharp:7,sweeper:14,hairpin:6};
export const STEP=.25;
export const TURN_ANGLES=[45,90,135];
export const BRIDGE_CLEARANCE=4;
// Jump geometry from makeTrack / race.mjs: the ramp climbs 2.1 units over the
// 12 units before the crest, then a 3.4 unit gap. Leaving the crest at the
// 20 unit/s cap lands ~16 units on; boosting at 29 lands ~28 units on.
export const JUMP_CREST=14;        // default crest distance from the straight's start
export const JUMP_LANDING_MIN=18;  // flat straight needed after the crest (error below)
export const JUMP_LANDING_SAFE=30; // covers a boosted landing (warning below)
export const START_STRAIGHT=10;    // the grid sits in the last few units before the start
export const LAP_LEAD_IN=20;       // no crest this close to the start: cars launch into it
const ease=t=>t*t*(3-2*t);
const forward=h=>({x:Math.sin(h),z:Math.cos(h)});
const leftOf=h=>({x:Math.cos(h),z:-Math.sin(h)});
const wrapAngle=v=>Math.atan2(Math.sin(v),Math.cos(v));
const sideOf=v=>v===-1||v===1?v:/^r/i.test(String(v))?-1:1;

// ---- Piece catalogue -------------------------------------------------------
export const PIECES={
 straight:(length,options={})=>({kind:'straight',length,...options}),
 turn:(angle,side,profile='sharp',options={})=>{if(!TURN_ANGLES.includes(angle))throw new Error('Turn angle must be one of '+TURN_ANGLES.join('/'));if(!(profile in RADIUS)||profile==='hairpin')throw new Error('Turn profile must be sharp or sweeper');return{kind:'turn',angle,side:sideOf(side),profile,...options};},
 hairpin:(side,shape='round',options={})=>{if(shape!=='round'&&shape!=='square')throw new Error('Hairpin shape must be round or square');return{kind:'hairpin',side:sideOf(side),shape,...options};},
 // A climbing helix that passes over its own entry: one full turn by default.
 corkscrew:(side,options={})=>({kind:'corkscrew',side:sideOf(side),radius:CORKSCREW.radius,turns:1,...options}),
 loop:(side,options={})=>({kind:'loop',side:sideOf(side),radius:LOOP.radius,...options})
};
export const CORKSCREW={radius:12,risePerTurn:6};
// Width features on straights: a choke narrows the road to `choke` units through
// its middle; a split widens it into two lanes of `lane` units around a centre
// island `split` units wide, with a barrier down the island.
export const CHOKE={min:2.6,taper:.3};
// A vertical loop is a rail section: race.mjs carries cars along it (sticky
// road, no falling off) and game.mjs draws it as a 3D ribbon. The circle sits
// in the heading plane centred `radius` above the entry, so its back half
// overhangs the approach road; the ribbon drifts one road width sideways over
// the turn so the exit runs beside the entry instead of on top of it.
export const LOOP={radius:8,minRadius:6,approach:20,exit:12};
export const SPLIT={island:1.2,minLane:3,taper:.25};
// Compact text form so a course can be written as a list of lines:
//   "straight 24"  "straight 26 jump"  "L90 sharp"  "R45 sweeper rise=3"
//   "hairpin L round"  "hairpin R square gap=6"  "R135 sharp runoff=1.2"
export function parsePiece(text){
 if(typeof text!=='string')return text;
 const words=text.trim().split(/\s+/),options={};
 for(const w of words.slice(1)){const m=w.match(/^([a-z]+)=(-?[\d.]+)$/i);if(m)options[m[1]]=Number(m[2]);else if(w==='jump')options.jump=true;else if(w==='down')options.down=true;}
 const head=words[0].toLowerCase();
 if(head==='straight'||head==='s')return PIECES.straight(Number(words[1]),options);
 if(head==='hairpin'||head==='h')return PIECES.hairpin(words[1],(words[2]||'round').toLowerCase(),options);
 if(head==='corkscrew'||head==='c')return PIECES.corkscrew(words[1],options);
 if(head==='loop')return PIECES.loop(words[1],options);
 const turn=head.match(/^([lr])(\d+)$/);
 if(turn)return PIECES.turn(Number(turn[2]),turn[1],(words[1]||'sharp').toLowerCase(),options);
 throw new Error('Unknown piece: '+text);
}

// ---- Tracing ---------------------------------------------------------------
// Points are [x,y,z] plus optional [width,island] so makeTrack interpolates
// the road profile along with the position.
const plateau=(t,taper)=>t<taper?ease(t/taper):t>1-taper?ease((1-t)/taper):1;
function traceStraight(c,{length,rise=0,choke,split,lane,width}){
 if(!(length>0))throw new Error('Straight needs a positive length');
 const n=Math.max(1,Math.ceil(length/STEP)),f=forward(c.heading),points=[];
 for(let i=0;i<n;i++){const t=i/n,p=[c.x+f.x*length*t,c.y+rise*ease(t),c.z+f.z*length*t];
  if(choke){const k=plateau(t,CHOKE.taper);p.push(width+(choke-width)*k,0);}
  else if(split){const k=plateau(t,SPLIT.taper),lanes=2*lane+split;p.push(width+(lanes-width)*k,split/2*k);}
  points.push(p);}
 return{points,cursor:{x:c.x+f.x*length,z:c.z+f.z*length,y:c.y+rise,heading:c.heading},length};
}
function traceArc(c,{angle,side,radius,rise=0}){
 const theta=angle*Math.PI/180,length=radius*theta,n=Math.max(2,Math.ceil(length/STEP)),l=leftOf(c.heading),cx=c.x+side*radius*l.x,cz=c.z+side*radius*l.z,points=[];
 const at=(t)=>{const h=c.heading+side*theta*t,lt=leftOf(h);return{x:cx-side*radius*lt.x,z:cz-side*radius*lt.z,heading:h};};
 for(let i=0;i<n;i++){const t=i/n,p=at(t);points.push([p.x,c.y+rise*ease(t),p.z]);}
 const end=at(1);return{points,cursor:{...end,y:c.y+rise},length};
}
// Points along a loop carry rail=1 and the car's up vector, which points at
// the circle centre: (0,1,0) at the bottom, (0,-1,0) upside down at the top.
function traceLoop(c,{radius,side,drift,width}){
 const n=Math.max(8,Math.ceil(2*Math.PI*radius/STEP)),f=forward(c.heading),l=leftOf(c.heading),points=[];
 for(let i=0;i<n;i++){const t=i/n,phi=2*Math.PI*t,k=ease(t)*drift*side,sin=Math.sin(phi),cos=Math.cos(phi);
  points.push([c.x+f.x*radius*sin+l.x*k,c.y+radius*(1-cos),c.z+f.z*radius*sin+l.z*k,width,0,1,-f.x*sin,cos,-f.z*sin]);}
 return{points,cursor:{x:c.x+l.x*drift*side,z:c.z+l.z*drift*side,y:c.y,heading:c.heading},length:2*Math.PI*radius};
}
// Expand catalogue pieces into straight/arc primitives. A hairpin is 180° of
// turning: one semicircle when round, or two 90° corners with a short straight
// between them when square, so the tip is squared off instead of curved.
function primitives(piece){
 if(piece.kind==='straight')return[{...piece,lane:piece.lane??Math.max(SPLIT.minLane,(piece.width??0)*.65)}];
 if(piece.kind==='corkscrew')return[{kind:'arc',angle:360*(piece.turns??1),side:piece.side,radius:piece.radius??CORKSCREW.radius,rise:piece.rise??(piece.down?-1:1)*CORKSCREW.risePerTurn*(piece.turns??1)}];
 if(piece.kind==='loop')return[{kind:'loop',side:piece.side,radius:piece.radius??LOOP.radius,drift:piece.drift??piece.width+1,width:piece.width}];
 if(piece.kind==='turn')return[{kind:'arc',angle:piece.angle,side:piece.side,radius:piece.radius??RADIUS[piece.profile],rise:piece.rise??0}];
 if(piece.kind==='hairpin'){
  const radius=piece.radius??RADIUS.hairpin,rise=piece.rise??0;
  if(piece.shape==='round')return[{kind:'arc',angle:180,side:piece.side,radius,rise}];
  const gap=piece.gap??4,arc=radius*Math.PI/2,total=arc*2+gap;
  return[{kind:'arc',angle:90,side:piece.side,radius,rise:rise*arc/total},{kind:'straight',length:gap,rise:rise*gap/total},{kind:'arc',angle:90,side:piece.side,radius,rise:rise*arc/total}];
 }
 throw new Error('Unknown piece kind: '+piece.kind);
}
export function describePiece(piece){
 const side=piece.side===1?'left':'right';
 if(piece.kind==='straight')return `straight ${piece.length}${piece.jump?' (jump)':piece.choke?' (choke)':piece.split?' (split)':''}`;
 if(piece.kind==='corkscrew')return `${side} corkscrew ${(piece.rise??(piece.down?-1:1))<0?'down':'up'}`;
 if(piece.kind==='loop')return `${side} loop`;
 return piece.kind==='turn'?`${piece.angle}° ${side} ${piece.profile}`:`${piece.shape} ${side} hairpin`;
}

// ---- Stage 1: layout -------------------------------------------------------
export function layoutCourse(spec,{start={x:0,z:0,y:0,heading:0},width=6.8}={}){
 const pieces=spec.map(parsePiece),points=[],ranges=[],jumpAnchors=[];let cursor={...start},length=0;
 pieces.forEach((piece,index)=>{
  const from=points.length,begin={...cursor};let pieceLength=0;
  for(const prim of primitives({...piece,width})){const traced=prim.kind==='straight'?traceStraight(cursor,prim):prim.kind==='loop'?traceLoop(cursor,prim):traceArc(cursor,prim);for(const q of traced.points){if(q.length<5)q.push(width,0);if(q.length<9)q.push(0,0,1,0);points.push(q);}cursor=traced.cursor;pieceLength+=traced.length;}
  if(piece.jump){const f=forward(begin.heading),crest=typeof piece.jump==='number'?piece.jump:JUMP_CREST;jumpAnchors.push([begin.x+f.x*crest,begin.z+f.z*crest]);}
  ranges.push({index,piece,label:describePiece(piece),from,to:points.length,start:begin,end:{...cursor},length:pieceLength,u0:length,u1:length+pieceLength});
  length+=pieceLength;
 });
 for(const r of ranges){r.u0/=length;r.u1/=length;}
 // The gap is also given in the end cursor's own frame (ahead / to the left /
 // turn still needed) so the next piece to add can be reasoned about directly.
 const f=forward(cursor.heading),l=leftOf(cursor.heading),gx=start.x-cursor.x,gz=start.z-cursor.z,turn=wrapAngle(start.heading-cursor.heading);
 const closure={distance:Math.hypot(gx,gz),heading:Math.abs(turn),rise:cursor.y-start.y,ahead:gx*f.x+gz*f.z,left:gx*l.x+gz*l.z,turn:turn*180/Math.PI};
 const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]);
 return{pieces:ranges,points,cursor,start,length,width,jumpAnchors,closure,extent:{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)}};
}

// Shift a layout so the board centre sits at the origin, which the bounds
// check, board and decoration builders all assume.
export function recentreLayout(layout,centre={x:0,z:0}){
 const e=layout.extent,dx=centre.x-(e.minX+e.maxX)/2,dz=centre.z-(e.minZ+e.maxZ)/2,move=c=>({...c,x:c.x+dx,z:c.z+dz});
 return{...layout,points:layout.points.map(([x,y,z,...profile])=>[x+dx,y,z+dz,...profile]),jumpAnchors:layout.jumpAnchors.map(([x,z])=>[x+dx,z+dz]),cursor:move(layout.cursor),start:move(layout.start),pieces:layout.pieces.map(r=>({...r,start:move(r.start),end:move(r.end)})),extent:{minX:e.minX+dx,maxX:e.maxX+dx,minZ:e.minZ+dz,maxZ:e.maxZ+dz}};
}

// ---- Stage 2: validation ---------------------------------------------------
// The loop must return to its start, and any place the road meets itself must
// be a bridge (clear vertical separation), never a same-level overlap.
export function validateLayout(layout,{width=6.8,tolerance=.25,headingTolerance=.02}={}){
 const problems=[],notes=[],{closure,points,pieces}=layout;
 if(closure.distance>tolerance)problems.push(`Loop does not close: end is ${closure.distance.toFixed(2)} units from the start`);
 if(closure.heading>headingTolerance)problems.push(`Loop does not close: end heading is off by ${(closure.heading*180/Math.PI).toFixed(1)}°`);
 if(Math.abs(closure.rise)>tolerance)problems.push(`Loop does not close: end is ${closure.rise.toFixed(2)} units ${closure.rise>0?'above':'below'} the start`);
 if(points.some(p=>p[1]<-1e-6))problems.push('Elevation drops below ground level (y<0); raise the course or reduce the descent');
 for(const r of pieces){
  const q=r.piece;if(Math.abs(q.rise||0)>r.length*.35)problems.push(`Piece ${r.index} (${r.label}): rise of ${q.rise} is too steep for its ${r.length.toFixed(1)} unit length`);
  if(q.kind==='corkscrew'){const turns=q.turns??1,rise=q.rise??(q.down?-1:1)*CORKSCREW.risePerTurn*turns,radius=q.radius??CORKSCREW.radius;
   if(Math.abs(rise)/turns<BRIDGE_CLEARANCE+1)problems.push(`Piece ${r.index} (${r.label}): each turn must ${rise<0?'drop':'climb'} at least ${BRIDGE_CLEARANCE+1} units to clear the deck ${rise<0?'above':'below'} (rise=${rise} over ${turns} turn${turns===1?'':'s'})`);
   if(radius<width/2+2.5)problems.push(`Piece ${r.index} (${r.label}): radius ${radius} is too tight for a ${width} wide road (need ${(width/2+2.5).toFixed(1)})`);}
  if(q.choke!==undefined){if(q.kind!=='straight')problems.push(`Piece ${r.index} (${r.label}): chokes belong on straights`);else{if(q.choke<CHOKE.min)problems.push(`Piece ${r.index} (${r.label}): a choke of ${q.choke} is narrower than a car; keep it at least ${CHOKE.min}`);if(q.choke>=width)problems.push(`Piece ${r.index} (${r.label}): a choke must be narrower than the ${width} road`);if(q.length<16)problems.push(`Piece ${r.index} (${r.label}): a choke straight needs at least 16 units to taper in and out`);}}
  if(q.split!==undefined){const lane=q.lane??Math.max(SPLIT.minLane,width*.65);if(q.kind!=='straight')problems.push(`Piece ${r.index} (${r.label}): splits belong on straights`);else{if(lane<SPLIT.minLane)problems.push(`Piece ${r.index} (${r.label}): split lanes of ${lane} are too narrow; keep them at least ${SPLIT.minLane}`);if(q.split<.8)problems.push(`Piece ${r.index} (${r.label}): the island must be at least 0.8 wide to hold its barrier`);if(q.length<24)problems.push(`Piece ${r.index} (${r.label}): a split straight needs at least 24 units to widen, divide and rejoin`);}}
  if(q.kind==='loop'){const radius=q.radius??LOOP.radius;if(radius<LOOP.minRadius)problems.push(`Piece ${r.index} (${r.label}): a loop needs a radius of at least ${LOOP.minRadius} so the top clears cars at the bottom`);if(q.rise)problems.push(`Piece ${r.index} (${r.label}): loops cannot rise; climb before or after`);}
  if(q.jump&&(q.choke!==undefined||q.split!==undefined))problems.push(`Piece ${r.index} (${r.label}): a jump straight cannot also choke or split`);
 }
 const rules=checkRules(layout);problems.push(...rules.problems);const warnings=rules.warnings;
 // Coarse samples keep the pairwise sweep cheap; the road is only ~width wide.
 const stride=Math.max(1,Math.round(1/STEP)),samples=[];for(let i=0;i<points.length;i+=stride)samples.push({i,x:points[i][0],y:points[i][1],z:points[i][2],rail:points[i][5]>.5});
 const n=samples.length,skip=Math.ceil((width*1.5)/(STEP*stride)),crossings=[],overlaps=[],pieceAt=i=>{const r=pieces.find(r=>i>=r.from&&i<r.to);return r?`piece ${r.index} (${r.label})`:'?';};
 for(let a=0;a<n;a++)for(let b=a+skip;b<n;b++){
  if(n-b+a<skip)continue;
  const p=samples[a],q=samples[b];if(p.rail||q.rail)continue;const d=Math.hypot(p.x-q.x,p.z-q.z);if(d>=width+.2)continue;
  const dy=Math.abs(p.y-q.y);
  if(dy>=BRIDGE_CLEARANCE){if(!crossings.some(c=>Math.hypot(c.x-p.x,c.z-p.z)<width*2))crossings.push({x:p.x,z:p.z,lower:Math.min(p.y,q.y),upper:Math.max(p.y,q.y)});continue;}
  const found={x:p.x,z:p.z,distance:d,dy,pieces:[pieceAt(p.i),pieceAt(q.i)]},cluster=overlaps.findIndex(o=>Math.hypot(o.x-p.x,o.z-p.z)<width*2);
  if(cluster<0)overlaps.push(found);else if(d<overlaps[cluster].distance)overlaps[cluster]=found;
 }
 for(const o of overlaps)problems.push(`Road meets itself at the same level near (${o.x.toFixed(1)}, ${o.z.toFixed(1)}): ${o.pieces[0]} and ${o.pieces[1]} are ${o.distance.toFixed(1)} apart with ${o.dy.toFixed(1)} height difference (a bridge needs ${BRIDGE_CLEARANCE})`);
 for(const c of crossings)notes.push(`Bridge at (${c.x.toFixed(1)}, ${c.z.toFixed(1)}): deck ${c.upper.toFixed(1)} over ${c.lower.toFixed(1)}`);
 return{ok:problems.length===0,problems,warnings,notes,crossings,overlaps};
}

// ---- Sequencing rules -------------------------------------------------------
// Problems block the build; warnings are advisory and returned alongside.
const isHarsh=piece=>piece.kind==='hairpin'||piece.kind==='corkscrew'||piece.kind==='loop'||(piece.kind==='turn'&&piece.profile==='sharp'&&piece.angle>=90);
const isFlatStraight=piece=>piece.kind==='straight'&&!(piece.rise||0)&&piece.choke===undefined&&piece.split===undefined;
const name=r=>`piece ${r.index} (${r.label})`;
export function checkRules(layout){
 const problems=[],warnings=[],pieces=layout.pieces,n=pieces.length,at=i=>pieces[(i%n+n)%n];
 const crestOf=r=>typeof r.piece.jump==='number'?r.piece.jump:JUMP_CREST;
 // Flat straight run (this piece's remainder plus following flat straights)
 // before the next piece that is not a flat straight.
 const runwayAfter=(index,from)=>{let run=at(index).length-from,k=index+1;while(k<index+n&&isFlatStraight(at(k).piece)){run+=at(k).length;k++;}return{run,next:at(k)};};
 const jumps=pieces.filter(r=>r.piece.jump);
 for(const r of jumps){
  if(r.piece.kind!=='straight'){problems.push(`${name(r)}: jumps belong on straights`);continue;}
  if(r.piece.rise)problems.push(`${name(r)}: a jump straight must be flat (it has rise=${r.piece.rise})`);
  const crest=crestOf(r);
  if(crest<JUMP_CREST)problems.push(`${name(r)}: the crest must be at least ${JUMP_CREST} units into the straight for the ramp (jump=${crest})`);
  if(crest>r.length-4)problems.push(`${name(r)}: the crest at ${crest} is past the end of a ${r.length} unit straight`);
  const {run,next}=runwayAfter(r.index,crest),harsh=isHarsh(next.piece);
  if(next.piece.kind==='straight'&&run<JUMP_LANDING_SAFE)problems.push(`${name(r)}: the landing runs into ${name(next)} (${next.piece.rise?'a slope':next.piece.choke!==undefined?'a choke':'a split island'}); keep the ${JUMP_LANDING_SAFE} units after the crest flat and full width`);
  else if(run<JUMP_LANDING_MIN)problems.push(`${name(r)}: only ${run.toFixed(1)} units of straight after the crest; cars land ${JUMP_LANDING_MIN}+ units on, so ${name(next)} would catch them mid-air`);
  else if(run<JUMP_LANDING_SAFE&&harsh)problems.push(`${name(r)}: ${name(next)} is a harsh turn only ${run.toFixed(1)} units after the crest; boosted cars land ~28 units on, so allow ${JUMP_LANDING_SAFE} or use a sweeper`);
  else if(run<JUMP_LANDING_SAFE)warnings.push(`${name(r)}: ${run.toFixed(1)} units of landing before ${name(next)}; boosted jumps land ~28 units on, so ${JUMP_LANDING_SAFE} is safer`);
 }
 for(let i=0;i<jumps.length&&jumps.length>1;i++){const a=jumps[i],b=jumps[(i+1)%jumps.length],gap=((b.u0-a.u0+1)%1)*layout.length+crestOf(b)-crestOf(a);if(gap<JUMP_CREST+JUMP_LANDING_SAFE)problems.push(`${name(a)} and ${name(b)}: crests are ${gap.toFixed(1)} units apart; a landing plus the next ramp needs ${JUMP_CREST+JUMP_LANDING_SAFE}`);}
 // Start line: cars launch from a grid just before piece 0.
 const first=pieces[0];
 if(first.piece.kind!=='straight')problems.push(`${name(first)}: the lap must start on a straight, the grid launches straight ahead`);
 for(const r of jumps){const crestAt=r.u0*layout.length+crestOf(r);if(crestAt<LAP_LEAD_IN)problems.push(`${name(r)}: the crest is only ${crestAt.toFixed(1)} units after the start line; cars leave the grid straight into the ramp (need ${LAP_LEAD_IN})`);}
 for(const r of pieces){if(r.piece.choke===undefined&&r.piece.split===undefined)continue;const startAt=r.u0*layout.length;if(startAt<LAP_LEAD_IN)problems.push(`${name(r)}: it begins only ${startAt.toFixed(1)} units after the start line; the grid needs ${LAP_LEAD_IN} units of plain road to get moving`);}
 let tail=0,k=n-1;while(k>=0&&isFlatStraight(at(k).piece)&&tail<START_STRAIGHT){tail+=at(k).length;k--;}
 if(tail<START_STRAIGHT)warnings.push(`the grid sits in the last ${START_STRAIGHT} units of the lap but ${name(at(k))} is there; end the lap with a flat straight so cars start on level, straight road`);
 for(let i=0;i<n;i++){const r=at(i),next=at(i+1),prev=at(i-1);
  if(r.piece.kind==='corkscrew'){const radius=r.piece.radius??CORKSCREW.radius,down=(r.piece.rise??(r.piece.down?-1:1))<0;
   if(!down&&(!isFlatStraight(next.piece)||next.length<radius))problems.push(`${name(r)}: the exit deck passes over the start of the helix, so follow it with a level plain straight of at least ${radius} units before descending or turning`);
   if(down&&(!isFlatStraight(prev.piece)||prev.length<radius))problems.push(`${name(r)}: the entry deck passes over the end of the helix, so lead into it with a level plain straight of at least ${radius} units`);}
  if(r.piece.kind==='loop'){const radius=r.piece.radius??LOOP.radius;
   if(!isFlatStraight(prev.piece)||prev.length<Math.max(LOOP.approach,radius+4))problems.push(`${name(r)}: a loop needs a level plain straight of at least ${Math.max(LOOP.approach,radius+4)} units before it (the back of the loop overhangs the approach by ${radius})`);
   if(!isFlatStraight(next.piece)||next.length<LOOP.exit)problems.push(`${name(r)}: a loop needs a level plain straight of at least ${LOOP.exit} units after it to settle the car`);}}
 for(let i=0;i<n;i++){const r=at(i),prev=at(i-1);if((r.piece.choke!==undefined||r.piece.split!==undefined)&&isHarsh(prev.piece))warnings.push(`${name(prev)} straight into ${name(r)}: cars are still gathering their line out of the turn; a short plain straight first is kinder`);}
 // Snap chicanes: opposite-direction harsh turns with nothing between them.
 for(let i=0;i<n;i++){const a=at(i),b=at(i+1);if(isHarsh(a.piece)&&isHarsh(b.piece)&&a.piece.side!==b.piece.side)warnings.push(`${name(a)} into ${name(b)}: opposite harsh turns with no straight between; add a short straight or use sweepers`);}
 return{problems,warnings};
}

// ---- Stage 3 and 4: barriers, then decorations ------------------------------
const THEMES={
 table:{deco:'table',type:'car',color:0xc49360,road:0x303d43},
 bath:{deco:'bath',type:'boat',color:0x258ee5,road:0x238bed},
 garden:{deco:'garden',type:'buggy',color:0x688849,road:0x755333},
 beach:{deco:'beach',type:'buggy',color:0xe0793f,road:0xdac697}
};
export function addBarriers(course,{offset=.34}={}){
 if(!course.layoutValid)throw new Error('Validate the layout before adding barriers');
 const pieces=course.layout.pieces,runoff=pieces.some(r=>r.piece.runoff);
 return{...course,walls:true,barrierOffset:offset,
  // Extra runoff on a piece widens the wall gap on the outside of that bend.
  barrierOffsetAt:runoff?(u,side)=>{const r=pieces.find(r=>u>=r.u0&&u<r.u1)||pieces.at(-1),extra=r.piece.runoff||0,outside=r.piece.side?side===-r.piece.side:true;return offset+(outside?extra:0);}:undefined};
}
export function addDecorations(course,{theme='table'}={}){
 if(!course.walls)throw new Error('Add barriers before decorations');
 if(!THEMES[theme])throw new Error('Unknown decoration theme: '+theme);
 return{...course,...THEMES[theme],decorated:true};
}

// Runs every stage in order and returns a course makeTrack accepts.
// `grand` builds a 3× grand-tour course: the wider road, the big themed board
// from grand-courses.mjs and its minimap scale. `centre` places the layout's
// centre at a board point (the grand beach interior is offset from the origin).
export function makeCourse(spec,{name='Imagined Circuit',tag='AI-BUILT CIRCUIT',desc='',tags=[],width,theme='table',barrierOffset,start,margin=5,recentre=true,centre={x:0,z:0},grand=false,hazard,hazardLabel,hazardAnchor}={}){
 width??=grand?9:6.8;barrierOffset??=grand?.18:.34;
 let layout=layoutCourse(spec,{start,width});if(recentre)layout=recentreLayout(layout,centre);const check=validateLayout(layout,{width});
 if(!check.ok)throw new Error('Course layout is not connected up:\n - '+check.problems.join('\n - '));
 // Bounds must cover the widest road (split lanes) plus recovery room.
 const e=layout.extent,edge=Math.max(...layout.points.map(p=>p[3]||width))/2+margin,halfX=Math.max(Math.abs(e.minX),Math.abs(e.maxX))+edge,halfZ=Math.max(Math.abs(e.minZ),Math.abs(e.maxZ))+edge,span=Math.max(halfX,halfZ)*2;
 let course={name,tag,desc,tags,revision:1,width,bounds:[halfX,halfZ],sampledPath:true,generated:true,jumpAnchors:layout.jumpAnchors,points:layout.points,layout,layoutValid:true,validation:check};
 if(grand){const base=GRAND_THEMES.indexOf(theme);if(base<0)throw new Error('Grand courses need a table, bath, garden or beach theme');Object.assign(course,{grand:true,base,mapScale:3,mapSize:GRAND_BOARDS[base],bounds:[GRAND_BOARDS[base][0]/2-4,GRAND_BOARDS[base][1]/2-4],extraJumps:[]});if(hazard)Object.assign(course,{hazard,hazardLabel,hazardAnchor});}
 else if(span>100)course.mapScale=Math.round(span*2.35/215*10)/10;
 course=addBarriers(course,{offset:barrierOffset});
 course=addDecorations(course,{theme});
 return course;
}
const GRAND_THEMES=['table','bath','garden','beach'],GRAND_BOARDS=[[282,204],[285,207],[285,207],[460,500]];

// Worked examples. Each closes exactly, passes validation and raises no
// sequencing warnings as written, so every lap starts on a flat straight.
export const EXAMPLES={
 paperclip:{name:'Paperclip Sprint',tag:'THE SQUARE HAIRPIN SPRINT',desc:'Two long straights. Two squared-off hairpins.',tags:['SQUARE HAIRPINS','TWIN STRAIGHTS'],theme:'table',
  spec:['straight 30','hairpin L square gap=8','straight 40','hairpin L square gap=8','straight 10']},
 bowtie:{name:'Bow Tie Flyover',tag:'THE CROSSOVER CIRCUIT',desc:'Climb the flyover, cross your own path,<br>then thread the 135° corners home.',tags:['FLYOVER','135° CORNERS'],theme:'garden',
  spec:['straight 24.5','L135 sharp','straight 14.5','L135 sharp','straight 13 rise=4.5','straight 8.5','straight 13 rise=-4.5','R135 sharp','straight 14.5','R135 sharp','straight 10']},
 proving:{name:'Proving Ground',tag:'THE PIECE SHOWCASE',desc:'Launch the long jump, sweep and snap through every corner,<br>then climb the flyover on the way home.',tags:['JUMP','ROUND HAIRPINS','FLYOVER'],theme:'beach',
  spec:['straight 16','R90 sweeper','straight 44 jump','R135 sharp','L45 sweeper','hairpin L round radius=8','straight 18','L90 sweeper rise=4.5','straight 41.85','L90 sharp','straight 7.65','straight 13 rise=-4.5','straight 22.5','hairpin R round','straight 10']},
 // Every adventurous piece on one table: a split road with a centre island,
 // a choke funnelling to 3.6 wide, and a corkscrew climb that crosses over
 // its own entry before a steep drop. Laid out along x (start heading +x).
 adventure:{name:'Adventure Park',tag:'THE STUNT CIRCUIT',desc:'Pick a lane past the island, squeeze the choke,<br>then spiral up the corkscrew and drop back down.',tags:['SPLIT ROAD','CHOKE POINT','CORKSCREW'],theme:'garden',start:{x:0,z:0,y:0,heading:Math.PI/2},
  spec:['straight 20','straight 24 split=1.2','straight 2','L90 sweeper radius=16','L90 sweeper radius=16','straight 10','straight 16 choke=3.6','straight 2','corkscrew L radius=10 rise=5.5','straight 10','straight 16 rise=-5.5','straight 2','L90 sweeper radius=16','L90 sweeper radius=16','straight 10']},
 // Two vertical loops, one on each leg, so both drift directions are covered.
 loops:{name:'Loop Land',tag:'THE ROLLER COASTER CIRCUIT',desc:'Hit the loop flat out and hang upside down,<br>then do it all again on the way back.',tags:['TWIN LOOPS','STICKY RAIL','UPSIDE DOWN'],theme:'table',start:{x:0,z:0,y:0,heading:Math.PI/2},
  spec:['straight 24','loop L','straight 16','L90 sweeper radius=16','L90 sweeper radius=16','straight 24','loop L','straight 26','L90 sweeper radius=16','L90 sweeper radius=16','straight 10']},
 // A grand tour on the 460×500 beach board (interior x −160…195, z −105…215,
 // shoreline water beyond, dunes below and to the right). ~2170 units, so a
 // CPU lap runs about 110 s. Larger radii suit the 9-wide road.
 sands:{name:'Shifting Sands Grand Tour',tag:'THE PIECE-BUILT GRAND TOUR',desc:'Launch the Bay Straight onto the pier over the water.<br>Thread the reef, then attack the dune switchbacks.',tags:['PIER FLYOVER','DUNE SWITCHBACKS','RIP CURRENT'],theme:'beach',grand:true,centre:{x:17,z:65},
  hazard:'stream',hazardLabel:'RIP CURRENT · SIDE PULL',hazardAnchor:[76,86],
  spec:['straight 40', 'straight 130 jump=100', 'L90 sweeper radius=36 rise=4.5', 'straight 110', 'straight 30 rise=-4.5', 'hairpin L round radius=18',
   'straight 20', 'R45 sharp radius=14', 'straight 20', 'L45 sharp radius=14', 'straight 10', 'R90 sweeper radius=30',
   'straight 100', 'R90 sweeper radius=30', 'straight 60', 'hairpin L round radius=16', 'straight 40', 'R135 sharp radius=14',
   'straight 30', 'L135 sharp radius=14', 'straight 252', 'L90 sweeper radius=30', 'straight 200', 'L90 sharp radius=14',
   'straight 20', 'L90 sharp radius=14', 'straight 150', 'hairpin R round radius=12', 'straight 150', 'hairpin L round radius=12',
   'straight 170', 'R90 sweeper radius=20', 'straight 12.53', 'R90 sweeper radius=20', 'straight 53.36']}
};
