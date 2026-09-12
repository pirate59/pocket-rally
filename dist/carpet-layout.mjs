// Layout traced from the supplied 372 × 537 road-rug reference.
// Keep its portrait proportions and approximately the Grand Tours' land area.
export const rugPoint=(x,y)=>({x:(x-186)*.55,z:(y-268.5)*.55});
export function referenceCarpetLayout(course){
 const nodes=[],edges=[],byPosition=new Map();
 function node(x,y){const key=x.toFixed(3)+','+y.toFixed(3);if(!byPosition.has(key)){const p=rugPoint(x,y);byPosition.set(key,nodes.length);nodes.push({...p,y:.13,slope:0,heading:Math.PI/2,tx:1,tz:0,neighbors:[]})}return byPosition.get(key)}
 function connect(a,b){if(!nodes[a].neighbors.includes(b)){nodes[a].neighbors.push(b);nodes[b].neighbors.push(a);edges.push([a,b])}}
 function road(points){for(let i=1;i<points.length;i++)connect(node(...points[i-1]),node(...points[i]))}
 // Perimeter, bus avenue, upper boulevard, and the two lower cross streets.
 road([[25,13],[52,13],[122,13],[291,13],[347,13],[359,25],[359,65],[359,105],[359,216],[359,414],[359,512],[347,524],[237,524],[122,524],[25,524],[13,512],[13,414],[13,269],[13,65],[13,25],[25,13]]);
 road([[13,65],[52,65],[122,65],[291,65],[359,65]]);
 road([[52,13],[52,65],[52,269]]);
 road([[122,13],[122,65],[122,180],[122,269],[122,414],[122,524]]);
 road([[291,13],[291,65],[291,105],[291,155]]);
 road([[291,105],[359,105]]);
 road([[13,269],[52,269],[122,269],[237,269]]);
 road([[13,414],[122,414],[237,414],[359,414]]);
 road([[237,269],[237,414],[237,524]]);
 // The reference's roundabout has offset entrances, not a four-way grid crossing.
 const ring=[];for(let i=0;i<16;i++){const a=i*Math.PI/8;ring.push(node(227+34*Math.cos(a),194+34*Math.sin(a)))}
 for(let i=0;i<16;i++){connect(ring[i],ring[(i+1)%16]);nodes[ring[i]].roundabout=true;nodes[ring[i]].ringNext=ring[(i+1)%16]}
 road([[122,180],[180,180]]);connect(node(180,180),ring[9]);
 road([[359,216],[276,216]]);connect(node(276,216),ring[1]);
 road([[291,155],[264,155]]);connect(node(264,155),ring[14]);
 road([[237,269],[237,241]]);connect(node(237,241),ring[3]);
 for(const p of nodes)p.turnRadius=Math.min(5,...p.neighbors.map(i=>Math.hypot(p.x-nodes[i].x,p.z-nodes[i].z)*.24));
 const specs=[
  ['Bus Avenue','apartments',87,143,100,211,0xeea566],
  ['Pond Playground','playpark',205,118,156,153,0x82c864],
  ['Woodland Park','woods',325,162,314,192,0x7fbf64],
  ['Townhouses','townhouses',66,340,94,320,0xeac763],
  ['Bank','bank',173,312,146,300,0xe9bd55],
  ['Post Office','post',190,353,215,383,0x6ab7db],
  ['Apartment Quarter','apartments',298,266,334,291,0xe7716b],
  ['Orchard','orchard',298,378,264,373,0x84c367],
  ['City Hall','cityhall',58,471,38,499,0xe1bb56],
  ['Corner Shops','shops',184,475,213,501,0x74b9d1],
  ['Football Ground','football',299,470,265,496,0x80cd50],
  ['Roundabout Garden','garden',227,194,217,197,0xc8dd69]
 ];
 const places=specs.map(([name,kind,px,py,qx,qy,color],id)=>({id,name,kind,color,px,py,...rugPoint(px,py),pickupX:rugPoint(qx,qy).x,pickupZ:rugPoint(qx,qy).z}));
 const zones=[[[25,27],[40,27],[40,54],[25,54]],[[66,27],[110,27],[110,54],[66,54]],[[138,27],[278,27],[278,54],[138,54]],[[305,27],[345,27],[345,54],[305,54]],
  [[65,78],[110,78],[110,256],[65,256]],[[137,78],[278,78],[278,146],[214,146],[178,167],[137,167]],[[305,117],[346,117],[346,201],[274,201],[274,170],[305,160]],
  [[138,199],[177,199],[180,214],[194,232],[225,239],[225,256],[138,256]],[[25,283],[110,283],[110,402],[25,402]],[[138,283],[224,283],[224,402],[138,402]],[[252,232],[279,232],[279,230],[346,230],[346,402],[251,402],[251,245]],
  [[25,428],[109,428],[109,511],[25,511]],[[139,428],[224,428],[224,511],[139,511]],[[250,428],[346,428],[346,511],[250,511]]].map(poly=>poly.map(([x,y])=>rugPoint(x,y)));
 const parking=[{x:99,y:307,cols:1,rows:2},{x:195,y:391,cols:3,rows:1},{x:307,y:317,cols:4,rows:2},{x:47,y:502,cols:2,rows:1},{x:151,y:448,cols:1,rows:2}];
 const crossings=[[158,65,0],[52,131,1],[122,211,1],[160,269,0],[237,333,1],[79,414,0],[177,414,0],[269,414,0],[237,451,1]];
 return{course,n:nodes.length,nodes,edges,places,zones,parking,crossings,roundabout:{...rugPoint(227,194),radius:34*.55,islandRadius:17*.55},start:{...rugPoint(54,524),heading:Math.PI/2},pickups:places.map(p=>({id:p.id,name:p.name,x:p.pickupX,z:p.pickupZ})),jumps:[],hazards:[],debris:[],barriers:[],barrierCells:new Map(),spacing:1,length:0};
}
