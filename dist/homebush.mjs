// Historic 2009–2016 Sydney 500. Map-space tracing; see docs/homebush-sources.md.
export const homebushPoint=(x,z)=>({x:(x-465)*.42,z:(z-265)*.42});
// Interpretive relief: low rolling precinct, with stronger Dawn Fraser undulations.
export const homebushRelief=(x,z)=>1.25+.003*z+.2*Math.sin(x/75)+.48*Math.exp(-(((z-88)/13)**2))*Math.sin((x+105)/13);
const route=[
 [746,365],[745,300],[741,230],[740,150],[739,75],[737,55],[728,48],
 [670,48],[590,48],[510,48],[450,48],[425,50],
 [403,62],[382,67],[360,62],[340,76],
 [320,94],[277,133],[231,173],[204,198],[192,219],[189,238],[189,266],[190,285],
 [190,296],[185,303],[178,310],[176,319],
 [177,350],[178,395],[180,444],[184,464],[194,474],
 [230,476],[310,475],[390,475],[470,475],[491,472],[505,458],
 [510,436],[520,421],[538,416],[578,416],[626,416],[650,416],[669,426],
 [679,446],[688,466],[705,475],[725,473],[740,459],[747,437],[752,404]
];
const anchors=[['Australia Avenue · Pit Straight',746,365],['Turn 1 · Kevin Coombs Avenue',737,55],['Turn 2 · Olympic chicane',403,62],['Turn 3 · Olympic chicane',382,67],['Turn 4 · Edwin Flack Avenue',360,62],['Turn 5 · Edwin Flack sweep',192,219],['Turn 6 · Crossover',190,296],['Turn 7 · Crossover',178,310],['Turn 8 · Dawn Fraser Avenue',184,464],['Turn 9 · Showground Road',505,458],['Turn 10 · Murray Rose Avenue',520,421],['Turn 11 · Park Street',669,426],['Turn 12 · Park Street',688,466],['Turn 13 · Australia Avenue',740,459]];
export const HOMEBUSH={id:'homebush',name:'Sydney 500 · Homebush',group:3,realWorld:true,revision:2,tag:'REAL WORLD · SYDNEY OLYMPIC PARK · 2009–2016',desc:'Thread the Olympic Park chicanes.<br>Ride Dawn Fraser’s undulations past the stadiums.',tags:['13 TURNS · ANTI-CLOCKWISE','3.420 KM HISTORIC LAYOUT','APPROXIMATE ELEVATION'],type:'car',color:0x8b9b78,road:0x44494d,width:6.8,mapScale:3,mapSize:[310,240],bounds:[155,120],overviewHeight:285,overviewWidth:325,minimapSize:[210,163],elevationScale:null,walls:true,jumpAnchors:[],offroadDrag:3.2,barrierOffset:.5,points:route.map(([x,z])=>{const p=homebushPoint(x,z);return[p.x,homebushRelief(p.x,p.z),p.z]})};
export function makeHomebushTerrain(track){
 track.terrainHeight=homebushRelief;
 // Sample the same terrain function for road and scenery, including spline corners.
 track.nodes.forEach(p=>p.y=homebushRelief(p.x,p.z)+.13);
 track.nodes.forEach((p,i)=>{const a=track.nodes[(i+track.n-1)%track.n],b=track.nodes[(i+1)%track.n];p.slope=(b.y-a.y)/Math.hypot(b.x-a.x,b.z-a.z);});
 const segments=track.nodes.filter((_,i)=>i%4===0);
 track.terrainDistance=(x,z)=>{let d=Infinity;for(let i=0;i<segments.length;i++){const a=segments[i],b=segments[(i+1)%segments.length],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}return d;};
 track.sections=anchors.map(([name,x,z])=>{const a=homebushPoint(x,z);let index=0,d=Infinity;track.nodes.forEach((p,i)=>{const v=Math.hypot(p.x-a.x,p.z-a.z);if(v<d){index=i;d=v;}});return{name,index,...a};}).sort((a,b)=>a.index-b.index);
}
