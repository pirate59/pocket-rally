// Current national layout at Sandown International Motor Raceway.
// Trace: Supercars 2025 event map (indicative, not a survey).
// Relief interprets Warren Luff's crest / descending esses description.
export const sandownPoint=(x,z)=>({x:(x-850)*.28,z:(z-430)*.28});
export const sandownRelief=(x,z)=>.3+4.2*Math.exp(-(((x+91)/62)**2+((z+66)/28)**2))+.45*Math.exp(-(((x-25)/105)**2+((z+25)/62)**2));
const route=[
 [680,626],[820,620],[980,614],[1130,608],[1236,602],[1260,598],[1277,588],[1286,570],
 [1295,518],[1307,458],[1315,426],[1326,409],[1345,400],[1359,388],[1364,370],[1367,340],
 [1367,326],[1361,318],[1346,316],[1280,319],[1200,321],[1150,321],
 [1080,307],[960,280],[820,250],[690,222],[585,200],[545,194],[520,194],[496,201],
 [473,213],[453,229],[432,242],[405,250],[377,258],[350,274],[337,290],[341,307],
 [359,331],[385,358],[422,393],[445,425],[475,471],[495,506],[508,530],
 [509,544],[501,562],[500,575],[510,587],[539,599],[580,614],[609,624],[628,629]
];
const anchors=[['Pit Straight',680,626],['Turn 1',1277,588],['Turn 2',1326,409],['Turn 3',1360,388],['Turn 4 · Back Straight',1361,318],['Turn 5',1150,321],['Turn 6 · The Crest',520,194],['Turn 7 · Downhill Esses',453,229],['Turn 8',405,250],['Turn 9 · Dandenong Road',337,290],['Turn 10 · Bridge',422,393],['Turn 11',509,534],['Turn 12',500,575],['Turn 13',609,624]];
export const SANDOWN={name:'Sandown International Raceway',id:'sandown',group:3,realWorld:true,revision:1,tag:'REAL WORLD · SPRINGVALE, MELBOURNE',desc:'Charge up the back straight. Drop through the esses.<br>Race around the historic horse-racing grounds.',tags:['13 TURNS · ANTICLOCKWISE','CREST & DOWNHILL ESSES','3.1 KM CIRCUIT'],type:'car',color:0x809669,road:0x3b4143,width:6.2,mapScale:2.5,mapSize:[350,220],bounds:[173,108],walls:true,jumpAnchors:[],overviewHeight:235,overviewWidth:385,minimapSize:[250,158],elevationScale:null,offroadDrag:3.1,
 barrierOffsetAt:(u,side,p)=>{let extra=0;for(const [x,z]of[[1277,588],[1361,318],[520,194],[337,290]]){const a=sandownPoint(x,z);extra=Math.max(extra,Math.exp(-((p.x-a.x)**2+(p.z-a.z)**2)/150));}return(side===1?.65:1.05)+extra*(side===1?1.0:3.1);},
 points:route.map(([x,z])=>{const p=sandownPoint(x,z);return[p.x,sandownRelief(p.x,p.z),p.z]})};
export const SANDOWN_LAKES=[[[710,531],[770,514],[862,493],[945,461],[1011,421],[1079,378],[1118,367],[1129,381],[1120,409],[1100,440],[1063,464],[1002,488],[918,512],[822,535],[750,547],[706,550]],[[1159,232],[1200,231],[1260,244],[1320,257],[1340,275],[1337,290],[1290,294],[1230,296],[1170,292],[1150,280]]].map(poly=>poly.map(([x,z])=>sandownPoint(x,z)));
export function sandownWater(x,z){return SANDOWN_LAKES.some(poly=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;});}
export function makeSandownTerrain(track){
 const segments=track.nodes.filter((_,i)=>i%4===0).map((a,i,list)=>({a,b:list[(i+1)%list.length]}));
 track.terrainDistance=(x,z)=>{let d=Infinity;for(const {a,b}of segments){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}return d;};
 track.terrainHeight=(x,z)=>sandownWater(x,z)?-.25:sandownRelief(x,z);
 track.isWater=sandownWater;
 track.sections=anchors.map(([name,x,z])=>{const a=sandownPoint(x,z);let index=0,d=Infinity;track.nodes.forEach((p,i)=>{const v=Math.hypot(p.x-a.x,p.z-a.z);if(v<d){d=v;index=i;}});return{name,index,...a};}).sort((a,b)=>a.index-b.index);
}
