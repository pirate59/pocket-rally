// Centreline traced from the user's Mount Panorama overview, in its orientation.
// Heights emulate the climb/crest/descent; they are not surveyed elevation data.
const route=[
 [132,550,0],[164,556,0],[182,558,0],[191,554,0],[195,541,1],
 [203,485,7],[214,423,17],[226,360,29],[237,301,42],[242,283,48],[250,278,50],[260,278,53],
 [279,288,60],[300,300,67],[323,313,73],[336,317,77],[347,314,81],[354,310,84],[356,304,87],
 [353,297,91],[347,289,96],[341,280,101],[340,263,110],[345,247,118],[355,234,125],[370,224,131],
 [383,212,137],[393,198,144],[400,181,152],[404,163,158],[400,151,162],[390,135,166],
 [377,114,171],[368,102,174],[359,98,174],[342,95,174],[315,94,173],[286,94,171],
 [274,88,168],[267,82,162],[253,83,155],[248,78,149],[245,71,143],[237,68,137],
 [231,68,132],[227,65,129],[224,62,127],[217,59,122],[210,52,117],[198,44,112],[190,39,108],
 [183,32,105],[178,21,102],[172,15,99],[166,17,97],[160,25,95],[151,41,92],[142,56,90],[137,67,88],
 [130,110,76],[123,158,63],[116,204,51],[109,252,39],[102,303,26],[96,331,20],
 [88,350,15],[79,369,11],[70,388,8],[67,399,6],[71,409,4],[79,422,2],[79,436,1],
 [75,465,0],[71,496,0],[67,526,0],[65,539,0],[72,545,0],[99,549,0]
];
export const panoramaPoint=(x,z)=>({x:(x-235)*.65,z:(z-289)*.65});
export const PANORAMA_ELEVATION_SCALE=.18;
export const PANORAMA={name:'Mount Panorama',group:3,realWorld:true,revision:1,tag:'REAL WORLD · BATHURST, AUSTRALIA',desc:'Climb the mountain. Thread the Esses.<br>Descend Conrod Straight to the Chase.',tags:['COUNTER-CLOCKWISE','MOUNTAIN TERRAIN','6.213 KM CIRCUIT'],type:'car',color:0x71805a,road:0x343b40,width:6.2,mapScale:3.5,mapSize:[274,414],bounds:[135,204],barrierOffset:.52,walls:true,jumpAnchors:[],points:route.map(([x,z,h])=>{const p=panoramaPoint(x,z);return[p.x,h*PANORAMA_ELEVATION_SCALE,p.z]})};
export const PANORAMA_SECTIONS=[['Main Straight',132,550],['Hell Corner',190,555],['Mountain Straight',214,423],['Griffins Bend',250,279],['The Cutting',351,309],['Quarry Corner',341,263],['Reid Park',370,224],['Frog Hollow',401,180],['Sulman Park',380,119],['McPhillamy Park',343,95],['Skyline',280,91],['The Esses',239,73],['The Dipper',220,62],["Forrest’s Elbow",168,18],['Conrod Straight',120,180],['The Chase',70,396],["Murrays Corner",67,537],['Main Straight',90,548]];
export function makePanoramaTerrain(track){
 // Broad topography is blended into the map-traced road corridor. This
 // makes the infield and outer hills rise with the road instead of floating it.
 const segments=[];for(let i=0;i<track.n;i+=6){const a=track.nodes[i],b=track.nodes[(i+6)%track.n];segments.push({a,b,dx:b.x-a.x,dz:b.z-a.z,len2:(b.x-a.x)**2+(b.z-a.z)**2})}
 const nearest=(x,z)=>{let best={d2:Infinity};for(const s of segments){const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.len2)),qx=s.a.x+t*s.dx,qz=s.a.z+t*s.dz,d2=(x-qx)**2+(z-qz)**2;if(d2<best.d2)best={d2,y:s.a.y+(s.b.y-s.a.y)*t}}return best};
 const base=(x,z)=>Math.max(0,31*Math.exp(-1*(((x-44)/100)**2+((z+116)/99)**2))+3*Math.exp(-1*(((x+8)/90)**2+((z+38)/110)**2))-.7);
 const height=(x,z)=>{const near=nearest(x,z),d=Math.sqrt(near.d2),blend=Math.max(0,Math.min(1,(d-track.course.width/2-1)/28)),smooth=blend*blend*(3-2*blend);return Math.max(-.1,(near.y-.25)*(1-smooth)+base(x,z)*smooth)};
 track.terrainHeight=height;track.terrainDistance=(x,z)=>Math.sqrt(nearest(x,z).d2);
 track.sections=PANORAMA_SECTIONS.map(([name,x,z])=>{const p=panoramaPoint(x,z);let index=0,best=Infinity;track.nodes.forEach((q,i)=>{const d=Math.hypot(p.x-q.x,p.z-q.z);if(d<best){index=i;best=d}});return{name,index,...p}}).sort((a,b)=>a.index-b.index);
 return height;
}
