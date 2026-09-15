import * as THREE from './three.module.mjs';
import {adelaidePoint as point} from './adelaide.mjs';
export function buildAdelaideWorld({world,track,addCollider}){
 const group=new THREE.Group(),owned=new Set();group.name='Adelaide parklands and street circuit precinct';world.add(group);
 const mat=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.82});owned.add(m);return m;};
 const grass=mat(0x8b9c70),stone=mat(0xdbceb2),dark=mat(0x344147),roof=mat(0xaab6b1),white=mat(0xe8e6d9),seat=mat(0x557997),trunk=mat(0x80684c),leaf=mat(0x52774b);
 const mesh=(geo,m,x=0,y=0,z=0,parent=group)=>{owned.add(geo);const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,m,x,y,z,parent=group)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const ground=(x,z)=>track.terrainHeight(x,z);
 const terrain=new THREE.PlaneGeometry(330,380,100,114);terrain.rotateX(-Math.PI/2);const pos=terrain.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,ground(pos.getX(i),pos.getZ(i)));terrain.computeVertexNormals();mesh(terrain,grass);box(330,2,380,stone,0,-.6,0);
 function sign(text,x,z,width=20,height=5){const p=point(x,z),c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#193d45';ctx.fillRect(0,0,512,96);ctx.fillStyle='#fff0cc';ctx.font='bold 38px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48,490);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;owned.add(t);const m=new THREE.SpriteMaterial({map:t});owned.add(m);const s=new THREE.Sprite(m);s.position.set(p.x,ground(p.x,p.z)+height,p.z);s.scale.set(width,width*96/512,1);group.add(s);}
 function building(x,z,w,d,h,m=stone,angle=0){const p=point(x,z),g=new THREE.Group();g.position.set(p.x,ground(p.x,p.z),p.z);g.rotation.y=angle;group.add(g);box(w,h,d,m,0,h/2,0,g);box(w+.35,.25,d+.35,roof,0,h+.12,0,g);for(let xx=-w/2+1;xx<w/2-.4;xx+=2)for(let yy=1;yy<h-.3;yy+=1.6)box(.9,.8,.04,dark,xx,yy,d/2+.025,g);if(track.terrainDistance(p.x,p.z)>Math.hypot(w,d)/2+5)addCollider(p.x,p.z,Math.hypot(w,d)/2,ground(p.x,p.z));return g;}
 function stand(x,z,length,angle=0){const p=point(x,z),g=new THREE.Group();g.position.set(p.x,ground(p.x,p.z),p.z);g.rotation.y=angle;group.add(g);for(let row=0;row<6;row++){box(length,.5+row*.55,1.1,stone,0,(.5+row*.55)/2,row*1.1,g);box(length-.4,.1,.65,seat,0,.65+row*.55,row*1.1,g);}box(length+1,.22,8,roof,0,5,2.6,g);for(const x of[-length/2,length/2])box(.2,5,.2,white,x,2.5,5,g);}
 // Pit complex and paddock follow the diagonal start/finish straight.
 const a=point(1110,459),b=point(1360,283),angle=-Math.atan2(b.z-a.z,b.x-a.x);
 const pit=building(1240,360,78,5,3.4,white,angle);for(let x=-36;x<37;x+=4)box(3.2,2.5,.06,dark,x,1.3,2.54,pit);
 stand(1275,439,82,angle);stand(1003,520,26,angle);stand(655,546,28,Math.PI/2);stand(895,230,25,.8);stand(1500,300,22,1.57);
 sign('ADELAIDE 500',1290,418,28,8);sign('SENNA CHICANE',1064,574,19,5);sign('TURN 8',662,497,15,5);sign('VICTORIA PARK',1250,760,25,2.5);
 // Team transporters and tents occupy the Victoria Park paddock.
 for(let i=0;i<8;i++){const p=point(1150+i*24,348-i*12);box(5,2.5,2.5,i%2?white:seat,p.x,ground(p.x,p.z)+1.25,p.z);}
 for(let i=0;i<7;i++){const p=point(1120+i*33,700);mesh(new THREE.ConeGeometry(3,2,4),white,p.x,ground(p.x,p.z)+2.5,p.z).rotation.y=Math.PI/4;box(4,1.5,4,stone,p.x,ground(p.x,p.z)+.75,p.z);}
 // Event concert stage in the park beyond the main straight.
 const stage=point(1280,560);box(17,1,9,dark,stage.x,ground(stage.x,stage.z)+.5,stage.z);box(18,.3,10,roof,stage.x,ground(stage.x,stage.z)+7,stage.z);for(const side of[-1,1])box(.4,7,.4,dark,stage.x+side*8.5,ground(stage.x,stage.z)+3.5,stage.z);sign('ADELAIDE',1280,560,15,5);
 // City-front terraces on the public-road side; parkland stays open inside.
 for(let i=0;i<10;i++)building(1000,765+i*29,6,7,3+(i%3),i%2?stone:white);
 for(let i=0;i<7;i++)building(740+i*36,1180,8,6,4+(i%2)*2);
 // Rymill Park lawn and lake are outside Brock Straight.
 const lake=point(575,823),lg=new THREE.CircleGeometry(1,48);lg.rotateX(-Math.PI/2);const water=mesh(lg,mat(0x589aaa),lake.x,ground(lake.x,lake.z)+.04,lake.z);water.scale.set(16,1,23);
 sign('RYMILL PARK',570,756,18,3);
 // Temporary pedestrian bridges, with supports outside both barriers.
 for(const [x,z]of[[955,839],[966,316],[1090,504]]){const p=point(x,z),index=track.nodes.reduce((best,n,i)=>Math.hypot(n.x-p.x,n.z-p.z)<Math.hypot(track.nodes[best].x-p.x,track.nodes[best].z-p.z)?i:best,0),n=track.nodes[index],g=new THREE.Group();g.position.set(n.x,n.y,n.z);g.rotation.y=n.heading;group.add(g);box(20,.3,1.8,roof,0,5.5,0,g);box(20,.75,.08,white,0,6,-.85,g);for(const side of[-1,1])box(.3,5.5,.3,dark,side*9.6,2.75,0,g);}
 let seed=826;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;},trees=[];
 for(let i=0;i<1500&&trees.length<180;i++){const x=(random()-.5)*308,z=(random()-.5)*355;if(track.terrainDistance(x,z)<12||x>5&&z<-13||x>-20&&z>30||Math.hypot((x-lake.x)/16,(z-lake.z)/23)<1.2)continue;trees.push({x,z,h:3+random()*2});}
 const tg=new THREE.CylinderGeometry(.22,.35,1,7),lg2=new THREE.SphereGeometry(1,12,8);owned.add(tg);owned.add(lg2);const trunks=new THREE.InstancedMesh(tg,trunk,trees.length),leaves=new THREE.InstancedMesh(lg2,leaf,trees.length),dummy=new THREE.Object3D();
 trees.forEach((p,i)=>{const y=ground(p.x,p.z);dummy.position.set(p.x,y+p.h/2,p.z);dummy.scale.set(1,p.h,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=y+p.h;dummy.scale.set(1.8,2.1,1.8);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);addCollider(p.x,p.z,.35,y);});group.add(trunks,leaves);
 return{dispose(){for(const r of owned)r.dispose();group.removeFromParent();}};
}
