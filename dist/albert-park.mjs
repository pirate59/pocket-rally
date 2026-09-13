// Current 14-turn layout traced from the FIA 2026 Australian GP circuit map.
// Parks Victoria's visitor guide supplies the lake and park geography.
// The small terrain undulations interpret F1's 2.6 m total relief, not a survey.
export const albertPoint=(x,z)=>({x:(x-590)*.31,z:(z-865)*.31});
const route=[
 [529,1125],[473,1074],[420,1025],[389,996],[374,981],[371,973],
 [378,954],[383,934],[382,916],[376,897],[364,879],[342,860],
 [302,821],[261,776],[228,733],[201,691],[191,673],[186,658],
 [188,648],[200,640],[219,633],[237,625],[248,617],[252,607],[250,565],
 [248,525],[247,506],[249,493],[255,485],[279,467],[306,448],
 [335,431],[368,418],[401,406],[425,391],[441,381],[451,378],
 [465,383],[483,396],[501,403],[526,407],[551,409],[575,417],
 [596,430],[613,451],[625,477],[634,511],[643,550],[647,578],
 [645,606],[639,633],[625,670],[609,711],[598,750],[594,782],
 [596,810],[604,842],[617,874],[633,901],[651,923],[678,946],
 [708,971],[735,993],[744,999],[766,997],[800,992],[806,993],
 [832,1015],[868,1044],[902,1074],[922,1096],[937,1123],[949,1156],
 [962,1201],[977,1254],[985,1282],[988,1301],[982,1317],
 [964,1328],[943,1334],[919,1341],[888,1351],[873,1355],[860,1354],
 [849,1348],[841,1338],[822,1306],[807,1276],[793,1262],[781,1258],
 [771,1265],[754,1281],[739,1292],[725,1298],[712,1297],[699,1291],
 [681,1277],[644,1242],[586,1187]
];
const relief=(x,z)=>.22+.468*Math.exp(-(((x-115)/79)**2+((z-116)/83)**2));
const cornerAnchors=[[1,371,975],[2,383,933],[3,175,644],[4,252,607],[5,248,500],[6,450,378],[7,520,407],[8,617,455],[9,743,999],[10,805,992],[11,997,1320],[12,868,1355],[13,779,1245],[14,714,1295]];
const runoffAnchors=[1,3,6,11,13,14].map(n=>albertPoint(...cornerAnchors[n-1].slice(1)));
export const ALBERT_PARK={name:'Albert Park',id:'albert-park',group:3,realWorld:true,revision:1,tag:'REAL WORLD · MELBOURNE, AUSTRALIA',desc:'Race around Albert Park Lake.<br>Fast parkland sweeps and a technical final sector.',tags:['14 TURNS · CLOCKWISE','LAKESIDE PARKLAND','5.278 KM CIRCUIT'],type:'car',color:0x809669,road:0x3d4446,width:6.2,mapScale:3,mapSize:[320,365],bounds:[159,181],walls:true,jumpAnchors:[],overviewHeight:330,overviewWidth:350,minimapSize:[220,250],elevationScale:null,offroadDrag:3.15,
 barrierOffsetAt:(u,side,p)=>{let extra=0;for(const a of runoffAnchors)extra=Math.max(extra,Math.exp(-((p.x-a.x)**2+(p.z-a.z)**2)/120));return(side===1?.75:.55)+extra*(side===1?3.2:1.2);},
 points:route.map(([x,z])=>{const p=albertPoint(x,z);return[p.x,relief(p.x,p.z),p.z]})};
// The broad northern basin narrows into the southern lake alongside Lakeside Drive.
export const ALBERT_LAKE=[
 [454,432],[482,427],[520,428],[552,436],[580,454],[601,482],[610,519],
 [617,560],[619,603],[608,639],[592,680],[580,723],[574,763],[575,806],
 [584,850],[601,890],[624,927],[657,960],[696,991],[732,1020],
 [773,1045],[817,1064],[854,1090],[865,1106],[852,1117],[830,1109],
 [796,1085],[761,1069],[723,1043],[687,1017],[649,984],[615,955],
 [581,930],[548,907],[515,885],[482,864],[449,841],[416,821],[380,798],
 [345,774],[320,752],[306,729],[307,710],[321,691],[345,677],[381,666],
 [410,654],[420,642],[419,615],[417,578],[416,542],[415,504],[417,468],[428,444]
].map(([x,z])=>albertPoint(x,z));
export function lakeContains(x,z){let inside=false;for(let i=0,j=ALBERT_LAKE.length-1;i<ALBERT_LAKE.length;j=i++){const a=ALBERT_LAKE[i],b=ALBERT_LAKE[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
export function makeAlbertTerrain(track){
 const segments=[];for(let i=0;i<track.n;i+=4){const a=track.nodes[i],b=track.nodes[(i+4)%track.n];segments.push({a,b,dx:b.x-a.x,dz:b.z-a.z,l2:(b.x-a.x)**2+(b.z-a.z)**2});}
 track.terrainDistance=(x,z)=>{let d2=Infinity;for(const s of segments){const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.l2));d2=Math.min(d2,(x-s.a.x-t*s.dx)**2+(z-s.a.z-t*s.dz)**2);}return Math.sqrt(d2);};
 track.terrainHeight=(x,z)=>lakeContains(x,z)?-.38:relief(x,z);
 track.isWater=lakeContains;
 track.sections=[{name:'Pit Straight',index:0},...cornerAnchors.map(([n,x,z])=>{const a=albertPoint(x,z);let index=0,d=Infinity;track.nodes.forEach((p,i)=>{const q=(p.x-a.x)**2+(p.z-a.z)**2;if(q<d){d=q;index=i;}});return{name:({8:'Turn 8 · Lakeside Drive',9:'Turn 9 · Fast chicane',14:'Turn 14 · Pit Straight'})[n]||'Turn '+n,index,...a};})].sort((a,b)=>a.index-b.index);
}
