// Hidden Valley Raceway, Darwin. A clockwise 2.870 km plan in site metres,
// interpreted from published circuit facts and lap guides (see
// docs/hidden-valley-sources.md). No survey data and no map artwork are used:
// the 1.1 km main straight, the tight Turn 1, the fast uphill esses, the
// Turn 5/6 braking switchback, the "Ducati" exit, the 8/9 kink, the run up to
// Turn 10 and the Turn 12-13-14 flicks are reproduced as shapes, not measurements.
export const hiddenValleyPoint=(x,z)=>({x:(x-482)*.275,z:(z-228)*.275});
const bump=(x,z,ax,az,h,rx,rz)=>h*Math.exp(-(((x-ax)/rx)**2+((z-az)/rz)**2));
// Relief interprets the driver guides: the esses climb away from Turn 1, Turn 6
// sits in its natural amphitheatre and the back leg rises to the Turn 10 crest.
export const hiddenValleyRelief=(x,z)=>.55
 +bump(x,z,139,-12,3.6,36,42)   // eastern rise through the esses to Turn 5
 -bump(x,z,124,31,1.5,21,17)    // the Turn 6 bowl
 +bump(x,z,-80,50,3,46,28)      // the Turn 10 crest
 +bump(x,z,-30,52,1,78,24)      // the climb along the back leg
 +.2*Math.sin(x/27)*Math.cos(z/18);
const route=[
 [250,0],[315,0],[380,0],[445,0],[509,0],[574,0],[639,0],
 [704,0],[769,0],[834,0],[899,0],[933,0],[946,0],[958,4],
 [969,11],[977,21],[981,33],[981,45],[978,66],[977,87],[983,107],
 [988,119],[992,131],[993,144],[991,159],[987,171],[984,183],[984,196],
 [988,211],[999,244],[1003,256],[1006,268],[1006,281],[1001,292],[993,302],
 [982,309],[970,312],[957,314],[946,319],[937,328],[933,341],[936,355],
 [942,366],[948,378],[951,390],[949,403],[943,414],[933,422],[919,427],
 [890,428],[825,429],[760,430],[695,431],[630,432],[566,433],[501,435],
 [479,435],[458,435],[436,431],[416,423],[397,414],[376,409],[334,409],
 [269,410],[230,411],[190,412],[152,421],[114,432],[98,438],[86,443],
 [74,449],[63,454],[50,456],[33,455],[21,451],[9,445],[-2,438],
 [-11,430],[-20,414],[-25,374],[-28,309],[-31,245],[-35,180],[-38,115],
 [-40,86],[-40,73],[-41,60],[-42,48],[-42,35],[-38,23],[-31,12],
 [-9,1],[55,0],[120,0],[185,0]
];
const anchors=[
 ['Main Straight',480,0],['Turn 1',976,19],['Turn 2 · Esses',978,92],['Turn 3 · Esses',993,146],
 ['Turn 4 · Esses',984,197],['Turn 5',997,298],['Turn 6 · The Bowl',934,336],['Turn 7 · Ducati',943,414],
 ['Turn 8',437,431],['Turn 9',379,409],['Turn 10',184,413],['Turn 11',102,436],
 ['Turn 12',38,456],['Turn 13',-18,419],['Turn 14',-25,7],['Main Straight',60,0]
];
// Generous sealed and gravel escapes sit outside the heavy braking zones; the
// pit wall and the back leg keep their barriers close to the racing surface.
const escapes=[[976,19,1],[997,298,1],[934,336,1],[184,413,-1],[102,436,-1],[-25,7,1]].map(([x,z,side])=>({...hiddenValleyPoint(x,z),side}));
export const HIDDEN_VALLEY={
 name:'Hidden Valley Raceway',id:'hidden-valley',group:3,realWorld:true,revision:1,
 tag:'REAL WORLD · DARWIN, NORTHERN TERRITORY',
 desc:'Hold it flat through the uphill esses.<br>Haul it up for the Turn 6 bowl, then chase the long straight.',
 tags:['14 TURNS · CLOCKWISE','1.1 KM MAIN STRAIGHT','2.870 KM CIRCUIT'],
 type:'car',color:0x9d8752,road:0x3d4244,width:6.2,mapScale:2.5,mapSize:[370,210],bounds:[180,100],
 overviewHeight:250,overviewWidth:470,minimapSize:[260,158],elevationScale:null,walls:true,jumpAnchors:[],offroadDrag:3.15,
 barrierOffsetAt:(u,side,p)=>{let extra=0;for(const a of escapes)if(a.side===side)extra=Math.max(extra,Math.exp(-((p.x-a.x)**2+(p.z-a.z)**2)/120));return(side===1?.6:.85)+extra*(side===1?2.6:2.2);},
 points:route.map(([x,z])=>{const p=hiddenValleyPoint(x,z);return[p.x,hiddenValleyRelief(p.x,p.z),p.z];})};
export function makeHiddenValleyTerrain(track){
 const segments=track.nodes.filter((_,i)=>i%4===0).map((a,i,list)=>({a,b:list[(i+1)%list.length]}));
 track.terrainDistance=(x,z)=>{let d=Infinity;for(const {a,b}of segments){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}return d;};
 track.terrainHeight=hiddenValleyRelief;
 track.sections=anchors.map(([name,x,z])=>{const a=hiddenValleyPoint(x,z);let index=0,d=Infinity;track.nodes.forEach((p,i)=>{const v=Math.hypot(p.x-a.x,p.z-a.z);if(v<d){d=v;index=i;}});return{name,index,...a};}).sort((a,b)=>a.index-b.index);
}
