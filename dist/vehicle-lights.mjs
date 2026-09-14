import * as THREE from './three.module.mjs';
export function attachBrakeLights(group,type='car'){
 if(type==='boat')return;
 const y=type==='buggy'?.86:type==='traffic'?.65:.73,z=type==='traffic'?-1.56:-1.52;
 // One material per vehicle: braking must never illuminate another car's lamps.
 const lens=new THREE.MeshStandardMaterial({color:0x801b18,emissive:0xff0802,emissiveIntensity:.08,roughness:.25,toneMapped:false});
 const halo=new THREE.MeshBasicMaterial({color:0xff2413,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 for(const x of[-.52,.52]){
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(.34,.16,.08),lens);lamp.position.set(x,y,z);lamp.name='Brake light';group.add(lamp);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(.46,.26),halo);glow.position.set(x,y,z-.045);glow.rotation.y=Math.PI;glow.name='Brake light glow';group.add(glow);
 }
 group.userData.brakeLights={lens,halo};
}
export function updateBrakeLights(group,braking){
 const lights=group.userData.brakeLights;if(!lights)return;
 lights.lens.color.setHex(braking?0xef1008:0x801b18);
 lights.lens.emissiveIntensity=braking?2.8:.08;
 lights.halo.opacity=braking?.18:0;
}
export function disposeBrakeLights(group){const lights=group.userData.brakeLights;lights?.lens.dispose();lights?.halo.dispose();}
