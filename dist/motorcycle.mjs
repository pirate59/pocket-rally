import * as THREE from './three.module.mjs';
export function makeMotorcycle(color){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);root.userData.motorcycle=true;root.userData.leanBody=body;root.userData.wheels=[];
 const mat=(c,r=.45,metal=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:metal}),paint=mat(color,.27,.25),black=mat(0x151d24),alloy=mat(0x9eabb4,.25,.8),rubber=mat(0x171a1d,.9),gold=mat(0xb99b55,.3,.7),suit=mat(0x263442);
 const mesh=(geo,m,x,y,z,parent=body)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,m,x,y,z,parent=body)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const oval=(x,y,z,sx,sy,sz,m,parent=body)=>{const o=mesh(new THREE.SphereGeometry(1,24,16),m,x,y,z,parent);o.scale.set(sx,sy,sz);return o};
 const beam=(a,b,r,m,parent=body)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),o=mesh(new THREE.CylinderGeometry(r,r,start.distanceTo(end),12),m,...start.clone().add(end).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return o};
 for(const z of[-.92,.93]){const wheel=new THREE.Group();wheel.position.set(0,.36,z);body.add(wheel);const tire=mesh(new THREE.TorusGeometry(.285,.10,12,40),rubber,0,0,0,wheel);tire.rotation.y=Math.PI/2;const disc=mesh(new THREE.CylinderGeometry(.225,.225,.18,32),alloy,0,0,0,wheel);disc.rotation.z=Math.PI/2;for(let i=0;i<6;i++){const spoke=box(.22,.035,.43,black,0,0,0,wheel);spoke.rotation.x=i*Math.PI/3;}root.userData.wheels.push(wheel);}
 for(const side of[-1,1]){beam([side*.15,.37,.93],[side*.2,1.12,.56],.045,gold);beam([side*.18,.38,-.92],[side*.18,.66,-.1],.055,alloy);beam([side*.22,.6,-.4],[side*.22,.95,.45],.05,alloy);}
 oval(0,.72,.27,.36,.45,.6,paint);oval(0,1.02,.06,.30,.21,.43,paint);oval(0,.97,-.54,.26,.09,.44,black);oval(0,1.05,-.92,.24,.15,.28,paint);
 oval(0,.91,.81,.34,.31,.24,paint);const screen=oval(0,1.18,.72,.26,.25,.09,new THREE.MeshPhysicalMaterial({color:0xa4c9d8,transparent:true,opacity:.38,roughness:.1,side:THREE.DoubleSide}));screen.rotation.x=-.3;
 beam([-.42,1.03,.48],[.42,1.03,.48],.035,alloy);for(const side of[-1,1]){beam([side*.26,1.03,.48],[side*.46,1.02,.44],.05,black);beam([side*.2,.5,-.52],[side*.2,.57,-1.13],.07,alloy);}
 const rider=new THREE.Group();body.add(rider);root.userData.rider=rider;
 const torso=oval(0,1.29,-.3,.29,.4,.22,suit,rider);torso.rotation.x=.7;oval(0,1.6,.07,.245,.26,.26,paint,rider);oval(0,1.62,.27,.21,.12,.07,black,rider);
 for(const side of[-1,1]){beam([side*.22,1.38,-.05],[side*.36,1.12,.17],.08,suit,rider);beam([side*.36,1.12,.17],[side*.40,1.04,.44],.07,suit,rider);oval(side*.40,1.04,.44,.085,.07,.1,black,rider);beam([side*.19,1.0,-.6],[side*.36,.72,-.16],.11,suit,rider);beam([side*.36,.72,-.16],[side*.28,.40,-.56],.085,suit,rider);oval(side*.28,.40,-.50,.10,.07,.22,black,rider);}
 root.userData.shadow=mesh(new THREE.CircleGeometry(.7,24),new THREE.MeshBasicMaterial({color:0x102319,transparent:true,opacity:.15,depthWrite:false}),0,.025,0,root);root.userData.shadow.rotation.x=-Math.PI/2;
 return root;
}
