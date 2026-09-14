import * as THREE from './three.module.mjs';
import {sandownPoint,SANDOWN_LAKES,sandownWater} from './sandown.mjs';
export function buildSandownWorld({world,track,addCollider}){
 const group=new THREE.Group(),owned=new Set();group.name='Sandown racecourse, grandstand and lakes';world.add(group);
 const mat=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85});owned.add(m);return m;};
 const cream=mat(0xe4dfca),dark=mat(0x374642),roof=mat(0x687977),red=mat(0x93463f),turf=mat(0x66a258),white=mat(0xeee9d8),trunk=mat(0x897157),leaf=mat(0x64854d),gravel=mat(0xb8ab8c);
 const mesh=(g,m,x=0,y=0,z=0,parent=group)=>{owned.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,m,x,y,z,parent=group)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const ground=(x,z)=>track.terrainHeight(x,z);
 const [w,d]=track.course.mapSize,g=new THREE.PlaneGeometry(w,d,180,114);g.rotateX(-Math.PI/2);const positions=g.attributes.position,colors=[],color=new THREE.Color();
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i);positions.setY(i,ground(x,z));color.setHex(0x8ca66d).multiplyScalar(1+.035*Math.sin(x*.19)*Math.cos(z*.14));colors.push(color.r,color.g,color.b);}
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();const grass=mat(0xffffff);grass.vertexColors=true;mesh(g,grass).name='Sandown hill and rolling racecourse grounds';box(w,2.5,d,mat(0x887c58),0,-1.55,0);
 for(const poly of SANDOWN_LAKES){const shape=new THREE.Shape();poly.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();const water=mesh(new THREE.ShapeGeometry(shape),mat(0x5ba1ae),0,.12,0);water.rotation.x=-Math.PI/2;water.name='Sandown lake';}
 const beam=(a,b,width,height,m)=>{const dx=b.x-a.x,dz=b.z-a.z,o=box(width,height,Math.hypot(dx,dz),m,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);o.rotation.y=Math.atan2(dx,dz);return o;};
 // Paved escape areas outside Turn 1 and the fast crest complex.
 for(const name of['Turn 1','Turn 6 · The Crest']){const index=track.sections.find(s=>s.name===name).index,vertices=[];
  for(const wall of track.barriers.filter(w=>w.side===-1&&Math.abs(w.index-index)<25)){const a=track.nodes[wall.index],b=track.nodes[(wall.index+1)%track.n],edge=track.course.width/2+.12,point=(x,z)=>[x,ground(x,z)+.025,z];const aa=point(a.x-a.tz*edge,a.z+a.tx*edge),bb=point(b.x-b.tz*edge,b.z+b.tx*edge),aw=point(wall.ax,wall.az),bw=point(wall.bx,wall.bz);vertices.push(...aa,...aw,...bb,...aw,...bw,...bb);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();const asphalt=mat(0x737974);asphalt.side=THREE.DoubleSide;mesh(g,asphalt).name=name+' paved runoff';
 }
 function sign(text,x,z,width=22,y=ground(x,z)+4){const c=document.createElement('canvas');c.width=640;c.height=90;const ctx=c.getContext('2d');ctx.fillStyle='#28423c';ctx.fillRect(0,0,640,90);ctx.fillStyle='#fff1c8';ctx.font='bold 42px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,320,45,615);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;owned.add(texture);const m=new THREE.SpriteMaterial({map:texture});owned.add(m);const s=new THREE.Sprite(m);s.position.set(x,y,z);s.scale.set(width,width*90/640,1);group.add(s);}
 // The infield contains the turf horse-racing courses and their white rails.
 const horsePoints=[[560,250],[830,304],[1135,369],[1240,420],[1230,502],[1180,555],[925,573],[665,581],[558,543],[489,435],[419,303]].map(([x,z])=>{const p=sandownPoint(x,z);return new THREE.Vector3(p.x,0,p.z);});
 const curve=new THREE.CatmullRomCurve3(horsePoints,true,'centripetal'),samples=curve.getPoints(260);
 for(let i=0;i<260;i++){const a=samples[i],b=samples[i+1];beam({x:a.x,y:ground(a.x,a.z)+.045,z:a.z},{x:b.x,y:ground(b.x,b.z)+.045,z:b.z},4,.045,turf);
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);for(const side of[-1,1]){const x=a.x+dz/len*side*2.1,z=a.z-dx/len*side*2.1,bx=b.x+dz/len*side*2.1,bz=b.z-dx/len*side*2.1;beam({x,y:ground(x,z)+.7,z},{x:bx,y:ground(bx,bz)+.7,z:bz},.09,.11,white);if(i%4===0)box(.1,.8,.1,white,x,ground(x,z)+.4,z);}
 }
 // Main straight pit apron and garages, then the large covered grandstand.
 const laneA=sandownPoint(615,651),laneB=sandownPoint(1215,631);beam({...laneA,y:ground(laneA.x,laneA.z)+.04},{...laneB,y:ground(laneB.x,laneB.z)+.04},2.1,.045,dark);
 const pit=sandownPoint(800,675),py=ground(pit.x,pit.z);box(62,3.2,5,cream,pit.x,py+1.6,pit.z);box(64,.35,6,roof,pit.x,py+3.35,pit.z);
 for(let x=-28;x<=28;x+=4.5){box(3.7,2.2,.08,dark,pit.x+x,py+1.15,pit.z-2.55);addCollider(pit.x+x,pit.z,2.5,py);}
 const stand=sandownPoint(1080,684),sy=ground(stand.x,stand.z);for(let row=0;row<9;row++){box(60,.55+row*.65,1.3,cream,stand.x,sy+(.55+row*.65)/2,stand.z-5+row*1.3);box(59,.13,.7,red,stand.x,sy+.68+row*.65,stand.z-5+row*1.3);}
 box(63,.45,15,roof,stand.x,sy+9,stand.z);for(let x=-29;x<=29;x+=9.6){box(.28,8.8,.28,cream,stand.x+x,sy+4.4,stand.z+6);addCollider(stand.x+x,stand.z,6,sy);}
 sign('SANDOWN',stand.x,stand.z,32,sy+10.8);
 // The pedestrian bridge crosses the approach to the final complex.
 const p=track.nodes[track.sections.find(s=>s.name.startsWith('Turn 10')).index],bridge=new THREE.Group();bridge.position.set(p.x,p.y,p.z);bridge.rotation.y=p.heading;group.add(bridge);box(18,.6,2.2,cream,0,4.8,0,bridge);box(18,1.1,.15,dark,0,5.55,-1,bridge);
 for(const side of[-1,1]){box(.55,4.8,.55,cream,side*8.5,2.4,0,bridge);addCollider(p.x+p.tz*side*8.5,p.z-p.tx*side*8.5,.5,p.y);}
 sign('SANDOWN RACEWAY',p.x,p.z,17,p.y+6.2);
 // Paddock transporters and parking sit behind the pit buildings.
 for(let i=0;i<9;i++){const x=pit.x-28+i*7,z=pit.z+12,y=ground(x,z);box(5,2.6,3,i%2?white:red,x,y+1.3,z);box(1.6,1.8,3,dark,x+3,y+.9,z);addCollider(x,z,2,y);}
 // Railway beside the southeastern boundary and the station platform.
 const ra={x:166,z:44},rb={x:110,z:103};for(const side of[-1,1])beam({x:ra.x+side*.6,z:ra.z,y:ground(ra.x,ra.z)+.1},{x:rb.x+side*.6,z:rb.z,y:ground(rb.x,rb.z)+.1},.1,.1,dark);
 for(let i=0;i<=34;i++){const x=ra.x+(rb.x-ra.x)*i/34,z=ra.z+(rb.z-ra.z)*i/34;const sleeper=box(2.6,.08,.22,gravel,x,ground(x,z)+.04,z);sleeper.rotation.y=-.76;}
 box(4,.4,19,cream,155,ground(155,65)+.2,65);sign('SANDOWN PARK',155,65,15);
 // Boundary trees and spectator shade stay outside the racing corridor.
 let seed=8753;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;},trees=[];
 for(let i=0;i<600&&trees.length<100;i++){const x=(random()-.5)*330,z=(random()-.5)*200;if(track.terrainDistance(x,z)<12||sandownWater(x,z)||z>48&&x>-75||z>-38&&z<43&&x>-130&&x<145)continue;trees.push({x,z,y:ground(x,z),h:3+random()*2});}
 const tg=new THREE.CylinderGeometry(.22,.3,1,6),lg=new THREE.IcosahedronGeometry(1,1);owned.add(tg);owned.add(lg);const trunks=new THREE.InstancedMesh(tg,trunk,trees.length),leaves=new THREE.InstancedMesh(lg,leaf,trees.length),dummy=new THREE.Object3D();
 trees.forEach((p,i)=>{dummy.position.set(p.x,p.y+p.h/2,p.z);dummy.scale.set(1,p.h,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=p.y+p.h;dummy.scale.set(2.1,1.8,2.1);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);addCollider(p.x,p.z,.35,p.y);});group.add(trunks,leaves);
 return{dispose(){for(const r of owned)r.dispose();group.removeFromParent();}};
}
