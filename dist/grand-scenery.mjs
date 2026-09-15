import * as THREE from './three.module.mjs';

// Purpose-built toy models. Geometry is shared; each landmark owns its materials
// so fading one object never makes another object (or the track) transparent.
export function buildGrandScenery({world, track, random, spot, addCollider}) {
  const landmarks=[], geometries=new Map(), allMaterials=new Set(), mergedGeometries=[];
  const palette=[0xff6655,0xffcf4d,0x57b5d1,0x9675d0,0x72ba78];
  const geo=(key,make)=>{if(!geometries.has(key))geometries.set(key,make());return geometries.get(key)};
  let group,materials;
  function part(geometry,color,x,y,z,sx=1,sy=1,sz=1){
    if(!materials.has(color)){const m=new THREE.MeshStandardMaterial({color,roughness:.62});materials.set(color,m);allMaterials.add(m)}
    const m=new THREE.Mesh(geometry,materials.get(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
  }
  const box=(c,x,y,z,w,h,d)=>part(geo('box',()=>new THREE.BoxGeometry(1,1,1)),c,x,y,z,w,h,d);
  const ball=(c,x,y,z,rx,ry=rx,rz=rx)=>part(geo('ball',()=>new THREE.SphereGeometry(1,16,10)),c,x,y,z,rx,ry,rz);
  const cyl=(c,x,y,z,r,h,bottom=r)=>part(geo('cyl'+bottom/r,()=>new THREE.CylinderGeometry(1,bottom/r,1,16)),c,x,y,z,r,h,r);
  const cone=(c,x,y,z,r,h)=>part(geo('cone',()=>new THREE.ConeGeometry(1,1,16)),c,x,y,z,r,h,r);
  function ring(c,x,y,z,r,t=.2){return part(geo('ring'+r+':'+t,()=>new THREE.TorusGeometry(r,t,8,24)),c,x,y,z)}
  function rod(c,a,b,r=.16){const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const mid=new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5);const m=cyl(c,mid.x,mid.y,mid.z,r,delta.length());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m}
  function eyes(x,y,z,space=.7){for(const side of[-1,1]){ball(0xffffff,x+side*space,y,z,.36);ball(0x203129,x+side*space,y,z+.28,.17)}}
  function studs(c,x,y,z,cols,rows){for(let a=0;a<cols;a++)for(let b=0;b<rows;b++)cyl(c,x+(a-(cols-1)/2)*1.15,y,z+(b-(rows-1)/2)*1.15,.35,.24)}
  function flower(x,y,z,c,s=1){rod(0x3f773b,[x,0,z],[x,y,z],.13*s);ball(0xffc843,x,y,z,.55*s);for(let i=0;i<6;i++){const a=i*Math.PI/3;ball(c,x+Math.cos(a)*.86*s,y,z+Math.sin(a)*.86*s,.65*s,.22*s,.65*s)}ball(0x55954b,x+.5*s,y*.5,z,.85*s,.18*s,.35*s)}
  function bottle(c,pump=false){cyl(c,0,3.5,0,2,7,2.3);ball(c,0,6.7,0,2,.8,2);cyl(0xfaf2dc,0,7.4,0,.8,1.4);box(0xfff5d5,0,3.6,2,2.7,3,.08);ball(0x75bfcb,0,3.8,2.1,.7,.8,.1);if(pump){cyl(0xd8e4e2,0,8.5,0,.25,1);box(0xfaf2dc,.8,9.1,0,2.5,.45,.7)}else cyl(0x233e51,0,8.3,0,1,.8)}
  function batchParts(){
    // One draw per colour per landmark, instead of a draw for every bead,
    // bristle or toy part. Keep groups separate for independent occlusion.
    const batches=new Map(),v=new THREE.Vector3(),n=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
    for(const m of group.children){
      m.updateMatrix();normalMatrix.getNormalMatrix(m.matrix);
      if(!batches.has(m.material))batches.set(m.material,{positions:[],normals:[],indices:[]});
      const b=batches.get(m.material),p=m.geometry.attributes.position,norm=m.geometry.attributes.normal,offset=b.positions.length/3;
      for(let i=0;i<p.count;i++){
        v.fromBufferAttribute(p,i).applyMatrix4(m.matrix);b.positions.push(v.x,v.y,v.z);
        n.fromBufferAttribute(norm,i).applyMatrix3(normalMatrix).normalize();b.normals.push(n.x,n.y,n.z);
      }
      const index=m.geometry.index;
      for(let i=0;i<(index?index.count:p.count);i++)b.indices.push(offset+(index?index.getX(i):i));
    }
    group.clear();
    for(const [mat,b] of batches){
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));geometry.setIndex(b.indices);geometry.computeBoundingSphere();mergedGeometries.push(geometry);
      const m=new THREE.Mesh(geometry,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);
    }
  }
  const models={
    robot(){box(0x61b3bc,0,4,0,4,4,2.5);box(0xe4d9b7,0,7.1,0,4.5,2.5,2.8);eyes(0,7.3,1.4,.95);box(0x203129,0,6.4,1.45,1.4,.22,.1);rod(0x75898e,[0,8.3,0],[0,9.8,0],.12);ball(0xff6655,0,10,0,.45);for(const s of[-1,1]){rod(0x8f9da2,[s*2.1,5,0],[s*3.4,2.8,0],.42);ball(0xffcf4d,s*3.5,2.7,0,.8);box(0x536273,s*1.15,1.3,0,1.2,2.5,1.3);box(0xff6655,s*1.15,.4,.6,1.6,.8,2.5)}for(let i=0;i<3;i++)ball(palette[i],-.9+i*.9,4.6,1.3,.28)},
    rocket(){cyl(0xf7ebcf,0,5,0,1.9,8);cone(0xff6655,0,10.1,0,1.9,3);ball(0x68bddc,0,6,1.8,.8,.8,.15);ring(0x435666,0,6,1.95,.85,.15);for(const s of[-1,1]){box(0xff6655,s*2,1.8,0,1,3.6,2);cone(0xffcf4d,s*2,3.9,0,.7,1.2)}cyl(0x435666,0,.6,0,2.6,1.2)},
    castle(){box(0x65a8c9,0,2.5,0,6,5,3);for(const x of[-3.3,3.3]){cyl(0x9e83d3,x,3.7,0,1.4,7.4);cone(0xf17074,x,8.6,0,1.8,3)}box(0x33475b,0,1.8,1.55,1.9,3.6,.1);for(let i=0;i<5;i++)box(0xffcf4d,-2.8+i*1.4,5.5,0,.8,1,3);rod(0xf4e5ca,[0,5,0],[0,9,0],.1);box(0xff6655,.8,8.5,0,1.6,.9,.1)},
    lamp(){cyl(0x5db6af,0,.35,0,3,.7);rod(0x49636e,[0,.7,0],[0,5,0],.3);rod(0x49636e,[0,5,0],[3,9,0],.25);ball(0xffcf4d,0,5,0,.55);ball(0xffcf4d,3,9,0,.55);const shade=cyl(0xffcf4d,3,9.3,0,1.2,2.5,2.8);shade.rotation.z=-.45;ball(0xfff7cb,3.5,8.1,0,1.8,.2,1.8)},
    crayons(){cyl(0xf2876b,0,2.5,0,2.3,5);cyl(0x5c434a,0,5.03,0,2.05,.08);for(let i=0;i<7;i++){const a=i*2.4,x=Math.cos(a)*1.35,z=Math.sin(a)*1.35,h=5+i%3;cyl(palette[i%5],x,5,z,.32,h);cone(palette[i%5],x,5+h/2+.5,z,.32,1);cyl(0xf5deb2,x,5.8,z,.34,.4)}},
    paint(){ball(0xc19762,0,.3,0,4,.4,2.8);for(let i=0;i<6;i++){const a=i*1.05;ball(palette[i%5],Math.cos(a)*2.8,.7,Math.sin(a)*1.8,.65,.15,.55)}rod(0xf2705c,[-3,.8,-1],[3,1,1],.16);rod(0x69402d,[3,1,1],[4,1.1,1.4],.3)},
    glue(){box(0xf9edcd,0,2.5,0,3,5,2);box(0x60afd2,0,2.8,1.05,2.7,2.7,.1);cyl(0xff924a,0,5.4,0,1.15,.8);cone(0xff924a,0,6.7,0,.8,2);box(0xfdf3cc,0,2.8,1.13,1.5,.4,.1)},
    scissors(){for(const s of[-1,1]){ring(0x977bd0,s*1.4,.35,-2,1,.28).rotation.x=-Math.PI/2;rod(0xc0d2d4,[s*1.4,.35,-1],[-s*1.3,.35,4],.18)}cyl(0x586c76,0,.5,.5,.33,.3)},
    tape(){box(0xf07862,0,.7,0,3,1.4,6);ring(0xe6c875,0,2.7,-1,1.65,.65).rotation.y=Math.PI/2;ring(0xf4e7c8,0,2.7,-1,.95,.16).rotation.y=Math.PI/2;box(0xf2d786,0,2,1,1.3,.1,3);box(0x596d72,0,1.7,2.7,2,.4,.3)},
    console(){box(0x917bcd,0,.6,0,6,1.2,3.8);box(0x213c4c,0,1.23,0,3.4,.06,2.8);box(0x9aceb5,0,1.28,0,2.9,.04,2.3);for(let i=0;i<3;i++)box(0x4f8c7d,-.8+i*.8,1.32,-.5+i*.45,.5,.03,.5);box(0x293b4c,-2.3,1.3,0,1,.15,.3);box(0x293b4c,-2.3,1.3,0,.3,.15,1);for(const z of[-.4,.4])cyl(0xffcf4d,2.3,1.35,z,.27,.2)},
    lunchbox(){box(0x62b7be,0,1.5,0,6,3,4);box(0xffcf4d,0,3.1,0,6.1,.35,4.1);ring(0xff6655,0,4,0,1,.22);box(0xff6655,0,2,2.1,1,.9,.25);ball(0xf8e4b5,0,3.4,0,1.3,.12,1.2);eyes(0,3.5,.8,.45)},
    abacus(){for(const x of[-3,3])box(0xd39458,x,3,0,.4,6,.6);box(0xd39458,0,.3,0,7,.6,2);for(let row=0;row<4;row++){rod(0xe4d6b2,[-3,1.3+row*1.3,0],[3,1.3+row*1.3,0],.1);for(let i=0;i<6;i++)ball(palette[row],-2.3+i*.8,1.3+row*1.3,0,.32,.45,.45)}},
    octopus(){ball(0xb594dc,0,3.8,0,2.7,3,2.7);for(let i=0;i<8;i++){const a=i*Math.PI/4;ball(0xb594dc,Math.cos(a)*3,.65,Math.sin(a)*3,1.5,.65,1.5);ball(0xf3b6d6,Math.cos(a)*4,.7,Math.sin(a)*4,.55,.2,.55)}eyes(0,4.5,2.4,.9)},
    submarine(){ball(0xffce48,0,2,0,2,2,4.3);for(const z of[-2,0,2]){ball(0x4ba3c5,1.8,2,z,.15,.65,.65);ring(0xf6e8bd,1.95,2,z,.7,.13).rotation.y=Math.PI/2}rod(0xf26d57,[0,3,0],[0,6,0],.35);rod(0xf26d57,[0,6,0],[0,6,1.5],.35);box(0xf26d57,0,2,-4,4,.3,1.5);box(0xf26d57,0,2,-4,.3,3,1.5)},
    ship(){ball(0xf4775b,0,.8,0,2.4,1.1,4.5);box(0xffe7b3,0,1.4,0,3.7,.5,6);rod(0x7d6244,[0,1,0],[0,9,0],.16);const sail=geo('sail',()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([.2,3,0,.2,8.5,0,3.3,3,0],3));g.computeVertexNormals();return g});const m=part(sail,0xfff5da,0,0,0);m.material.side=THREE.DoubleSide;box(0x5da9c3,.7,8.8,0,1.4,.6,.1)},
    cups(){for(let i=0;i<5;i++)cyl(palette[i],0,.7+i*1.35,0,2.8-i*.4,1.4,2.4-i*.4);ball(0xffe9be,0,7.2,0,.6)},
    shampoo(){bottle(0x9c88d4,true)},
    sponge(){box(0xffd763,0,1.5,0,5,3,3.7);for(let i=0;i<18;i++)ball(0xc99b41,(random()-.5)*4.5,3.03,(random()-.5)*3.2,.15,.04,.18);for(let i=0;i<7;i++)ball(0xf5faff,(random()-.5)*4,3.3,(random()-.5)*2.7,.35+random()*.5)},
    jug(){cyl(0x60bdba,0,2,0,2.1,4,1.6);cyl(0x235764,0,4.02,0,1.8,.05);ring(0x60bdba,2.1,2.4,0,1.4,.35);rod(0x60bdba,[-1.7,2.5,0],[-3.8,3.5,0],.5)},
    swimring(){ring(0xffae69,0,.7,0,3.2,.95).rotation.x=-Math.PI/2;for(let i=0;i<6;i++){const a=i*Math.PI/3;ball(0xfff3ce,Math.cos(a)*3.2,1.6,Math.sin(a)*3.2,.45,.08,.45)}},
    frog(){ball(0x80c86f,0,1.8,0,2.4,1.6,2);for(const s of[-1,1]){ball(0x80c86f,s*1.2,3.3,1,.85);ball(0xffffff,s*1.2,3.5,1.55,.5);ball(0x203129,s*1.2,3.5,1.96,.22);ball(0x5eaf66,s*2,.5,1,1.3,.5,1.8)}box(0x345846,0,2,1.93,1.3,.15,.1)},
    whale(){ball(0x60a9d2,0,2,0,2.4,2.3,4);ball(0xc8eaf1,0,.9,1,2,.6,2.8);eyes(0,2.7,3.4,1);for(const s of[-1,1])ball(0x60a9d2,s*1.7,1,-4,2,.35,1);rod(0xc7eeff,[0,4,0],[0,6,0],.15);for(const s of[-1,1])rod(0xc7eeff,[0,6,0],[s*1.5,5.5,0],.12)},
    brush(){box(0x74cbd0,0,.5,0,1,1,8);box(0xfff2d5,0,.7,4,2.7,1.2,3.7);for(let i=0;i<4;i++)for(let j=0;j<5;j++)box(i%2?0x8dc2e0:0xffffff,-.9+i*.6,1.7,2.7+j*.6,.3,1,.3)},
    faucet(){cyl(0xc4d9de,0,1.8,0,1.2,3.6);rod(0xc4d9de,[0,3,0],[0,8,0],.6);const arc=part(geo('tapArc',()=>new THREE.TorusGeometry(2,.6,10,24,Math.PI)),0xc4d9de,2,8,0);rod(0xc4d9de,[4,8,0],[4,6,0],.6);box(0xddebef,0,3,0,3,.35,.5);ball(0xf27667,-1.2,3.3,0,.3);ball(0x68b9db,1.2,3.3,0,.3)},
    slide(){for(const x of[-1.5,1.5]){rod(0xffcd4f,[x,0,-2],[x,6,-2],.18);rod(0xffcd4f,[x,6,-2],[x,0,4],.18)}for(let i=0;i<6;i++)box(0xffcd4f,0,i+1,-2,3,.15,.5);const ramp=box(0xf26e57,0,3,1,3,.3,8.5);ramp.rotation.x=Math.PI/4;for(const x of[-1.6,1.6]){const side=box(0xf9a26b,x,3.4,1,.2,.6,8.5);side.rotation.x=Math.PI/4}box(0x67b8c2,0,6,-2,3,.3,1.7)},
    wateringcan(){cyl(0x63b3a7,0,2.4,0,2.5,4.8);ring(0x63b3a7,-1.5,4.5,0,2,.35);rod(0x63b3a7,[2,1.5,0],[5,4,0],.45);ball(0xffcf4d,5.2,4.2,0,.4,.9,.9);for(let i=0;i<5;i++)ball(0x527c69,5.55,3.6+i*.3,0,.07)},
    flowerpot(){cyl(0xc97752,0,2,0,2.8,4,1.9);cyl(0xe39968,0,4,0,3,.65);cyl(0x654d37,0,4.36,0,2.65,.05);flower(0,10,0,0xfff0d4,1.5);flower(-1.2,7.5,1,0xf6a4c4,1);flower(1,8,-.9,0xffcf4d,1)},
    wheelbarrow(){box(0x55a9a2,0,2.5,0,4.5,.4,5);for(const x of[-2.1,2.1])box(0x55a9a2,x,3.1,0,.25,1.5,5);for(const z of[-2.3,2.3])box(0x55a9a2,0,3.1,z,4.5,1.5,.25);for(const x of[-1.5,1.5]){rod(0xe1b46b,[x,2,-2],[x,3,-5],.2);rod(0x56676a,[x,2,-1],[x,0,-1],.2)}const tire=cyl(0x30434a,0,.9,2.5,.9,.6);tire.rotation.z=Math.PI/2;box(0x87663c,0,2.9,0,3.5,.4,3.7)},
    boot(){cyl(0xffcf4d,0,3.3,-.8,1.7,6.6);cyl(0x4a655d,0,6.65,-.8,1.4,.06);ball(0xffcf4d,0,1,1,1.75,1.1,3);box(0x427967,0,.25,.5,3.5,.5,6);for(let i=0;i<3;i++)ball(0xfff4dc,1.65,2.8+i,-.8,.06,.25,.25)},
    football(){ball(0xf0f1df,0,3,0,3);for(const v of[[0,1,0],[0,0,1],[1,0,0],[-1,0,0],[0,0,-1]]){const m=part(geo('patch',()=>new THREE.CircleGeometry(.9,5)),0x33465b,v[0]*3,3+v[1]*3,v[2]*3);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...v))}},
    bucket(){cyl(0xef8268,0,2,0,2.5,4,1.8);cyl(0xd8b985,0,4.02,0,2.15,.07);ring(0xffd569,0,4.5,0,2.3,.17);rod(0x61b4c6,[3,0,-1],[3,5,-1],.14);box(0x61b4c6,3,.6,-1,1.5,1.3,.3);ring(0x61b4c6,3,5,-1,.5,.12)},
    dinosaur(){ball(0x79b86f,0,3,0,2,1.8,3);rod(0x79b86f,[0,3,2],[0,7.5,3],.8);ball(0x79b86f,0,8,3.6,1.1,.9,1.6);eyes(0,8.3,4.8,.5);for(const x of[-1.3,1.3])for(const z of[-1.5,1.4])cyl(0x66a560,x,1.2,z,.5,2.4);rod(0x79b86f,[0,3,-2],[0,2,-5],.55);for(let i=0;i<5;i++)cone(0xffcf4d,0,4.5,-2+i*.85,.45,1.2)},
    birdhouse(){rod(0xa67c50,[0,0,0],[0,9,0],.35);box(0x67b7ca,0,9,0,3.6,3.5,3);for(const s of[-1,1]){const roof=box(0xf47b60,s*1.15,11.2,0,2.8,.35,4);roof.rotation.z=-s*.6}ball(0x2c4348,0,9.4,1.52,.65,.65,.04);rod(0xdac48a,[0,8.3,1.5],[0,8.3,2.5],.15);box(0xffcf4d,0,7.7,0,4,.35,3.6)},
    stool(){cyl(0xf3976b,0,5,0,3.5,.7);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod(0xc49a64,[Math.cos(a)*2,4.8,Math.sin(a)*2],[Math.cos(a)*3,0,Math.sin(a)*3],.3)}},
    hose(){for(let i=0;i<5;i++)ring(0x64bba3,0,2.8,(-2+i)*.6,2.1,.28);for(const z of[-1.7,1.7])ring(0xf2c45c,0,2.8,z,2.6,.22);box(0x496d64,0,.3,0,4,.6,4);rod(0x64bba3,[0,.3,2],[3,.3,3],.23);rod(0xefb549,[3,.3,3],[4.5,.3,3],.3)},
    pinwheel(){rod(0xf1d7a0,[0,0,0],[0,9,0],.15);for(let i=0;i<4;i++){const a=i*Math.PI/2;const blade=box(palette[i],Math.sin(a)*1.4,9+Math.cos(a)*1.4,0,1.7,2.6,.15);blade.rotation.z=-a+.45}ball(0xffcf4d,0,9,.3,.5)},
    sandcastle(){cyl(0xE8C994,0,3,0,4,6,5);for(let i=0;i<10;i++){const a=i*.628;box(0xd9b475,Math.cos(a)*4.05,6.15,Math.sin(a)*4.05,.9,.5,.9)}for(const c of[[3.4,3.4],[-3.4,3.4],[3.4,-3.4],[-3.4,-3.4]]){cyl(0xE8C994,c[0],4.2,c[1],1.2,8.4,1.55);cyl(0xd9a85f,c[0],8.9,c[1],1.5,1.9,0)}cyl(0xE8C994,0,7,0,2.2,14,2.85);cyl(0xcf9c50,0,14.6,0,2.6,2.9,0);const flag=box(0xf25b5b,.85,16.4,0,1.5,.95,.05);flag.rotation.y=Math.PI/2;rod(0x8a6b4a,[.85,15.4,0],[.85,16.35,0],.08);box(0x6b4f36,0,1.9,4.55,1.7,3.3,.35);for(let i=0;i<10;i++){const a=random()*6.28,r=4.3+random()*1.6;ball(0xd9c193,Math.cos(a)*r,.22,Math.sin(a)*r,.4+random()*.3)}},
    lighthouse(){cyl(0xf2ede0,0,6,0,1.5,12,2.15);cyl(0xd6473a,0,3.6,0,1.72,1.4,1.95);cyl(0xd6473a,0,8.2,0,1.55,1.3,1.68);cyl(0xd9d2c1,0,12.5,0,1.35,1.1,1.35);for(let i=0;i<8;i++){const a=i*.785;rod(0x33302b,[Math.cos(a)*1.3,12.6,Math.sin(a)*1.3],[Math.cos(a)*1.3,13.7,Math.sin(a)*1.3],.06)}cyl(0xbfe8ef,0,13.4,0,1.1,1.4,1.1);cyl(0xb43b30,0,14.5,0,1.35,1.2,0);ball(0xfff3c2,0,13.4,0,.45);box(0xf2ede0,2.6,1.3,0,3.2,2.6,3.2);box(0xd6473a,2.6,2.75,0,3.4,.4,3.4)},
    shipwreck(){const hull=ball(0x8a6b4a,0,.9,-.2,2.7,1.3,5);hull.rotation.z=.26;hull.rotation.x=-.08;const deck=box(0x6b4f36,-.4,1.9,-1.6,3.2,.4,2.1);deck.rotation.z=.26;rod(0x5c4530,[.6,.9,1.4],[1.6,4.4,2.1],.3);const scrap=box(0xcfc9b8,1.55,3,2.3,.08,2.2,1.5);scrap.rotation.z=.45;scrap.rotation.y=.25;for(let i=0;i<7;i++){const a=random()*6.28,r=2.4+random()*2.3;ball(0xE3C88F,Math.cos(a)*r,.15,Math.sin(a)*r*.6-1,.55+random()*.5,.22,.55+random()*.5)}},
    lifeguardtower(){for(const p of[[-1.7,-1.7],[1.7,-1.7],[-1.7,1.7],[1.7,1.7]])rod(0xE3A857,[p[0],0,p[1]],[p[0],4.3,p[1]],.22);box(0xE3A857,0,4.3,0,4.2,.35,4.2);box(0xE3A857,0,4.9,-2,4.2,1.1,.15);box(0xE3A857,-2,4.9,0,.15,1.1,4.2);box(0xE3A857,2,4.9,0,.15,1.1,4.2);box(0xf0f4f0,0,5.7,0,3.2,1.7,3.2);box(0xd8433a,0,6.65,0,3.6,.3,3.6);for(const s of[-1,1])rod(0xd9d2c1,[s*.5,0,2.2],[s*.5,4.3,2.2],.12);for(let i=1;i<6;i++)rod(0xd9d2c1,[-.5,i*.75,2.2],[.5,i*.75,2.2],.1);const buoy=ring(0xe14a3a,2.6,2.5,2.6,.6,.14)},
    umbrella(){rod(0xE8C994,[0,0,0],[0,6,0],.14);cyl(0xef8362,0,6.1,0,4.2,1.3,0);const rim=ring(0xfaeccb,0,6.72,0,4.1,.12);rim.rotation.x=-Math.PI/2;for(let i=0;i<4;i++){const a=i*.785+.4;const strip=box(0xfaeccb,Math.cos(a)*2.1,6.1,Math.sin(a)*2.1,.08,.05,4);strip.rotation.y=a}ball(0xE8C994,0,6.35,0,.24);const towel=box(0xf6ede0,2.6,.03,1.2,3.6,.05,2.4);towel.rotation.y=.2},
    pail(){cyl(0xef5b57,0,1.5,0,1.7,2.8,1.25);const ring1=ring(0xc23f3c,0,2.9,0,1.7,.16);ring1.rotation.x=-Math.PI/2;const handle=ring(0xf2a33c,0,3.35,0,1.35,.17);rod(0xE8D9B0,[2.1,0,.3],[2.1,3.3,.5],.13);const blade=box(0x8a95a0,2.1,.15,1.7,1.15,.08,1.35);blade.rotation.x=-.5;for(let i=0;i<4;i++)ball(0xE3C88F,(random()-.5)*2,.15,(random()-.5)*2+2.3,.3+random()*.25)},
    deckchair(){for(const s of[-1,1]){rod(0xE8C994,[s*1.1,0,1.3],[s*1.1,2.7,-1.2],.14);rod(0xE8C994,[s*1.1,0,1.3],[s*1.1,1,1.9],.12)}rod(0xE8C994,[-1.1,1,1.9],[1.1,1,1.9],.12);const seat=box(0xef8362,0,.9,1.1,2.3,.15,1.9);seat.rotation.x=-.25;const back=box(0xf6ede0,0,1.9,-.5,2.3,.15,2.6);back.rotation.x=-1.15;for(let i=0;i<3;i++){const stripe=box(0xef8362,0,1.9,-1.6+i*1,2.32,.16,.5);stripe.rotation.x=-1.15}},
    cooler(){box(0x5aa7c9,0,1.1,0,3.4,2.2,2.1);box(0x3d7ea3,0,2.28,0,3.5,.5,2.2);rod(0x2c5b78,[-1.5,2.3,0],[-2.1,2.3,0],.13);rod(0x2c5b78,[1.5,2.3,0],[2.1,2.3,0],.13);box(0xf2f7fa,0,1.5,1.06,3.4,.7,.06);cyl(0x2c5b78,0,.25,-.9,.16,.3)},
    crab(){ball(0xe0644a,0,1,0,1.3,.75,1.7);eyes(0,1.85,1.5,.55);for(const s of[-1,1]){rod(0xe0644a,[s*1.3,1.6,1.1],[s*1.3,2,1.5],.15);ball(0xe0644a,s*1.55,2.15,1.65,.42)}for(const s of[-1,1])for(let i=0;i<3;i++)rod(0xc2452e,[s*1,.9,-.7+i*.7],[s*2.1,.1,-.85+i*.85],.14)},
    starfish(){ball(0xef8f5c,0,.3,0,.7,.32,.7);for(let i=0;i<5;i++){const a=i*1.2566;const arm=box(0xef8f5c,Math.cos(a)*1.5,.22,Math.sin(a)*1.5,.6,.28,1.9);arm.rotation.y=-a}for(let i=0;i<5;i++){const a=i*1.2566+.15;ball(0xd97246,Math.cos(a)*2,.3,Math.sin(a)*2,.13)}},
    shell(){ball(0xf2c9a0,0,.9,0,1.7,1.1,2.1);for(let i=0;i<4;i++){const r=1.7-i*.3;const ring1=ring(0xe0a877,0,.9+i*.18,.3-i*.35,r,.1);ring1.rotation.x=-Math.PI/2}cyl(0xe0a877,.2,1.9,1.7,.55,1.5,0);ball(0xfff3e0,0,1.3,1.6,.35,.2,.5)},
    driftwood(){rod(0x8a765c,[-2.6,.35,-.3],[2.7,.85,.5],.5);rod(0x7a674f,[.4,.7,.2],[1.3,2.1,.9],.28);for(let i=0;i<4;i++)ball(0x6b5a44,-2+i*1.6,.4+random()*.5,-.2+random()*.6,.42+random()*.18,.3,.3+random()*.15)}
  };
  const themes=[['robot','rocket','castle','lamp','crayons','paint','glue','scissors','tape','console','lunchbox','abacus'],['octopus','submarine','ship','cups','shampoo','sponge','jug','swimring','frog','whale','brush','faucet'],['slide','wateringcan','flowerpot','wheelbarrow','boot','football','bucket','dinosaur','birdhouse','stool','hose','pinwheel'],['sandcastle','lighthouse','shipwreck','lifeguardtower','umbrella','pail','deckchair','cooler','crab','starfish','shell','driftwood']];
  // Reserve generous circular footprints before building anything. A tall toy
  // can tower over the road, but its body never occupies a racing lane.
  const beachTheme=track.course.base===3;
  for(let pass=0;pass<2;pass++)for(const [i,name] of themes[track.course.base].entries()){
    const desired=pass===0?(i<4?(beachTheme?1.7:2.1):1.65):.9;
    const radius=(beachTheme?8.5:6.5)*desired;
    const p=spot(radius);if(!p)continue;
    group=new THREE.Group();group.name=name+' landmark';materials=new Map();world.add(group);
    models[name]();batchParts();group.scale.setScalar(desired);group.rotation.y=random()*Math.PI*2;group.position.set(p.x,0,p.z);
    group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group);
    landmarks.push({group,bounds,materials:[...materials.values()],opacity:1,name,footprint:radius});
    addCollider(p.x,p.z,radius*.8);
  }
  return createSceneryFader(landmarks,()=>{for(const m of allMaterials)m.dispose();for(const g of geometries.values())g.dispose();for(const g of mergedGeometries)g.dispose()});
}

export function createSceneryFader(landmarks,onDispose=()=>{}){
  const ray=new THREE.Ray(),origin=new THREE.Vector3(),direction=new THREE.Vector3(),hit=new THREE.Vector3(),target=new THREE.Vector3(),right=new THREE.Vector3();
  return {landmarks,
    update(camera,car,dt,active){
      camera.updateMatrixWorld();right.setFromMatrixColumn(camera.matrixWorld,0);
      for(const item of landmarks){
        let blocked=false;
        if(active){
          // Three parallel rays cover the car's width, including both wheels.
          for(const side of[-1,0,1]){
            target.set(car.x,car.y+1.1,car.z).addScaledVector(right,side*1.15);
            if(camera.isOrthographicCamera){camera.getWorldDirection(direction);origin.copy(target).addScaledVector(direction,-Math.max(1,camera.position.distanceTo(target)))}
            else{origin.copy(camera.position);direction.copy(target).sub(origin).normalize()}
            ray.set(origin,direction);const distance=origin.distanceTo(target);
            if(ray.intersectBox(item.bounds,hit)&&origin.distanceTo(hit)<distance-.25){blocked=true;break}
          }
        }
        const goal=blocked?.16:1;
        item.opacity+=(goal-item.opacity)*(1-Math.exp(-dt*(blocked?18:8)));
        if(Math.abs(item.opacity-goal)<.003)item.opacity=goal;
        const transparent=item.opacity<1;
        for(const mat of item.materials){
          if(mat.transparent!==transparent){mat.transparent=transparent;mat.depthWrite=!transparent;mat.needsUpdate=true}
          mat.opacity=item.opacity;
        }
        // A faded landmark must not leave an opaque shadow over the player.
        if(item.shadowVisible!==!transparent){item.shadowVisible=!transparent;item.group.traverse(o=>{if(o.isMesh)o.castShadow=!transparent})}
      }
    },
    dispose:onDispose
  };
}
