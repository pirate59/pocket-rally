import * as THREE from './three.module.mjs';
import {createSceneryFader} from './grand-scenery.mjs';
import {rugPoint} from './carpet-layout.mjs';
import {drawBoostMarkers} from './boost-world.mjs';

export function buildCarpetWorld({world,track,addCollider}){
 const owned=[],textures=[],landmarks=[],pickups=[],materials=new Map();let group=world;
 const mat=c=>{if(!materials.has(c)){const m=new THREE.MeshStandardMaterial({color:c,roughness:.8});materials.set(c,m);owned.push(m)}return materials.get(c)};
 function mesh(geometry,c,x,y,z){const m=new THREE.Mesh(geometry,typeof c==='number'?mat(c):c);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m}
 const box=(c,x,y,z,w,h,d)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z);
 const cyl=(c,x,y,z,r,h)=>mesh(new THREE.CylinderGeometry(r,r,h,16),c,x,y,z);
 const ball=(c,x,y,z,r,sx=1,sy=1,sz=1)=>{const m=mesh(new THREE.SphereGeometry(r,12,8),c,x,y,z);m.scale.set(sx,sy,sz);return m};
 function label(text,x,y,z,w,d,bg='#f2eacb',fg='#314b51',standing=false){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 44px Arial';ctx.fillText(text,256,64,480);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);const material=new THREE.MeshStandardMaterial({map:t,roughness:1,side:THREE.DoubleSide});owned.push(material);const m=mesh(new THREE.PlaneGeometry(w,d),material,x,y,z);if(!standing)m.rotation.x=-Math.PI/2;m.castShadow=false;return m;
 }
 function line(c,a,b,width=.2,y=.13){const dx=b.x-a.x,dz=b.z-a.z,m=box(c,(a.x+b.x)/2,y,(a.z+b.z)/2,width,.035,Math.hypot(dx,dz));m.rotation.y=Math.atan2(dx,dz);m.castShadow=false;return m}
 function rect(c,px,py,pw,ph,y=.06){const p=rugPoint(px,py);const m=box(c,p.x,y,p.z,pw*.55,.04,ph*.55);m.castShadow=false;return m}
 function flatPoly(points,c,y=.035){const shape=new THREE.Shape();points.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();const m=mesh(new THREE.ShapeGeometry(shape),c,0,y,0);m.rotation.x=-Math.PI/2;m.castShadow=false;return m}
 function begin(name,px,py){group=new THREE.Group();group.name=name;const p=rugPoint(px,py);group.position.set(p.x,0,p.z);world.add(group)}
 function end(){
  // Batch each landmark by material so tall buildings do not draw every window separately.
  group.updateMatrixWorld(true);const batches=new Map(),inverse=group.matrixWorld.clone().invert(),transform=new THREE.Matrix4(),normal=new THREE.Matrix3(),v=new THREE.Vector3();
  group.traverse(o=>{if(!o.isMesh)return;if(!batches.has(o.material))batches.set(o.material,{p:[],n:[],uv:[],indices:[]});const b=batches.get(o.material),g=o.geometry,offset=b.p.length/3;transform.multiplyMatrices(inverse,o.matrixWorld);normal.getNormalMatrix(transform);
   for(let i=0;i<g.attributes.position.count;i++){v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(transform);b.p.push(v.x,v.y,v.z);v.fromBufferAttribute(g.attributes.normal,i).applyMatrix3(normal).normalize();b.n.push(v.x,v.y,v.z);b.uv.push(g.attributes.uv?.getX(i)||0,g.attributes.uv?.getY(i)||0)}
   for(let i=0;i<(g.index?.count||g.attributes.position.count);i++)b.indices.push(offset+(g.index?g.index.getX(i):i));g.dispose();
  });group.clear();const clones=[];
  for(const [material,b] of batches){const m=material.clone();owned.push(m);clones.push(m);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));g.setIndex(b.indices);const part=new THREE.Mesh(g,m);part.castShadow=true;part.receiveShadow=true;group.add(part)}
  landmarks.push({group,bounds:new THREE.Box3().setFromObject(group),materials:clones,opacity:1});group=world;
 }
 function collider(x,z,r){addCollider(group.position.x+x,group.position.z+z,r)}
 function tree(x,z,size=1){cyl(0x99663e,x,3*size,z,.45*size,6*size);ball(0x4b972f,x,7*size,z,2.6*size);ball(0x76bb3a,x-size,8*size,z,2*size);ball(0x88c944,x+size,7.4*size,z+size,1.8*size);collider(x,z,.65*size)}
 function bench(x,z,rotation=0){const parent=group,g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);group=g;box(0xd89b42,0,.9,0,3.8,.3,1.1);box(0xd89b42,0,1.8,-.5,3.8,1.1,.2);for(const a of[-1.4,1.4])box(0x714e33,a,.45,0,.25,.9,.8);group=parent}
 function building(x,z,w,d,height,color,name=''){
  box(color,x,height/2,z,w,height,d);const roof=mesh(new THREE.ConeGeometry(w*.76,3,4),0x574e4d,x,height+1.5,z);roof.rotation.y=Math.PI/4;roof.scale.z=d/w;
  const floors=Math.max(2,Math.floor(height/2.8)),cols=Math.max(2,Math.floor(w/2.4));
  for(let row=0;row<floors;row++)for(let col=0;col<cols;col++){const xx=x-w*.36+col*w*.72/(cols-1),yy=2+row*(height-3)/floors;box(0xf9eb9d,xx,yy,z+d/2+.035,1,1.5,.09);box(0x88c9dc,x+w/2+.035,yy,z-d*.25+col*d*.5/(cols-1),.09,1.5,.8)}
  box(0x477182,x,1.3,z+d/2+.08,1.6,2.6,.1);if(name)label(name,x,height-1,z+d/2+.12,w*.94,1.4,'#fff0b7','#435865',true);
  const r=Math.min(w,d)*.48,alongX=w>=d,half=Math.abs(w-d)/2;const count=Math.max(1,Math.ceil(half*2/r));for(let i=0;i<=count;i++){const at=-half+i*half*2/count;collider(x+(alongX?at:0),z+(alongX?0:at),r)}
 }
 const [mw,mh]=track.course.mapSize;box(0xb58a58,0,-2,0,mw+18,2,mh+18);
 const weave=document.createElement('canvas');weave.width=64;weave.height=64;const wc=weave.getContext('2d');wc.fillStyle='#888';wc.fillRect(0,0,64,64);for(let x=0;x<64;x+=4)for(let y=0;y<64;y+=4){wc.fillStyle=(x+y)%8?'#aaa':'#666';wc.fillRect(x,y,2,3)}const weaveTex=new THREE.CanvasTexture(weave);weaveTex.wrapS=weaveTex.wrapT=THREE.RepeatWrapping;weaveTex.repeat.set(72,100);textures.push(weaveTex);
 const rugMat=new THREE.MeshStandardMaterial({color:0x97948e,bumpMap:weaveTex,bumpScale:.08,roughness:1});owned.push(rugMat);box(rugMat,0,-.55,0,mw,1,mh);
 for(const x of[-mw/2+1,mw/2-1])box(0xeae2cf,x,-.02,0,1,.08,mh);for(const z of[-mh/2+1,mh/2-1])box(0xeae2cf,0,-.02,z,mw,.08,1);
 for(const zone of track.zones)flatPoly(zone,0x93d454,.015);
 for(const [a,b] of track.edges){const p=track.nodes[a],q=track.nodes[b],len=Math.hypot(q.x-p.x,q.z-p.z),m=box(0x747575,(p.x+q.x)/2,.055,(p.z+q.z)/2,track.course.width,.08,len);m.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);m.castShadow=false}
 for(const p of track.nodes){const cap=cyl(0x747575,p.x,.055,p.z,track.course.width/2,.08);cap.castShadow=false}
 for(const [a,b] of track.edges){const p=track.nodes[a],q=track.nodes[b],len=Math.hypot(q.x-p.x,q.z-p.z);for(let d=1.5;d<len-1;d+=5.4){const t=d/len,u=Math.min(1,(d+3.2)/len);line(0xfffbed,{x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t},{x:p.x+(q.x-p.x)*u,z:p.z+(q.z-p.z)*u},.34)}}
 const island=cyl(0x96ce4c,track.roundabout.x,.18,track.roundabout.z,track.roundabout.islandRadius,.25);island.castShadow=false;
 const curb=mesh(new THREE.TorusGeometry(track.roundabout.islandRadius,.25,6,48),0xede5c9,track.roundabout.x,.27,track.roundabout.z);curb.rotation.x=-Math.PI/2;curb.castShadow=false;
 for(const [x,y,rot]of track.crossings)for(let i=-2;i<=2;i++){const p=rugPoint(x+(rot?0:i*3),y+(rot?i*3:0));const stripe=box(0xfffbea,p.x,.16,p.z,rot?3.8:1,.04,rot?1:3.8);stripe.castShadow=false}
 for(const p of track.parking){rect(0xa8aaa4,p.x,p.y,p.cols*19,p.rows*20,.08);for(let r=0;r<p.rows;r++)for(let c=0;c<p.cols;c++){const point=rugPoint(p.x+(c-(p.cols-1)/2)*19,p.y+(r-(p.rows-1)/2)*20);label('P',point.x,.14,point.z,6.5,6.5,'#a8aaa4','#fffdf0')}}
 for(const place of track.places){begin(place.name,place.px,place.py);
  switch(place.kind){
   case 'apartments':if(place.id===0){building(0,-20,14,12,22,0xb84f56);building(0,8,12,33,26,0xe0ad62);tree(8,31,1.2)}else{building(-13,3,9,11,15,0x66b4d9);building(0,-3,12,23,30,0xd45562);building(13,0,13,26,27,0xe4c24f)}break;
   case 'playpark':{
    const pond=cyl(0x369ed2,-15,.12,2,10,.1);pond.scale.z=1.35;pond.castShadow=false;
    for(let i=0;i<3;i++){ball(0xffd34b,-18+i*4,.8,-3+i*4,1.2,1,.5,.8);box(0xe59a37,-17.4+i*4,.8,-2.5+i*4,.5,.2,.5)}
    for(const x of[-5,4])cyl(0xda9e3e,x,5,0,.3,10);box(0xda9e3e,-.5,10,0,10,.4,.4);for(const x of[-3,2])box(0x52715f,x,6,0,.09,7,.09);box(0xe28451,-.5,2.5,0,5,.35,2);
    const slide=box(0xe76b43,10,4,0,3.5,.35,11);slide.rotation.x=.7;box(0xf7d058,10,8,-4,4,.3,3);for(let i=0;i<7;i++)box(0xffda67,10,1+i,-5,4,.25,1);
    building(17,5,8,7,8,0xf3cc69,'ICE');bench(28,10,.3);for(const [x,z]of[[-27,14],[-24,21],[-5,-16],[8,-16],[22,-13],[31,-10]])tree(x,z,1.15);break;
   }
   case 'woods':for(const[x,z,s]of[[-4,-19,1.3],[5,-12,1.2],[5,0,1.4],[2,12,1.5],[-8,16,1.2],[-19,20,1.1]])tree(x,z,s);bench(-17,12,-.4);bench(-4,22,.3);break;
   case 'townhouses':building(-9,-17,14,13,18,0xe7bd4f);building(8,13,14,24,25,0xe1cf68);building(-11,23,14,11,16,0x67badb);for(const[x,z]of[[16,-27],[17,-8],[18,8],[17,28],[-19,-29]])tree(x,z,1);break;
   case 'bank':building(0,0,14,17,27,0xd79551,'BANK');tree(-15,0,.85);tree(20,0,1.2);break;
   case 'post':building(3,0,14,18,21,0x69afd0,'POST');building(-11,3,10,15,16,0xc85858);tree(-20,15,1.1);break;
   case 'orchard':for(const[x,z]of[[-14,-4],[0,-4],[14,-4],[-13,10],[1,10],[16,10]])tree(x,z,1.3);break;
   case 'cityhall':building(-5,0,15,20,20,0xe1bd43,'CITY HALL');building(17,0,16,36,29,0xe7a265);tree(-12,-18,1);tree(16,-23,1);break;
   case 'shops':building(-4,7,12,16,22,0x5aaed0);building(14,-13,13,20,25,0xe7ce62);for(const[x,z]of[[-20,-20],[-17,18],[18,21],[-18,4]])tree(x,z,.95);break;
   case 'football':{
    box(0x8dd44d,0,.11,0,44,.08,34).castShadow=false;
    for(const x of[-20,20])line(0xfff8df,{x,z:-15},{x,z:15},.35,.2);
    for(const z of[-15,15])box(0xfff8df,0,.2,z,40,.04,.3).castShadow=false;box(0xfff8df,0,.2,0,.3,.04,30).castShadow=false;
    const circle=mesh(new THREE.TorusGeometry(4.2,.15,4,32),0xfff8df,0,.2,0);circle.rotation.x=-Math.PI/2;circle.castShadow=false;
    for(const x of[-19,19]){for(const z of[-4,4])cyl(0xf5f3e5,x,2.2,z,.15,4.4);box(0xf5f3e5,x,4.4,0,.3,.3,8);for(let z=-4;z<=4;z++)box(0xe3ead5,x+Math.sign(x)*1.3,2,z,.06,4,.06);for(const z of[-6,6])box(0xfff8df,x-Math.sign(x)*3,.2,z,6,.04,.3);box(0xfff8df,x-Math.sign(x)*6,.2,0,.3,.04,12)}
    ball(0xf8f3dc,7,1,3,1);collider(7,3,1);break;
   }
   case 'garden':cyl(0x68b5cd,0,.35,0,3.1,.5);cyl(0xe9dbaa,0,1.3,0,.5,2);ball(0xadeaf0,0,2.5,0,1.2,.7,1,.7);collider(0,0,2);for(let i=0;i<9;i++){const a=i*Math.PI*2/9;ball(i%2?0xf2d44d:0x7ab83b,Math.cos(a)*6,.7,Math.sin(a)*6,.8,1,.5,1)}break;
  }
  end();
 }
 begin('Pocket park',85,235);tree(4,4,.9);bench(-3,3,-.4);cyl(0xf9e1b0,-5,1,-5,.15,2);mesh(new THREE.ConeGeometry(1.5,1.3,12),0x63bdd7,-5,2.5,-5);end();
 begin('Roundabout offices',163,231);building(0,0,11,15,18,0xe4cd58);tree(-10,-6,.8);tree(11,8,.9);end();
 for(const [y,xs]of [[39,[32,75,88,102,147,161,177,193,209,225,241,255,270,318,339]],[94,[31,314,326,339]],[174,[30]],[242,[31]]])for(const x of xs){begin('Avenue tree',x,y);tree(0,0,.58);end()}
 for(const y of[115,133,153,191]){begin('Bus lane trees',31,y);tree(0,0,.5);end()}
 const bus=rugPoint(29,134);label('BUS',bus.x,.19,bus.z,5,13,'#747575','#fffbe8');
 for(const place of track.places){const collectible=new THREE.Group();collectible.position.set(place.pickupX,1.3,place.pickupZ);collectible.name='Block at '+place.name;world.add(collectible);group=collectible;
  box(0xffd05d,0,.45,0,2.5,.9,1.6);for(const x of[-.7,.7])for(const z of[-.4,.4])cyl(0xffe599,x,1,z,.3,.25);
  const markerMat=new THREE.MeshBasicMaterial({color:0xffe99c,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide});owned.push(markerMat);const marker=mesh(new THREE.RingGeometry(2.1,2.4,28),markerMat,0,-1.1,0);marker.rotation.x=-Math.PI/2;marker.castShadow=false;
  const number=label(String(place.id+1),0,3.5,0,1.5,1.5,'#203129','#dcff61',true);pickups.push({id:place.id,g:collectible,number});group=world;
 }
 const fader=createSceneryFader(landmarks,()=>{for(const m of owned)m.dispose();for(const t of textures)t.dispose()});
 return{fader,update(run,t,camera){for(const p of pickups){p.g.visible=!run.collected.has(p.id);if(p.g.visible){p.g.position.y=1.3+Math.sin(t*2.5+p.id)*.25;p.g.rotation.y=t*.8;p.number.quaternion.copy(p.g.quaternion).invert().multiply(camera.quaternion)}}},pickups};
}

export function drawCarpetMap(canvas,track,run,large=false){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=Math.min((w-24)/track.course.mapSize[0],(h-24)/track.course.mapSize[1]),cx=w/2,cz=h/2;
 const xy=(x,z)=>[cx+x*scale,cz+z*scale];ctx.clearRect(0,0,w,h);ctx.fillStyle='#c6c3b7';ctx.fillRect(0,0,w,h);
 for(const poly of track.zones){ctx.fillStyle='#93c968';ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(...xy(p.x,p.z)):ctx.moveTo(...xy(p.x,p.z)));ctx.closePath();ctx.fill()}
 ctx.lineCap='round';ctx.lineWidth=track.course.width*scale;ctx.strokeStyle='#72797a';ctx.beginPath();for(const[a,b]of track.edges){ctx.moveTo(...xy(track.nodes[a].x,track.nodes[a].z));ctx.lineTo(...xy(track.nodes[b].x,track.nodes[b].z))}ctx.stroke();
 ctx.fillStyle='#a2cd62';ctx.beginPath();ctx.arc(...xy(track.roundabout.x,track.roundabout.z),track.roundabout.islandRadius*scale,0,Math.PI*2);ctx.fill();
 if(large){ctx.font='600 12px Arial';ctx.textAlign='center';ctx.fillStyle='#304b53';for(const p of track.places)ctx.fillText(p.name,...xy(p.x,p.z-5),p.kind==='garden'?19*scale:35*scale)}
 for(const p of track.pickups){if(run.collected.has(p.id))continue;const[x,y]=xy(p.x,p.z);ctx.fillStyle='#ffe078';ctx.strokeStyle='#344f56';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,large?9:3.5,0,Math.PI*2);ctx.fill();ctx.stroke();if(large){ctx.fillStyle='#203129';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(p.id+1),x,y)}}
 drawBoostMarkers(ctx,xy,run,large);
 for(const car of run.cars.slice(1)){const[x,y]=xy(car.x,car.z);ctx.fillStyle=car.color;if(car.racer){ctx.beginPath();ctx.arc(x,y,large?7:4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();if(large){ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillStyle='#203129';ctx.fillText(car.name,x,y-11)}}else ctx.fillRect(x-1.5,y-1.5,3,3)}
 const car=run.cars[0],[x,y]=xy(car.x,car.z);ctx.save();ctx.translate(x,y);ctx.rotate(-car.heading);ctx.fillStyle='#ef5b3f';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();const r=large?8:5;ctx.moveTo(0,r);ctx.lineTo(-r,-r);ctx.lineTo(0,-r*.4);ctx.lineTo(r,-r);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
