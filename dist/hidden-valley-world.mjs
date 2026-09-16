import * as THREE from './three.module.mjs';
import {hiddenValleyPoint as point} from './hidden-valley.mjs';
// Hidden Valley Motorsports Complex as miniature diorama scenery: the pit
// garages and race control beside the main straight, the drag strip running
// alongside it, grassed spectator terraces instead of a grandstand, the Turn 6
// amphitheatre, the dirt speedway, kart and motocross tracks, and Top End
// savanna woodland. Buildings are simplified and sponsor branding is omitted.
export function buildHiddenValleyWorld({world,track,addCollider}){
 const group=new THREE.Group(),owned=new Set();group.name='Hidden Valley Motorsports Complex';world.add(group);
 const mat=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.87});owned.add(m);return m;};
 const cream=mat(0xe7e0c8),dark=mat(0x36413f),roof=mat(0x8fa0a0),white=mat(0xf1ecdc),steel=mat(0xb9c0bd),
  asphalt=mat(0x6f7673),laterite=mat(0x9d5a3a),dust=mat(0xc8b07e),turf=mat(0x8d9a58),
  trunk=mat(0x8a7a5e),leaf=mat(0x5f7d46),frond=mat(0x6f9250),mound=mat(0xa9663f),tyre=mat(0x2b2b2b);
 const mesh=(g,m,x=0,y=0,z=0,parent=group)=>{owned.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,m,x,y,z,parent=group)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const ground=(x,z)=>track.terrainHeight(x,z);
 // Scenery never blocks the circuit: colliders are only placed well off it.
 const solid=(x,z,r,y)=>{if(track.terrainDistance(x,z)>track.course.width/2+r+1.6)addCollider(x,z,r,y);};
 // Savanna board: dry Top End grass over the whole site, following the relief.
 const [w,d]=track.course.mapSize,plane=new THREE.PlaneGeometry(w,d,180,104);plane.rotateX(-Math.PI/2);
 const pos=plane.attributes.position,colors=[],tint=new THREE.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,ground(x,z));
  tint.setHex(0x9c9256).multiplyScalar(1+.05*Math.sin(x*.17)*Math.cos(z*.13)+.03*Math.sin(z*.31));colors.push(tint.r,tint.g,tint.b);}
 plane.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));plane.computeVertexNormals();
 const savanna=mat(0xffffff);savanna.vertexColors=true;mesh(plane,savanna).name='Hidden Valley savanna and undulating board';
 box(w,2.5,d,mat(0x8a6a48),0,-1.55,0);
 // Flat ribbons (aprons, strips, lanes) that follow the board relief.
 function ribbon(a,b,width,material,lift=.05,name=''){
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<1e-4)return null;
  const nx=dz/len*width/2,nz=-dx/len*width/2,steps=Math.max(2,Math.round(len/6)),vertices=[];
  for(let i=0;i<steps;i++){
   const t0=i/steps,t1=(i+1)/steps,p0={x:a.x+dx*t0,z:a.z+dz*t0},p1={x:a.x+dx*t1,z:a.z+dz*t1};
   const q=(p,s)=>[p.x+nx*s,ground(p.x+nx*s,p.z+nz*s)+lift,p.z+nz*s];
   vertices.push(...q(p0,-1),...q(p1,-1),...q(p1,1),...q(p0,-1),...q(p1,1),...q(p0,1));
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
  const m=material.clone();m.side=THREE.DoubleSide;owned.add(m);const o=mesh(g,m);o.name=name;o.userData.surface=true;return o;
 }
 function sign(text,x,z,width=22,height=4){const p=point(x,z),c=document.createElement('canvas');c.width=640;c.height=90;const ctx=c.getContext('2d');
  ctx.fillStyle='#33231a';ctx.fillRect(0,0,640,90);ctx.fillStyle='#ffe9b0';ctx.font='bold 42px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,320,45,615);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;owned.add(t);const m=new THREE.SpriteMaterial({map:t});owned.add(m);
  const s=new THREE.Sprite(m);s.position.set(p.x,ground(p.x,p.z)+height,p.z);s.scale.set(width,width*90/640,1);group.add(s);}
 // Sealed and gravel escape areas outside the heavy braking zones.
 for(const [name,side] of[['Turn 1',1],['Turn 5',1],['Turn 6 · The Bowl',1],['Turn 10',-1],['Turn 14',1]]){
  const index=track.sections.find(s=>s.name===name)?.index;if(index===undefined)continue;const vertices=[];
  for(const wall of track.barriers.filter(b=>b.side===side&&Math.abs(b.index-index)<30)){
   const a=track.nodes[wall.index],b=track.nodes[(wall.index+1)%track.n],edge=(track.course.width/2+.12)*side,at=(x,z)=>[x,ground(x,z)+.03,z];
   const aa=at(a.x+a.tz*edge,a.z-a.tx*edge),bb=at(b.x+b.tz*edge,b.z-b.tx*edge),aw=at(wall.ax,wall.az),bw=at(wall.bx,wall.bz);
   vertices.push(...aa,...aw,...bb,...aw,...bw,...bb);
  }
  if(!vertices.length)continue;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
  const m=asphalt.clone();m.side=THREE.DoubleSide;owned.add(m);const o=mesh(g,m);o.name=name+' sealed runoff';o.userData.surface=true;
 }
 // Start/finish gantry and the grid squares on the main straight.
 const sf=track.nodes[0],gantry=new THREE.Group();gantry.position.set(sf.x,sf.y,sf.z);gantry.rotation.y=sf.heading;group.add(gantry);
 box(15,.9,1.1,dark,0,7.4,0,gantry);box(13,.55,.2,white,0,6.55,.6,gantry);
 for(const side of[-1,1]){box(.7,7,.7,steel,side*6.6,3.5,0,gantry);solid(sf.x+sf.tz*side*6.6,sf.z-sf.tx*side*6.6,.6,sf.y);}
 box(.5,.05,track.course.width-.4,white,0,.02,0,gantry).userData.surface=true;
 for(let i=0;i<8;i++){const g=box(1.6,.04,2.4,white,i%2?2.4:-2.4,.02,-6-Math.floor(i/2)*7,gantry);g.userData.surface=true;}
 // Pit lane, the 30-garage block and race control, inside the main straight.
 ribbon(point(110,34),point(910,34),4.4,asphalt,.06,'Pit lane');
 for(let i=0;i<27;i++){const p=point(126+i*29,26);box(3,.06,.3,white,p.x,ground(p.x,p.z)+.09,p.z);}
 const pit=point(500,62),py=ground(pit.x,pit.z);
 box(84,3.4,7,cream,pit.x,py+1.7,pit.z);box(86,.4,8.6,roof,pit.x,py+3.6,pit.z);
 for(let i=0;i<30;i++)box(2.1,2.5,.12,dark,pit.x-40+i*2.76,py+1.25,pit.z-3.6);
 for(let x=-36;x<=36;x+=9)solid(pit.x+x,pit.z,3.4,py);
 const tower=point(322,84),ty=ground(tower.x,tower.z);
 box(11,9,9,cream,tower.x,ty+4.5,tower.z);box(12.5,2.6,10.5,dark,tower.x,ty+10.3,tower.z);box(13.5,.45,11.5,roof,tower.x,ty+11.8,tower.z);
 solid(tower.x,tower.z,6,ty);sign('RACE CONTROL',322,84,17,13.6);
 // The ANDRA drag strip runs alongside the main straight, outside the circuit.
 ribbon(point(70,-92),point(1000,-92),10,asphalt,.05,'Drag strip');
 ribbon(point(70,-92),point(1000,-92),.8,dust,.07,'Drag strip centre line');
 const tree=point(126,-92),tyy=ground(tree.x,tree.z);
 for(const side of[-1,1]){box(.5,6,.5,steel,tree.x,tyy+3,tree.z+side*2.1);
  for(let i=0;i<5;i++)mesh(new THREE.SphereGeometry(.4,10,8),i<3?mat(0xe2b93c):i===3?mat(0x63c05a):mat(0xd4523f),tree.x,tyy+1.7+i*.9,tree.z+side*2.1);}
 const dragTower=point(166,-118),dy=ground(dragTower.x,dragTower.z);
 box(7,6,6,white,dragTower.x,dy+3,dragTower.z);box(8,.35,7,roof,dragTower.x,dy+6.3,dragTower.z);solid(dragTower.x,dragTower.z,4.5,dy);
 sign('HIDDEN VALLEY DRAG STRIP',440,-118,30,5.5);
 for(let i=0;i<9;i++){const p=point(236+i*36,-134),y=ground(p.x,p.z);box(5,2.4,2.6,i%2?white:steel,p.x,y+1.2,p.z);solid(p.x,p.z,2.2,y);}
 // Grassed spectator terraces: Hidden Valley has banks and shade, no grandstand.
 function terrace(x,z,length,angle,rows=5,step=1.5){const p=point(x,z),y=ground(p.x,p.z),g=new THREE.Group();
  g.position.set(p.x,y,p.z);g.rotation.y=angle;group.add(g);
  for(let row=0;row<rows;row++)box(length,.45+row*.5,step,turf,0,(.45+row*.5)/2,row*step,g);
  const depth=rows*step/2;for(let t=-length/2;t<=length/2;t+=5)solid(p.x+Math.cos(angle)*t+Math.sin(angle)*depth,p.z-Math.sin(angle)*t+Math.cos(angle)*depth,2.6,y);
  return g;}
 function shade(x,z,size=9){const p=point(x,z),y=ground(p.x,p.z);
  box(size,.25,size,white,p.x,y+3.4,p.z);
  for(const a of[-1,1])for(const b of[-1,1])box(.22,3.4,.22,steel,p.x+a*size*.42,y+1.7,p.z+b*size*.42);
  solid(p.x,p.z,size*.5,y);}
 terrace(360,170,52,0,6);terrace(720,170,44,0,6);shade(452,206);shade(700,206);
 // Spectators also line the outside of the main straight, between it and the strip.
 terrace(400,-36,56,Math.PI,4);terrace(760,-36,44,Math.PI,4);
 sign('HIDDEN VALLEY RACEWAY',520,214,42,8);sign('DARWIN · NORTHERN TERRITORY',520,240,26,3.6);
 // Turn 6 sits in a natural amphitheatre: terraced banks wrap its outside.
 for(let i=0;i<3;i++)terrace(1074,268+i*52,26,Math.PI/2,4,1.5);
 sign('THE BOWL · TURN 6',1096,352,20,6);
 terrace(150,520,42,.15,5);shade(276,538);sign('TURN 10',190,508,15,4.4);
 // Tyre-wall chicane on the exit of Turn 5, as used to stop the short cut.
 const t5=track.sections.find(s=>s.name==='Turn 5');
 if(t5)for(let i=0;i<16;i++){const n=track.nodes[(t5.index+18+i*3)%track.n],off=track.course.width/2+2.2+(i%2)*.8,x=n.x+n.tz*off,z=n.z-n.tx*off;
  mesh(new THREE.CylinderGeometry(.5,.5,.42,10),tyre,x,ground(x,z)+.21,z);}
 // Paddock: transporters, awnings and scrutineering behind the garages.
 for(let i=0;i<11;i++){const p=point(250+i*46,112),y=ground(p.x,p.z);box(6,2.8,3,i%3?white:cream,p.x,y+1.4,p.z);box(1.9,2,3,dark,p.x+3.8,y+1,p.z);solid(p.x,p.z,2.6,y);}
 for(let i=0;i<8;i++){const p=point(280+i*58,140),y=ground(p.x,p.z);
  mesh(new THREE.ConeGeometry(3.4,2.2,4),white,p.x,y+2.8,p.z).rotation.y=Math.PI/4;box(4.4,1.6,4.4,cream,p.x,y+.8,p.z);solid(p.x,p.z,2.6,y);}
 // Northline Speedway: a 400 m dirt oval outside the circuit.
 const oval=point(930,545),oy=ground(oval.x,oval.z),ring=new THREE.RingGeometry(1,1.34,44);ring.rotateX(-Math.PI/2);
 const dirt=mesh(ring,laterite,oval.x,oy+.06,oval.z);dirt.scale.set(17,1,11);dirt.name='Northline Speedway';dirt.userData.surface=true;
 for(let i=0;i<32;i++){const a=i/32*Math.PI*2,x=oval.x+Math.cos(a)*17*1.44,z=oval.z+Math.sin(a)*11*1.5;
  box(2.6,1.1,.3,white,x,ground(x,z)+.55,z).rotation.y=-a;solid(x,z,.5,ground(x,z));}
 sign('NORTHLINE SPEEDWAY',930,470,24,5);
 // Kart circuit in the western infield, motocross beside the Turn 6 bowl.
 const kart=[[150,290],[250,276],[322,300],[334,344],[268,358],[212,338],[166,356],[124,330]].map(([x,z])=>point(x,z));
 for(let i=0;i<kart.length;i++)ribbon(kart[i],kart[(i+1)%kart.length],3.4,asphalt,.06,'Kart circuit');
 sign('KART CIRCUIT',236,316,17,3.4);
 const mx=point(806,330);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2,x=mx.x+Math.cos(a)*13,z=mx.z+Math.sin(a)*8.5,y=ground(x,z);
  mesh(new THREE.SphereGeometry(1.4,10,6),laterite,x,y-.1,z).scale.set(1.6,.8,1);solid(x,z,1.5,y);}
 sign('MOTOCROSS',806,296,16,3.6);
 // Termite mounds, woodland and palms: Top End scenery, clear of the circuit.
 let seed=4471;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const free=(x,z,margin)=>track.terrainDistance(x,z)>track.course.width/2+margin;
 const mounds=[];for(let i=0;i<1400&&mounds.length<70;i++){const x=(random()-.5)*(w-16),z=(random()-.5)*(d-16);if(free(x,z,8))mounds.push({x,z,h:1.4+random()*2.1});}
 const mg=new THREE.ConeGeometry(.62,1,6);owned.add(mg);const hills=new THREE.InstancedMesh(mg,mound,mounds.length),dummy=new THREE.Object3D();
 mounds.forEach((p,i)=>{const y=ground(p.x,p.z);dummy.rotation.set(0,random()*6,0);dummy.position.set(p.x,y+p.h/2,p.z);dummy.scale.set(1,p.h,1);dummy.updateMatrix();hills.setMatrixAt(i,dummy.matrix);solid(p.x,p.z,.6,y);});
 hills.name='Cathedral termite mounds';group.add(hills);
 const trees=[];for(let i=0;i<3200&&trees.length<190;i++){const x=(random()-.5)*(w-12),z=(random()-.5)*(d-12);
  if(free(x,z,11)&&!mounds.some(m=>Math.hypot(m.x-x,m.z-z)<6))trees.push({x,z,h:3.4+random()*2.6,palm:random()<.28});}
 const tg=new THREE.CylinderGeometry(.2,.32,1,6),lg=new THREE.IcosahedronGeometry(1,1);owned.add(tg);owned.add(lg);
 const woodland=trees.filter(t=>!t.palm),palms=trees.filter(t=>t.palm);
 const trunks=new THREE.InstancedMesh(tg,trunk,trees.length),leaves=new THREE.InstancedMesh(lg,leaf,woodland.length);
 trees.forEach((p,i)=>{const y=ground(p.x,p.z);dummy.rotation.set(0,0,0);dummy.position.set(p.x,y+p.h/2,p.z);dummy.scale.set(p.palm?.75:1,p.h,p.palm?.75:1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);solid(p.x,p.z,.33,y);});
 woodland.forEach((p,i)=>{const y=ground(p.x,p.z);dummy.position.set(p.x,y+p.h,p.z);dummy.scale.set(2.2,1.6,2.2);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);});
 trunks.name='Top End woodland';group.add(trunks,leaves);
 const fg=new THREE.ConeGeometry(.42,2.6,4);owned.add(fg);const fronds=new THREE.InstancedMesh(fg,frond,Math.max(1,palms.length*6));
 palms.forEach((p,i)=>{const y=ground(p.x,p.z);for(let k=0;k<6;k++){const a=k/6*Math.PI*2;
  dummy.position.set(p.x+Math.cos(a)*.9,y+p.h-.15,p.z+Math.sin(a)*.9);dummy.rotation.set(Math.sin(a)*1.05,-a,Math.cos(a)*1.05);dummy.scale.set(1,1,1);dummy.updateMatrix();fronds.setMatrixAt(i*6+k,dummy.matrix);}});
 fronds.count=palms.length*6;fronds.name='Top End palms';group.add(fronds);
 // Final safety pass: nothing but road markings and runoff may sit on the circuit.
 group.updateMatrixWorld(true);
 group.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o===savanna||o.userData.surface)return;
  const p=o.getWorldPosition(new THREE.Vector3());if(track.terrainDistance(p.x,p.z)<track.course.width/2+1.4)o.visible=false;});
 return{dispose(){for(const r of owned)r.dispose();group.removeFromParent();}};
}
