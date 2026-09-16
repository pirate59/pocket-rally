import * as THREE from './three.module.mjs';
import {islandPoint as point} from './phillip-island.mjs';
export function buildIslandWorld({world,track,addCollider}){
 const group=new THREE.Group(),owned=new Set();group.name='Phillip Island coastal grounds';world.add(group);
 const mat=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85});owned.add(m);return m;},grass=mat(0x8ca56f),sand=mat(0xcec2a3),white=mat(0xe7e8dc),blue=mat(0x4d7294),dark=mat(0x39454c),leaf=mat(0x5d7854),wood=mat(0x86755b);
 const mesh=(geo,m,x=0,y=0,z=0,parent=group)=>{owned.add(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;},box=(w,h,d,m,x,y,z,parent)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const height=track.terrainHeight,geo=new THREE.PlaneGeometry(450,300,150,100);geo.rotateX(-Math.PI/2);const a=geo.attributes.position;for(let i=0;i<a.count;i++)a.setY(i,height(a.getX(i),a.getZ(i)));geo.computeVertexNormals();mesh(geo,grass);
 // Bass Strait and the coastal edge share the map's southeast boundary.
 const coast=[[1060,-65],[1610,-65],[1610,480],[1450,485],[1375,515],[1340,475],[1250,455],[1185,425],[1150,380],[1120,300],[1100,230],[1080,195]];
 const shape=new THREE.Shape();coast.map(([x,z])=>point(x,z)).forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();const water=mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:0x367d9c,roughness:.3,metalness:.15}),0,2.6,0);owned.add(water.material);water.rotation.x=-Math.PI/2;
 function clear(x,z,w,d,angle){for(let xx=-w/2;xx<=w/2+.01;xx+=Math.min(1.5,w))for(let zz=-d/2;zz<=d/2+.01;zz+=Math.min(1.5,d)){const wx=x+xx*Math.cos(angle)+zz*Math.sin(angle),wz=z-xx*Math.sin(angle)+zz*Math.cos(angle);if(track.terrainDistance(wx,wz)<track.course.width/2+8)return false;}return true;}
 function structure(x,z,w,d,angle,kind){const p=point(x,z);if(!clear(p.x,p.z,w+2,d+3,angle))return;const g=new THREE.Group();g.position.set(p.x,height(p.x,p.z),p.z);g.rotation.y=angle;group.add(g);g.userData.sceneryFootprint={w:w+2,d:d+3};
  if(kind==='stand'){for(let i=0;i<6;i++){box(w,.6+i*.5,1,white,0,(.6+i*.5)/2,-d/2+i,g);box(w,.12,.7,blue,0,.75+i*.5,-d/2+i,g);}box(w+1,.25,d+1,white,0,5,0,g);}else{box(w,3.6,d,white,0,1.8,0,g);box(w+1,.25,d+1,dark,0,3.8,0,g);for(let xx=-w/2+2;xx<w/2;xx+=4)box(3,2.5,.05,blue,xx,1.3,d/2+.03,g);}
  // Keep collisions within the actual rectangular footprint.
  for(let xx=-w/2+1;xx<w/2;xx+=2){const wx=p.x+xx*Math.cos(angle),wz=p.z-xx*Math.sin(angle);addCollider(wx,wz,d/2,height(wx,wz));}return g;
 }
 structure(520,620,64,5,.33,'pit');structure(1110,780,40,7,0,'stand');structure(260,250,22,7,1.1,'stand');structure(1040,180,25,7,0,'stand');structure(810,830,20,10,0,'visitor');
 for(let i=0;i<7;i++)structure(450+i*35,574,5,2.5,0,'team');
 // Gravel beds follow selected corners and remain below the road surface.
 const vertices=[];for(const s of track.sections.filter(s=>/Turn (1 |2 |4 |6 |10 )/.test(s.name)))for(let di=-25;di<45;di++){const i=(s.index+di+track.n)%track.n,p=track.nodes[i],q=track.nodes[(i+1)%track.n];for(const side of[-1,1]){const v=(n,d)=>{const x=n.x+n.tz*d*side,z=n.z-n.tx*d*side;return[x,height(x,z)+.02,z];},aa=v(p,4),bb=v(q,4),cc=v(p,6),dd=v(q,6);vertices.push(...aa,...bb,...cc,...bb,...dd,...cc);}}
 const gravel=new THREE.BufferGeometry();gravel.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));gravel.computeVertexNormals();sand.side=THREE.DoubleSide;mesh(gravel,sand);
 // Sparse wind-shaped trees leave open coastal sightlines.
 let seed=205;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<110;i++){const x=-200+random()*300,z=-110+random()*240;if(track.terrainDistance(x,z)<18)continue;box(.3,2,.3,wood,x,height(x,z)+1,z);const crown=mesh(new THREE.SphereGeometry(1,12,8),leaf,x,height(x,z)+2.7,z);crown.scale.set(1.7,1.1,1.3);addCollider(x,z,.3,height(x,z));}
 return{dispose(){group.removeFromParent();for(const r of owned)r.dispose();}};
}
