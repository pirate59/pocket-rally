import {extraRunoff} from './barrier-modes.mjs';
const wrap=(i,n)=>(i%n+n)%n;
const cross=(ax,az,bx,bz)=>ax*bz-az*bx;
// Trim the small loops made when an inside offset exceeds a corner's radius.
// Keep a point for every road sample: collapsed loops become a triangle fan,
// so kerbs, road edges and barriers all use the same non-folding construction.
export function offsetBoundary(nodes,distance){
 const n=nodes.length,points=nodes.map((p,i)=>{const d=typeof distance==='function'?distance(p,i):distance;return{x:p.x+p.tz*d,z:p.z-p.tx*d,y:p.y};});
 for(let pass=0;pass<3;pass++){
  let changed=false;
  for(let i=0;i<n;i++){
   if(nodes[i].rail||nodes[(i+1)%n].rail)continue;
   const a=points[i],b=points[(i+1)%n],dx=b.x-a.x,dz=b.z-a.z;if(dx*dx+dz*dz<1e-10)continue;
   for(let step=2;step<Math.min(100,n/3);step++){
    const j=(i+step)%n;if(nodes[j].rail||nodes[(j+1)%n].rail)continue;const c=points[j],d=points[(j+1)%n],ex=d.x-c.x,ez=d.z-c.z,den=cross(dx,dz,ex,ez);if(Math.abs(den)<1e-9)continue;
    const t=cross(c.x-a.x,c.z-a.z,ex,ez)/den,u=cross(c.x-a.x,c.z-a.z,dx,dz)/den;
    if(t<1e-6||t>1-1e-6||u<1e-6||u>1-1e-6)continue;
    const ay=a.y+(b.y-a.y)*t,by=c.y+(d.y-c.y)*u;if(Math.abs(ay-by)>1.2)continue; // Preserve separate bridge decks.
    const p={x:a.x+dx*t,z:a.z+dz*t,y:(ay+by)/2};
    for(let k=1;k<=step;k++)points[(i+k)%n]={...p};changed=true;break;
   }
  }
  if(!changed)break;
 }
 return points;
}
function joinNormal(points,i){
 const p=points[i],n=points.length;let a,b;
 for(let k=1;k<n;k++){const q=points[wrap(i-k,n)];if(Math.hypot(p.x-q.x,p.z-q.z)>1e-5){a=q;break;}}
 for(let k=1;k<n;k++){const q=points[(i+k)%n];if(Math.hypot(p.x-q.x,p.z-q.z)>1e-5){b=q;break;}}
 if(!a||!b)return{x:1,z:0};
 const la=Math.hypot(p.x-a.x,p.z-a.z),lb=Math.hypot(b.x-p.x,b.z-p.z),ax=(p.z-a.z)/la,az=-(p.x-a.x)/la,bx=(b.z-p.z)/lb,bz=-(b.x-p.x)/lb;
 const len=Math.hypot(ax+bx,az+bz);if(len<1e-5)return{x:bx,z:bz};
 return{x:(ax+bx)/len,z:(az+bz)/len};
}
export function makeBarriers(nodes,course,track={course}){
 if(!course.walls)return[];const n=nodes.length,result=[];
 for(const side of[-1,1]){
  const base=nodes.map((p,i)=>Math.max(.28,course.barrierOffsetAt?.(i/n,side,p)??course.barrierOffset??.18)),extra=nodes.map((p,i)=>extraRunoff(track,p,i,base[i]));
  // Ease narrowing over a long approach, never an abrupt kink by a ramp.
  for(let pass=0;pass<2;pass++)for(const direction of[1,-1])for(let k=0;k<n;k++){const i=direction>0?k:n-1-k,j=wrap(i-direction,n),d=Math.hypot(nodes[i].x-nodes[j].x,nodes[i].z-nodes[j].z);extra[i]=Math.min(extra[i],extra[j]+d*.06);}
  const runoff=base.map((v,i)=>v+extra[i]);
  const points=offsetBoundary(nodes,(p,i)=>side*((p.width||course.width)/2+runoff[i])),normals=points.map((p,i)=>joinNormal(points,i));
  const valid=i=>!nodes[i].gap&&!nodes[(i+1)%n].gap&&!nodes[i].rail&&!nodes[(i+1)%n].rail&&!(course.intersection&&Math.hypot(nodes[i].x,nodes[i].z)<(course.intersection.radius||course.width*.88));
  for(let i=0;i<n;i++){
   const j=(i+1)%n,a=points[i],b=points[j],len=Math.hypot(b.x-a.x,b.z-a.z);if(!valid(i)||len<1e-5)continue;
   const normal={x:(b.z-a.z)/len,z:-(b.x-a.x)/len};
   const miter=q=>{const f=1/Math.max(.5,Math.abs(q.x*normal.x+q.z*normal.z));return{x:q.x*f,z:q.z*f};};
   result.push({barrierMode:course.barrierMode,index:i,side,ax:a.x,az:a.z,ay:a.y,bx:b.x,bz:b.z,by:b.y,height:.62,width:.34,runoff:runoff[i],normalA:normals[i],normalB:normals[j],miterA:miter(normals[i]),miterB:miter(normals[j]),joinedA:valid(wrap(i-1,n)),joinedB:valid(j)});
  }
 }
 return result;
}
// Adjacent spans share their exact mitred corners, including the cap, rather
// than overlapping rectangular boxes with exposed end faces.
export function wallMeshData(walls,cap,colorFor){
 const positions=[],colors=[];
 const quad=(a,b,c,d,col)=>{for(const p of[a,b,c,a,c,d]){positions.push(...p);colors.push(col.r,col.g,col.b);}};
 for(const w of walls){
  const half=(w.width+(cap?.08:0))/2,low=cap?w.height:0,high=cap?w.height+.065:w.height,col=colorFor(w);
  const point=(end,side,h)=>{const a=end==='a',m=a?w.miterA:w.miterB;return[(a?w.ax:w.bx)+side*m.x*half,(a?w.ay:w.by)+h,(a?w.az:w.bz)+side*m.z*half];};
  for(const side of[-1,1])quad(point('a',side,low),point('b',side,low),point('b',side,high),point('a',side,high),col);
  quad(point('a',-1,high),point('b',-1,high),point('b',1,high),point('a',1,high),col);
  if(!w.joinedA)quad(point('a',-1,low),point('a',-1,high),point('a',1,high),point('a',1,low),col);
  if(!w.joinedB)quad(point('b',-1,low),point('b',1,low),point('b',1,high),point('b',-1,high),col);
 }
 return{positions,colors};
}
// A split road's centre island carries a barrier along the centreline. Spans
// are two-sided (resolveWall uses the signed side of its normal), so one run
// of panels divides both lanes; side 0 marks them for the road builder.
export function makeIslandWalls(nodes,course){
 if(!course.walls)return[];const n=nodes.length,result=[],on=i=>nodes[i].island>=.17;
 for(let i=0;i<n;i++){
  const j=(i+1)%n,a=nodes[i],b=nodes[j];if(!on(i)||!on(j))continue;
  const len=Math.hypot(b.x-a.x,b.z-a.z);if(len<1e-5)continue;
  const normal=(p)=>({x:p.tz,z:-p.tx});
  result.push({barrierMode:course.barrierMode,index:i,side:0,island:true,ax:a.x,az:a.z,ay:a.y,bx:b.x,bz:b.z,by:b.y,height:.62,width:.34,runoff:0,normalA:normal(a),normalB:normal(b),miterA:normal(a),miterB:normal(b),joinedA:on((i-1+n)%n),joinedB:on((j+1)%n)});
 }
 return result;
}
