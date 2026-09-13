// Approximate 2001–2010 Grand Prix layout, referenced against RacingCircuits.info.
// Elevations interpret contemporary accounts of the hills and bridge; no survey is claimed.
export const oranPoint=(x,z)=>({x:(x-630)*.4,z:(z-355)*.4});
const route=[
 [562,489,4.8],[662,431,3.5],[758,377,2],[825,340,1],[848,323,.8],
 [866,293,.6],[885,254,.5],[895,232,.6],[887,218,.7],[873,213,.8],[851,217,.8],
 [817,228,.8],[791,236,.8],[758,246,.8],[720,258,.9],[687,266,1],[673,263,1.1],[666,253,1.3],[668,240,1.6],
 [684,210,2.5],[700,178,3.7],[716,141,5],[724,129,5.5],[735,129,5.7],[755,140,5.9],[773,154,6.1],
 [782,173,6.3],[790,200,6.5],[799,233,6.5],[804,249,6.4],[801,263,6.1],[790,278,5.6],[775,291,4.9],
 [756,300,4.2],[721,312,3.4],[686,323,2.9],[670,323,2.9],[656,317,3.2],[646,306,3.7],
 [632,286,4.9],[617,272,6],[597,262,6.8],[567,252,7.5],[538,246,7.9],[517,244,8],[505,249,8],
 [494,266,7.8],[482,298,7.5],[466,344,7.2],[452,382,6.7],[440,398,6.2],[425,406,5.7],
 [410,414,5.1],[399,430,4.5],[388,456,3.8],[373,501,2.8],[360,537,2.2],[358,551,2.1],
 [364,563,2.3],[378,573,2.6],[389,577,2.9],[402,574,3.1],[440,555,3.8],[497,524,4.5]
];
const oranRunoff=piecewiseRunoff([[0,1.55],[.12,2.2],[.23,1.55],[.29,.42],[.36,.7],[.43,.35],[.48,.28],[.54,.4],[.59,1.1],[.69,1.75],[.78,1.2],[.87,.5],[.93,1.7],[1,1.55]]);
function piecewiseRunoff(stops){return(u)=>{u=(u%1+1)%1;for(let i=0;i<stops.length-1;i++){const a=stops[i],b=stops[i+1];if(u>=a[0]&&u<=b[0]){const t=(u-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*(t*t*(3-2*t));}}return stops.at(-1)[1]};}
export const ORAN_PARK={name:'Oran Park Raceway',id:'oran-park',group:3,realWorld:true,revision:2,tag:'REAL WORLD · NARELLAN, AUSTRALIA',desc:'Dive under the bridge. Climb back over it.<br>Ride the hills of the historic Grand Prix circuit.',tags:['GRAND PRIX LAYOUT','FIGURE-EIGHT BRIDGE','2.620 KM CIRCUIT'],type:'car',color:0x8c9360,road:0x3a4145,width:6.2,mapScale:2,mapSize:[250,220],bounds:[124,109],barrierOffset:.65,barrierOffsetAt:(u)=>oranRunoff(u),offroadDrag:3.05,walls:true,jumpAnchors:[],overviewHeight:240,overviewWidth:300,minimapSize:[240,212],elevationScale:null,points:route.map(([x,z,h])=>{const p=oranPoint(x,z);return[p.x,h,p.z]})};
const sectionAnchors=[['Pit Straight',562,489,4.8],['The Sweeper',825,340,1],['Coca-Cola Corner',886,222,.7],['Underpass',802,233,.8],['Shell Corner',668,253,1.2],['Champion Curve',727,129,5.5],['Bridge',790,200,6.5],['Bridge Exit',803,260,6.2],["Foster’s Dip",677,323,2.9],['Momo Corner',517,245,8],['The Dogleg',442,397,6.2],['Recaro Corner',360,546,2.2],['Pit Straight',430,560,3.7]];
export function makeOranTerrain(track){
 const closest=(x,z,y)=>track.nodes.reduce((best,p,i)=>{const d=(p.x-x)**2+(p.z-z)**2+4*(p.y-y)**2;return d<best.d?{d,i}:best},{d:Infinity,i:0}).i;
 track.sections=sectionAnchors.map(([name,x,z,y])=>{const p=oranPoint(x,z);return{name,...p,index:closest(p.x,p.z,y)}}).sort((a,b)=>a.index-b.index);
 const entry=oranPoint(790,200),exit=oranPoint(790,278),first=closest(entry.x,entry.z,6.5),last=closest(exit.x,exit.z,5.6);
 track.bridge={first,last};track.isBridgeIndex=i=>i>=first&&i<=last;
 const segments=[];for(let i=0;i<track.n;i+=3){if(track.isBridgeIndex(i))continue;const a=track.nodes[i],b=track.nodes[(i+3)%track.n];if(track.isBridgeIndex((i+3)%track.n))continue;segments.push({a,b,dx:b.x-a.x,dz:b.z-a.z,len2:(b.x-a.x)**2+(b.z-a.z)**2})}
 const nearest=(x,z)=>{let best={d2:Infinity,y:0};for(const s of segments){const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.len2)),d2=(x-s.a.x-t*s.dx)**2+(z-s.a.z-t*s.dz)**2;if(d2<best.d2)best={d2,y:s.a.y+(s.b.y-s.a.y)*t}}return best};
 const base=(x,z)=>1+6.7*Math.exp(-(((x+47)/65)**2+((z+35)/68)**2))+2*Math.exp(-(((x+80)/50)**2+((z-74)/60)**2))+3.1*Math.exp(-(((x-48)/40)**2+((z+89)/32)**2));
 track.terrainHeight=(x,z)=>{const near=nearest(x,z),t=Math.max(0,Math.min(1,(Math.sqrt(near.d2)-track.course.width/2-1)/17)),blend=t*t*(3-2*t);return Math.max(0,(near.y-.3)*(1-blend)+base(x,z)*blend)};
 // Scenery clearance includes both decks even where the terrain follows the underpass.
 track.terrainDistance=(x,z)=>{let d=Infinity;for(let i=0;i<track.n;i+=3)d=Math.min(d,Math.hypot(x-track.nodes[i].x,z-track.nodes[i].z));return d};
}
