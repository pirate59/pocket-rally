import * as THREE from './three.module.mjs';
import {ALBERT_LAKE,albertPoint,lakeContains} from './albert-park.mjs';
export function buildAlbertWorld({world,track,addCollider}){
 const owned=new Set(),group=new THREE.Group();group.name='Albert Park lake, gardens and Melbourne skyline';world.add(group);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.9,...extra});owned.add(m);return m;};
 const grass=mat(0xffffff,{vertexColors:true}),stone=mat(0xd7d6bf),white=mat(0xece9de),navy=mat(0x284653),glass=mat(0x73949e,{roughness:.35}),trunk=mat(0x8b8068),leaf=mat(0x648553),blue=mat(0x3d7996);
 const mesh=(g,m,x=0,y=0,z=0,parent=group)=>{owned.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,m,x,y,z,parent=group)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const ground=(x,z)=>track.terrainHeight(x,z);
 // Gravel beds occupy the wider runoff beyond the painted road edge.
 const gravel=mat(0xc9b78f);
 for(const turn of[3,6,11]){const section=track.sections.find(s=>s.name==='Turn '+turn),v=[];
  for(let k=-16;k<16;k++){const a=track.nodes[(section.index+k+track.n)%track.n],b=track.nodes[(section.index+k+1+track.n)%track.n],edge=track.course.width/2+.42,outerA=edge+track.course.barrierOffsetAt(0,1,a)-.8,outerB=edge+track.course.barrierOffsetAt(0,1,b)-.8;
   const point=(p,d)=>{const x=p.x+p.tz*d,z=p.z-p.tx*d;return[x,ground(x,z)+.04,z];},aa=point(a,edge),ab=point(a,outerA),ba=point(b,edge),bb=point(b,outerB);v.push(...aa,...ab,...ba,...ab,...bb,...ba);
  }const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();mesh(g,gravel).material.side=THREE.DoubleSide;
 }
 const [width,depth]=track.course.mapSize,geo=new THREE.PlaneGeometry(width,depth,190,216);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position,colors=[],c=new THREE.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=ground(x,z);pos.setY(i,h);c.setHex(0x8ba46d).multiplyScalar(1+.065*Math.sin(x*.15)*Math.sin(z*.11));colors.push(c.r,c.g,c.b);}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();mesh(geo,grass).name='Gently contoured parkland';
 box(width,3,depth,mat(0x8c8060),0,-1.95,0);
 // A real lake silhouette, rather than a circular pond, anchors the diorama.
 const shape=new THREE.Shape();ALBERT_LAKE.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
 const lake=mesh(new THREE.ShapeGeometry(shape),mat(0x438f9d,{roughness:.32,metalness:.18}),0,.12,0);lake.rotation.x=-Math.PI/2;lake.name='Albert Park Lake';
 const beam=(a,b,w,h,m)=>{const dx=b.x-a.x,dz=b.z-a.z,o=box(w,h,Math.hypot(dx,dz)+.1,m,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);o.rotation.y=Math.atan2(dx,dz);return o;};
 // Lakeside walking path and low stone edging follow the shoreline.
 const shore=[],matPath=mat(0xc8b995);
 for(let i=0;i<ALBERT_LAKE.length;i++){const a=ALBERT_LAKE[i],b=ALBERT_LAKE[(i+1)%ALBERT_LAKE.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);let nx=dz/len,nz=-dx/len;if(lakeContains((a.x+b.x)/2+nx,(a.z+b.z)/2+nz)){nx=-nx;nz=-nz;}
  beam({...a,y:.24},{...b,y:.24},.65,.2,stone);const aa={x:a.x+nx*1.2,z:a.z+nz*1.2,y:.29},bb={x:b.x+nx*1.2,z:b.z+nz*1.2,y:.29};beam(aa,bb,1.6,.07,matPath);shore.push(aa);
 }
 function sign(text,x,z,w=18,y=null){const cv=document.createElement('canvas');cv.width=768;cv.height=100;const ctx=cv.getContext('2d');ctx.fillStyle='#244843';ctx.fillRect(0,0,768,100);ctx.fillStyle='#f4eed5';ctx.font='bold 44px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,52,730);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;owned.add(tex);const m=new THREE.SpriteMaterial({map:tex,depthTest:true});owned.add(m);const o=new THREE.Sprite(m);o.position.set(x,(y??ground(x,z))+3.5,z);o.scale.set(w,w/7.68,1);group.add(o);}
 function building(x,z,w,d,h,rotation=0){const g=new THREE.Group();g.position.set(x,ground(x,z),z);g.rotation.y=rotation;group.add(g);box(w,h,d,white,0,h/2,0,g);box(w+.7,.35,d+.7,navy,0,h+.15,0,g);box(w+.04,.9,d+.04,glass,0,h*.68,0,g);for(let v=-d/2+1;v<d/2;v+=3){const p=new THREE.Vector3(0,0,v).applyAxisAngle(new THREE.Vector3(0,1,0),rotation).add(g.position);addCollider(p.x,p.z,w/2,p.y);}return g;}
 const start=track.nodes[0],pitX=start.x-start.tz*14,pitZ=start.z+start.tx*14,pit=building(pitX,pitZ,7,66,3.6,start.heading);
 box(13,.07,77,stone,0,.01,0,pit);
 for(let z=-29;z<30;z+=4.6){box(.08,2.2,3.7,navy,3.55,1.2,z,pit);box(.12,.25,3.8,blue,3.61,2.5,z,pit);}
 box(7.8,.5,68,white,0,4.6,0,pit);for(let z=-28;z<=28;z+=7)box(.2,1,.2,navy,3.65,4.1,z,pit);
 sign('ALBERT PARK',pitX,pitZ,26,5);sign('START / FINISH',start.x,start.z,15,start.y+1.7);
 function grandstand(index,side,length=25){const p=track.nodes[index],g=new THREE.Group(),offset=track.course.width/2+9;g.position.set(p.x+p.tz*side*offset,ground(p.x+p.tz*side*offset,p.z-p.tx*side*offset),p.z-p.tx*side*offset);g.rotation.y=p.heading+(side===1?Math.PI:0);group.add(g);
  for(let row=0;row<5;row++){box(1.1,.7+row*.55,length,stone,-2.2+row*1.1,(.7+row*.55)/2,0,g);box(.7,.14,length-.6,row%2?white:blue,-2.2+row*1.1,.82+row*.55,0,g);}
  box(7,.22,length+2,navy,0,5.4,0,g);for(const z of[-length/2,length/2])box(.22,5.2,.22,white,3,2.6,z,g);
  for(let z=-length/2;z<=length/2;z+=3){const q=new THREE.Vector3(0,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),g.rotation.y).add(g.position);addCollider(q.x,q.z,3,q.y);}
 }
 grandstand(0,1,55);for(const turn of[1,3,6,11,14]){const s=track.sections.find(s=>s.name==='Turn '+turn||s.name.startsWith('Turn '+turn+' ·'));grandstand(s.index,1,turn===11?24:17);}
 // Lakeside Stadium and the aquatic centre sit west of the northern basin.
 const stadium=albertPoint(329,565),sg=new THREE.Group();sg.position.set(stadium.x,ground(stadium.x,stadium.z)+.1,stadium.z);group.add(sg);
 const trackRing=mesh(new THREE.RingGeometry(10,13,56),mat(0xb6684d),0,.03,0,sg);trackRing.rotation.x=-Math.PI/2;trackRing.scale.y=1.4;
 const field=mesh(new THREE.CircleGeometry(9.8,48),mat(0x6b9859),0,.05,0,sg);field.rotation.x=-Math.PI/2;field.scale.y=1.4;box(7,3,20,white,-15,1.5,0,sg);box(8,.2,21,navy,-15,3.2,0,sg);sign('LAKESIDE STADIUM',stadium.x,stadium.z,19);
 const aquatic=albertPoint(205,839);building(aquatic.x,aquatic.z,15,27,4,.55);
 for(const [mx,mz]of[[395,493],[395,611],[485,888]]){const p=albertPoint(mx,mz);building(p.x,p.z,5,8,2.2);const dock=albertPoint(mx+19,mz);box(7,.18,1.5,stone,dock.x,.3,dock.z);}
 // Fairways along the eastern park edge; sports ovals in the southern infield.
 for(const [x,z,rx,rz]of[[72,-102,12,25],[67,-54,11,26],[69,-4,12,24],[105,30,13,22],[55,116,14,18],[95,144,12,10]]){if(track.terrainDistance(x,z)<Math.max(rx,rz)+5||lakeContains(x,z))continue;const o=mesh(new THREE.CircleGeometry(1,40),mat(0x71955b),x,ground(x,z)+.03,z);o.rotation.x=-Math.PI/2;o.scale.set(rx,rz,1);box(.12,2,.12,white,x,ground(x,z)+1,z);const f=mesh(new THREE.PlaneGeometry(1,.55),blue,x+.5,ground(x,z)+1.8,z);f.material.side=THREE.DoubleSide;}
 // Small islands, boats and black swans give the lake a parkland character.
 for(const [mx,mz,s]of[[540,688,3],[340,731,2.3]]){const p=albertPoint(mx,mz),o=mesh(new THREE.SphereGeometry(1,16,8),mat(0x8b9d64),p.x,.18,p.z);o.scale.set(s,.35,s*1.8);}
 for(const [mx,mz]of[[520,540],[498,785],[590,886]]){const p=albertPoint(mx,mz);const hull=mesh(new THREE.SphereGeometry(1,12,6),white,p.x,.28,p.z);hull.scale.set(.6,.25,1.7);box(.06,2.5,.06,navy,p.x,1.5,p.z);const sail=new THREE.BufferGeometry();sail.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,2.2,0,0,0,1.25],3));sail.computeVertexNormals();mesh(sail,mat(0xf4e8c6,{side:THREE.DoubleSide}),p.x+.05,.5,p.z);}
 const black=mat(0x263739);for(let i=0;i<9;i++){const p=albertPoint(449+i*6,738+Math.sin(i)*12),o=mesh(new THREE.SphereGeometry(.4,8,6),black,p.x,.3,p.z);o.scale.z=1.6;mesh(new THREE.CylinderGeometry(.06,.08,.5,5),black,p.x,.62,p.z-.4);}
 // A deliberately compressed northern skyline evokes the views from the lake.
 for(let i=0;i<17;i++){const x=-75+i*12,z=-171+Math.sin(i*2)*4,h=10+(i*17%24),m=i%3?glass:navy;box(7+i%3,h,6,m,x,h/2+.2,z);box(4,.6,4,white,x,h+.5,z);for(let y=3;y<h-1;y+=3)box(7.1+i%3,.1,6.1,stone,x,y,z);}
 sign('MELBOURNE',17,-162,30,30);
 // Seeded groves with a full clearance corridor around every road and facility.
 let seed=7413;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},trees=[];
 for(let i=0;i<1500&&trees.length<250;i++){const x=(random()-.5)*(width-15),z=(random()-.5)*(depth-25),s=1.5+random()*1.8;if(lakeContains(x,z)||track.terrainDistance(x,z)<11||shore.some(p=>Math.hypot(p.x-x,p.z-z)<4)||Math.hypot(x-stadium.x,z-stadium.z)<23||Math.hypot(x-aquatic.x,z-aquatic.z)<20||Math.hypot(x-pitX,z-pitZ)<43||z<-154||Math.abs(x)>50&&z>-135&&z<25)continue;if(trees.some(p=>Math.hypot(p.x-x,p.z-z)<3))continue;trees.push({x,z,y:ground(x,z),s});}
 const tg=new THREE.CylinderGeometry(.16,.25,1,6),lg=new THREE.IcosahedronGeometry(1,1);owned.add(tg);owned.add(lg);const trunks=new THREE.InstancedMesh(tg,trunk,trees.length),leaves=new THREE.InstancedMesh(lg,leaf,trees.length),dummy=new THREE.Object3D();
 trees.forEach((p,i)=>{dummy.position.set(p.x,p.y+p.s*.6,p.z);dummy.scale.set(1,p.s*1.2,1);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=p.y+p.s*1.45;dummy.scale.set(p.s*.8,p.s*.7,p.s*.8);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);addCollider(p.x,p.z,.3,p.y);});trunks.castShadow=true;leaves.castShadow=true;group.add(trunks,leaves);
 return{dispose(){for(const r of owned)r.dispose();group.removeFromParent();}};
}
