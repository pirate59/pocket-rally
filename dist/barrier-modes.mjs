export const barrierMode=value=>value==='race'?'race':'bumper';
export const barrierRecordSuffix=(course,value)=>course.walls&&barrierMode(value)==='race'?'-barriers-race-v1':'';
export function withBarriers(course,value){
 const mode=barrierMode(value);
 return {...course,barrierMode:mode,extraRunoff:course.walls&&mode==='race'?Math.min(2.5,course.width*.3):0};
}
// Keep elevated decks and jump approaches protected. Real circuits retain
// their existing relative runoff: mountain walls stay tighter than straights.
export function extraRunoff(track,p,i,base){
 const co=track.course;if(!co.extraRunoff)return 0;
 const height=co.realWorld?p.y-(track.terrainHeight?.(p.x,p.z)??p.y):p.y;
 const deck=Math.max(0,Math.min(1,(.8-height)/.5));
 const junction=co.intersection?Math.max(0,Math.min(1,(Math.hypot(p.x,p.z)-(co.intersection.radius||co.width*.88)-3)/8)):1;
 const room=co.realWorld?Math.max(0,Math.min(1,(base-.28)/1.1)):1;
 return co.extraRunoff*deck*junction*room;
}
