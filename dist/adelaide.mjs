// Trace of the official 2024 Adelaide 500 event map, retaining its orientation.
// Gentle board relief is interpretive, not a surveyed elevation profile.
export const adelaidePoint=(x,z)=>({x:(x-1030)*.32,z:(z-650)*.32});
export const adelaideRelief=(x,z)=>.55+1.35*Math.max(0,Math.min(1,(170-z)/340))+.12*Math.sin(x/80)*Math.cos(z/120);
const route=[
 [1215,415],[1140,470],[1060,526],[1034,546],[1018,558],[1008,571],[1011,582],[1020,590],[1017,602],
 [990,635],[965,663],[957,678],[956,720],[955,810],[955,900],[955,948],[951,961],[939,967],
 [890,967],[835,967],[814,968],[805,977],[804,1000],[803,1060],[803,1102],[798,1114],[783,1117],
 [735,1117],[682,1117],[667,1113],[660,1102],[661,1075],[669,960],[679,820],[690,670],[700,510],
 [706,489],[720,471],[785,402],[860,324],[941,239],[960,217],[977,205],[990,207],[997,220],[994,238],
 [979,278],[966,315],[954,338],[954,353],[961,368],[985,409],[996,428],[1009,434],[1024,432],
 [1075,414],[1122,397],[1136,387],[1185,338],[1234,289],[1250,276],[1267,271],
 [1315,271],[1370,271],[1400,272],[1430,278],[1438,300],[1429,318],[1411,331],[1320,379],[1260,403]
];
const anchors=[['Barry Sheene Pit Straight',1215,415],['Turn 1 · Senna Chicane',1018,558],['Turn 2 · Senna Chicane',1020,590],['Turn 3 · East Terrace',957,678],['Turn 4',951,961],['Turn 5',805,977],['Turn 6 · Hutt Street',798,1114],['Turn 7 · Brock Straight',667,1113],['Turn 8 · Fast Sweeper',706,489],['Turn 9 · Brabham Hairpin',975,210],['Turn 10',954,353],['Turn 11 · Victoria Park',1009,434],['Turn 12',1136,387],['Turn 13',1250,276],['Turn 14 · Final Hairpin',1417,285]];
export const ADELAIDE={id:'adelaide',name:'Adelaide 500',group:3,realWorld:true,revision:1,tag:'REAL WORLD · ADELAIDE, SOUTH AUSTRALIA',desc:'Attack the Senna Chicane. Commit to Turn 8.<br>Thread the city streets and Victoria Park hairpins.',tags:['14 TURNS · CLOCKWISE','PARKLANDS STREET CIRCUIT','3.219 KM LAYOUT'],type:'car',color:0x869870,road:0x414547,width:5.6,mapScale:3,mapSize:[330,380],bounds:[162,188],overviewHeight:410,overviewWidth:350,minimapSize:[175,202],elevationScale:null,walls:true,jumpAnchors:[],offroadDrag:3.2,
 barrierOffsetAt:(u,side,p)=>{let escape=0;for(const [x,z]of[[951,961],[805,977],[667,1113],[975,210]]){const a=adelaidePoint(x,z);escape=Math.max(escape,Math.exp(-((p.x-a.x)**2+(p.z-a.z)**2)/70));}return .42+escape*(side===1?1.8:.7);},
 points:route.map(([x,z])=>{const p=adelaidePoint(x,z);return[p.x,adelaideRelief(p.x,p.z),p.z]})};
export function makeAdelaideTerrain(track){
 track.terrainHeight=adelaideRelief;
 const segments=track.nodes.filter((_,i)=>i%4===0);track.terrainDistance=(x,z)=>{let d=Infinity;for(let i=0;i<segments.length;i++){const a=segments[i],b=segments[(i+1)%segments.length],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}return d;};
 track.sections=anchors.map(([name,x,z])=>{const a=adelaidePoint(x,z);let index=0,d=Infinity;track.nodes.forEach((p,i)=>{const v=Math.hypot(p.x-a.x,p.z-a.z);if(v<d){index=i;d=v;}});return{name,index,...a};}).sort((a,b)=>a.index-b.index);
}
