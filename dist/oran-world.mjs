import * as THREE from './three.module.mjs';
import {oranPoint} from './oran-park.mjs';
export function buildOranWorld({world,track,addCollider}){
 const owned=new Set(),group=new THREE.Group();group.name='Oran Park rolling terrain and circuit facilities';world.add(group);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.92,...extra});owned.add(m);return m};
 const grass=mat(0xffffff,{vertexColors:true}),earth=mat(0x78634b),white=mat(0xe6e2d5),roof=mat(0x465354),glass=mat(0x496675),trunk=mat(0x817665),leaf=mat(0x667950);
 const add=(geometry,material,x,y,z,parent=group)=>{owned.add(geometry);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m};
 const box=(w,h,d,m,x,y,z,parent=group)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const [width,depth]=track.course.mapSize,nx=Math.ceil(width/1.5),nz=Math.ceil(depth/1.5),g=new THREE.PlaneGeometry(width,depth,nx,nz);g.rotateX(-Math.PI/2);const positions=g.attributes.position,colors=[],green=new THREE.Color(),low=new THREE.Color(0xa2a373),high=new THREE.Color(0x64734b);
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),h=track.terrainHeight(x,z);positions.setY(i,h);const patch=.07*Math.sin(x*.083+z*.04)*Math.sin(z*.075);green.copy(low).lerp(high,Math.max(0,Math.min(1,h/10+patch)));colors.push(green.r,green.g,green.b)}
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();const terrain=add(g,grass,0,0,0);terrain.name='Rolling countryside and sunken underpass';terrain.castShadow=true;
 // Exposed board edges show the relief continuing through the whole diorama.
 const rim=[],rimIndices=[];const outline=[];for(let i=0;i<=nx;i++)outline.push([-width/2+width*i/nx,-depth/2]);for(let i=1;i<=nz;i++)outline.push([width/2,-depth/2+depth*i/nz]);for(let i=1;i<=nx;i++)outline.push([width/2-width*i/nx,depth/2]);for(let i=1;i<nz;i++)outline.push([-width/2,depth/2-depth*i/nz]);
 outline.forEach(([x,z],i)=>{rim.push(x,track.terrainHeight(x,z),z,x,-5,z);const j=(i+1)%outline.length;rimIndices.push(i*2,j*2,i*2+1,j*2,j*2+1,i*2+1)});const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(rim,3));rg.setIndex(rimIndices);rg.computeVertexNormals();add(rg,mat(0x806b50,{side:THREE.DoubleSide}),0,0,0);box(width,.8,depth,earth,0,-5.4,0);
 // Bridge slab follows the racing surface, with an open portal below it.
 const steel=mat(0xc9cbd0),red=mat(0xc74335),concrete=mat(0xb4ada0);
 const beam=(a,b,w,h,m)=>{const delta=new THREE.Vector3().subVectors(b,a),mid=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5),o=box(w,h,delta.length()+.03,m,mid.x,mid.y,mid.z);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),delta.normalize());o.castShadow=true;return o};
 const {first,last}=track.bridge;
 for(let i=first;i<last;i+=2){const a=track.nodes[i],b=track.nodes[Math.min(last,i+2)];beam(new THREE.Vector3(a.x,a.y-.22,a.z),new THREE.Vector3(b.x,b.y-.22,b.z),track.course.width+.65,.4,concrete);for(const side of[-1,1]){const d=track.course.width/2+.8;beam(new THREE.Vector3(a.x+a.tz*d,a.y+.75,a.z-a.tx*d),new THREE.Vector3(b.x+b.tz*d,b.y+.75,b.z-b.tx*d),.22,.65,steel);}}
 for(const i of[first+4,last-4]){const p=track.nodes[i];for(const side of[-1,1]){const x=p.x+p.tz*side*4.2,z=p.z-p.tx*side*4.2,y=track.terrainHeight(x,z),h=Math.max(.3,p.y-y);box(.8,h,.8,concrete,x,y+h/2,z);addCollider(x,z,.45,y)}}
 function sign(text,x,z,w=20,y=null){const cv=document.createElement('canvas');cv.width=768;cv.height=100;const ctx=cv.getContext('2d');ctx.fillStyle='#233c37';ctx.fillRect(0,0,768,100);ctx.fillStyle='#f5eed3';ctx.font='bold 44px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,52,730);const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;owned.add(texture);const m=new THREE.SpriteMaterial({map:texture,depthTest:true});owned.add(m);const o=new THREE.Sprite(m);o.position.set(x,(y??track.terrainHeight(x,z))+4,z);o.scale.set(w,w/7.68,1);group.add(o)}
 for(const [name,x,z,w]of [['ORAN PARK RACEWAY',613,367,32],['THE SWEEPER',891,315,18],['CHAMPION CURVE',724,106,20],['BRIDGE',834,255,12],["FOSTER’S DIP",689,346,17],['MOMO CORNER',534,221,20],['THE DOGLEG',398,396,18],['RECARO CORNER',334,574,20]]){const p=oranPoint(x,z);sign(name,p.x,p.z,w)}
 // Low pit garages sit outside the main straight, below the control tower.
 const start=track.nodes[0],pit=new THREE.Group();pit.position.set(start.x-start.tz*13,start.y-.3,start.z+start.tx*13);pit.rotation.y=start.heading;group.add(pit);
 box(7,.15,65,concrete,0,0,0,pit);box(5,2.6,49,white,0,1.3,0,pit);box(5.7,.3,51,roof,0,2.8,0,pit);
 for(let z=-21;z<=21;z+=4.2){box(.06,1.9,3.4,glass,2.54,1.05,z,pit);const pos=new THREE.Vector3(0,1,z).applyAxisAngle(new THREE.Vector3(0,1,0),pit.rotation.y).add(pit.position);addCollider(pos.x,pos.z,2.6,pos.y)}
 box(5,7,5,white,0,3.5,-29,pit);box(5.25,1.5,5.25,glass,0,6,-29,pit);const towerRoof=add(new THREE.ConeGeometry(4,2,4),red,0,8,-29,pit);towerRoof.rotation.y=Math.PI/4;
 sign('START / FINISH',start.x,start.z,14,start.y);
 // Sparse eucalyptus groves leave every racing corridor clear.
 let seed=7351;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},points=[];
 for(let i=0;i<650&&points.length<150;i++){const x=(random()-.5)*(width-10),z=(random()-.5)*(depth-10);if(track.terrainDistance(x,z)<10||Math.hypot(x-pit.position.x,z-pit.position.z)<35)continue;points.push({x,z,y:track.terrainHeight(x,z),s:1.8+random()*1.9})}
 const tg=new THREE.CylinderGeometry(.2,.3,1,6),lg=new THREE.IcosahedronGeometry(1,1);owned.add(tg);owned.add(lg);const trunks=new THREE.InstancedMesh(tg,trunk,points.length),leaves=new THREE.InstancedMesh(lg,leaf,points.length),dummy=new THREE.Object3D();
 points.forEach((p,i)=>{dummy.position.set(p.x,p.y+p.s*.6,p.z);dummy.scale.set(1,p.s*1.2,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=p.y+p.s*1.45;dummy.scale.set(p.s*.8,p.s*.65,p.s*.8);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);addCollider(p.x,p.z,.32,p.y)});trunks.castShadow=true;leaves.castShadow=true;group.add(trunks,leaves);
 return{dispose(){for(const r of owned)r.dispose();group.removeFromParent()}};
}
