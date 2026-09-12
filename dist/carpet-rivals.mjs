// Shared walkable grid: rivals plan their own routes to uncollected blocks.
// Roads are quicker, but clear carpet shortcuts are allowed just as for the player.
export class CarpetNavigation{
 constructor(track,obstacles,nearestRoad){
  this.track=track;this.obstacles=obstacles;this.cell=1.8;const [bx,bz]=track.course.bounds;this.bx=bx;this.bz=bz;this.w=Math.floor(2*bx/this.cell)+1;this.h=Math.floor(2*bz/this.cell)+1;
  this.nodes=Array.from({length:this.w*this.h},(_,id)=>{const x=-bx+id%this.w*this.cell,z=-bz+Math.floor(id/this.w)*this.cell;return{x,z,open:obstacles.every(o=>Math.hypot(x-o.x,z-o.z)>o.r+1.15),cost:nearestRoad(track,x,z).d<track.course.width/2?1:1.85}});
  this.goals=track.pickups.map(p=>this.closest(p));
 }
 clear(a,b,extra=[]){const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz;const misses=o=>{const t=l2?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/l2)):0;return Math.hypot(o.x-a.x-dx*t,o.z-a.z-dz*t)>o.r+1.05};return this.obstacles.every(misses)&&extra.every(misses)}
 closest(p){let id=-1,best=Infinity;this.nodes.forEach((n,i)=>{const d=(n.x-p.x)**2+(n.z-p.z)**2;if(n.open&&d<best&&this.clear(p,n)){best=d;id=i}});return id}
 route(car,blocked=[],boostGoal=null){
  const start=this.closest(car),goals=boostGoal?new Map([[this.closest(boostGoal),boostGoal]]):new Map(this.track.pickups.filter(p=>!car.collected.has(p.id)).map(p=>[this.goals[p.id],p]));if(start<0||!goals.size)return null;
  const dist=new Float64Array(this.nodes.length).fill(Infinity),prev=new Int32Array(this.nodes.length).fill(-1),heap=[];
  const push=(id,cost)=>{let i=heap.length;heap.push({id,cost});while(i){const parent=(i-1)>>1;if(heap[parent].cost<=cost)break;heap[i]=heap[parent];i=parent}heap[i]={id,cost}};
  const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].cost<heap[child].cost)child++;if(heap[child].cost>=last.cost)break;heap[i]=heap[child];i=child}heap[i]=last}return first};
  const occupied=new Set();if(blocked.length)this.nodes.forEach((n,i)=>{if(i!==start&&blocked.some(o=>Math.hypot(n.x-o.x,n.z-o.z)<3&&Math.hypot(n.x-car.x,n.z-car.z)>2))occupied.add(i)});
  dist[start]=0;push(start,0);
  while(heap.length){const {id,cost}=pop();if(cost!==dist[id])continue;const a=this.nodes[id];if(goals.has(id)){const path=[];for(let i=id;i!==-1;i=prev[i])path.push(this.nodes[i]);path.reverse();const target=goals.get(id);path.push({x:target.x,z:target.z,cost:1.85});return{path,target:target.id,targetType:boostGoal?'boost':'block',avoid:blocked.map(o=>({x:o.x,z:o.z,r:1.5}))}}
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=id%this.w+dx,z=Math.floor(id/this.w)+dz;if(x<0||x>=this.w||z<0||z>=this.h)continue;const j=z*this.w+x,b=this.nodes[j];if(!b.open||occupied.has(j))continue;if(dx&&dz&&(!this.nodes[id+dx].open||!this.nodes[id+dz*this.w].open))continue;
    const next=cost+Math.hypot(dx,dz)*this.cell*(a.cost+b.cost)/2;if(next>=dist[j]||!this.clear(a,b))continue;dist[j]=next;prev[j]=id;push(j,next);
   }
  }return null;
 }
}
