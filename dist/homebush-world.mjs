import * as THREE from './three.module.mjs';
import {homebushPoint as point} from './homebush.mjs';
export function buildHomebushWorld({world,track,addCollider}){
 const group=new THREE.Group(),owned=new Set(),signs=[];group.name='Homebush Olympic Park precinct';world.add(group);
 const mat=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.82});owned.add(m);return m;};
 const grass=mat(0x8b9c70),stone=mat(0xdbceb2),dark=mat(0x344147),roof=mat(0xaab6b1),white=mat(0xe8e6d9),seat=mat(0x557997),trunk=mat(0x80684c),leaf=mat(0x52774b);
 const mesh=(geo,m,x=0,y=0,z=0,parent=group)=>{owned.add(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,m,x,y,z,parent=group)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const ground=(x,z)=>track.terrainHeight(x,z);
 const terrain=new THREE.PlaneGeometry(310,240,110,90);terrain.rotateX(-Math.PI/2);const pos=terrain.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,ground(pos.getX(i),pos.getZ(i)));terrain.computeVertexNormals();mesh(terrain,grass);box(310,2,240,stone,0,-.6,0);
 function sign(text,x,z,width=20,height=5){const p=point(x,z),c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#193d45';ctx.fillRect(0,0,512,96);ctx.fillStyle='#fff0cc';ctx.font='bold 38px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48,490);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;owned.add(t);const m=new THREE.SpriteMaterial({map:t});owned.add(m);const s=new THREE.Sprite(m);s.position.set(p.x,ground(p.x,p.z)+height,p.z);s.scale.set(width,width*96/512,1);s.name='Homebush overview label';group.add(s);signs.push(s);}
 function building(x,z,w,d,h,m=stone,angle=0){const p=point(x,z),g=new THREE.Group();g.position.set(p.x,ground(p.x,p.z),p.z);g.rotation.y=angle;group.add(g);box(w,h,d,m,0,h/2,0,g);box(w+.35,.25,d+.35,roof,0,h+.12,0,g);for(let xx=-w/2+1;xx<w/2-.4;xx+=2)for(let yy=1;yy<h-.3;yy+=1.6)box(.9,.8,.04,dark,xx,yy,d/2+.025,g);if(track.terrainDistance(p.x,p.z)>Math.hypot(w,d)/2+5)addCollider(p.x,p.z,Math.hypot(w,d)/2,ground(p.x,p.z));return g;}
 function stand(x,z,length,angle=0){const p=point(x,z),g=new THREE.Group();g.position.set(p.x,ground(p.x,p.z),p.z);g.rotation.y=angle;group.add(g);for(let row=0;row<6;row++){box(length,.5+row*.55,1.1,stone,0,(.5+row*.55)/2,row*1.1,g);box(length-.4,.1,.65,seat,0,.65+row*.55,row*1.1,g);}box(length+1,.22,8,roof,0,5,2.6,g);for(const x of[-length/2,length/2])box(.2,5,.2,white,x,2.5,5,g);}

 // Stylised 2009–2016 precinct landmarks; positions follow the historic map.
 function stadium(x,z,rx,rz,label){const p=point(x,z),g=new THREE.Group();g.position.set(p.x,ground(p.x,p.z),p.z);group.add(g);
  const field=mesh(new THREE.CircleGeometry(1,48),grass,0,.16,0,g);field.rotation.x=-Math.PI/2;field.scale.set(rx*.75,rz*.75,1);
  for(let row=0;row<5;row++){const ring=mesh(new THREE.TorusGeometry(1,.065,6,64),row%2?seat:white,0,1+row*.7,0,g);ring.rotation.x=Math.PI/2;ring.scale.set(rx+row*.7,rz+row*.7,5);}
  for(const side of[-1,1]){const canopy=box(rx*1.55,.5,5,roof,0,5.8,side*rz*.88,g);canopy.rotation.x=side*.12;}
  sign(label,x,z,rx*1.5,9);
 }
 stadium(333,345,32,40,'ANZ STADIUM');
 stadium(567,180,28,30,'SHOWGROUND STADIUM');
 const arena=building(333,166,37,27,8,white);box(39,1.4,29,roof,0,8.3,0,arena);sign('OLYMPIC ARENA',333,166,30,12);
 // Exhibition halls behind the Australia Avenue pits housed the indoor paddock.
 for(let i=0;i<3;i++)building(655,267+i*42,22,12,5.5,white);
 sign('SHOWGROUND PADDOCK',650,298,29,9);
 const pit=building(711,342,4,62,3.2,white);for(let z=-28;z<30;z+=5)box(.06,2.5,3.7,dark,2.03,1.3,z,pit);
 stand(786,345,58,Math.PI/2);stand(558,18,50);stand(150,410,30,Math.PI/2);
 sign('SYDNEY 500',809,397,18,5);sign('OLYMPIC CHICANE',390,15,25,5);
 sign('DAWN FRASER AVENUE',354,506,32,4);
 // Station canopy lies south of Murray Rose Avenue, between the final chicanes.
 const station=building(587,464,36,7,2.5,white);box(38,.45,9,roof,0,3,0,station);sign('OLYMPIC PARK STATION',587,464,29,6);
 building(490,519,13,12,19,stone);sign('NOVOTEL',490,519,17,22);
 // Boulevard paving and lights make the interior read as a civic precinct.
 for(let i=0;i<11;i++){const p=point(440,145+i*25);if(track.terrainDistance(p.x,p.z)<10)continue;box(4,.12,8,stone,p.x,ground(p.x,p.z)+.08,p.z);}
 for(let i=0;i<track.n;i+=85){const n=track.nodes[i],x=n.x+n.tz*9,z=n.z-n.tx*9;if(track.terrainDistance(x,z)<7)continue;box(.16,6,.16,dark,x,ground(x,z)+3,z);box(1,.2,.45,white,x,ground(x,z)+6,z);}
 // Safety fence is outside the existing continuous collision barriers.
 for(let i=0;i<track.n;i+=12)for(const side of[-1,1]){const n=track.nodes[i],d=(track.course.width/2+.95)*side,x=n.x+n.tz*d,z=n.z-n.tx*d;box(.075,2.1,.075,dark,x,n.y+1.05,z);}
 // A few low team transporters behind the exhibition halls.
 for(let i=0;i<6;i++){const p=point(613,270+i*20);box(7,2.2,3,i%2?white:seat,p.x,ground(p.x,p.z)+1.1,p.z);}
 let seed=500;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;},trees=[];
 for(let i=0;i<1000&&trees.length<100;i++){const x=(random()-.5)*294,z=(random()-.5)*226;if(track.terrainDistance(x,z)<12)continue;
  // Reserve landmark footprints and the central spectator plazas.
  if(x>-96&&x<98&&z>-73&&z<98)continue;trees.push({x,z,h:3+random()*2});}
 const tg=new THREE.CylinderGeometry(.2,.32,1,6),lg=new THREE.SphereGeometry(1,10,7);owned.add(tg);owned.add(lg);
 const trunks=new THREE.InstancedMesh(tg,trunk,trees.length),leaves=new THREE.InstancedMesh(lg,leaf,trees.length),dummy=new THREE.Object3D();
 trees.forEach((p,i)=>{const y=ground(p.x,p.z);dummy.position.set(p.x,y+p.h/2,p.z);dummy.scale.set(1,p.h,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=y+p.h;dummy.scale.set(1.8,2.1,1.8);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);addCollider(p.x,p.z,.32,y);});group.add(trunks,leaves);
 return{update({racing}){for(const sign of signs)sign.visible=!racing;},dispose(){for(const r of owned)r.dispose();group.removeFromParent();}};
}
