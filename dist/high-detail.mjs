import * as THREE from './three.module.mjs';

// Seamless, deterministic material grain. World-space projection also covers
// terrain and road ribbons which have no authored UV coordinates.
export class HighDetail{
 constructor(){
  this.enabled={value:0};this.groups=[];this.geometry=[];
  const n=128,data=new Uint8Array(n*n*4);let seed=9127;
  for(let i=0;i<n*n;i++){seed=(seed*1664525+1013904223)>>>0;const v=seed>>>24;data.set([v,v,v,255],i*4)}
  this.texture=new THREE.DataTexture(data,n,n);this.texture.wrapS=this.texture.wrapT=THREE.RepeatWrapping;this.texture.magFilter=THREE.LinearFilter;this.texture.minFilter=THREE.LinearMipmapLinearFilter;this.texture.generateMipmaps=true;this.texture.needsUpdate=true;
 }
 set(enabled){this.enabled.value=enabled?1:0;for(const g of this.groups)g.visible=enabled;for(const e of this.geometry)e.mesh.geometry=enabled?e.detail:e.original}
 material(m){
  if(m.userData.highDetail||!m.isMeshStandardMaterial||m.transparent||m.map)return;
  m.userData.highDetail=true;const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
  m.onBeforeCompile=(s,r)=>{compile.call(m,s,r);s.uniforms.highDetail=this.enabled;s.uniforms.surfaceGrain={value:this.texture};
   s.vertexShader='varying vec3 detailPosition;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
vec4 detailPoint=vec4(transformed,1.0);
#ifdef USE_INSTANCING
detailPoint=instanceMatrix*detailPoint;
#endif
detailPosition=(modelMatrix*detailPoint).xyz;`);
   s.fragmentShader='uniform float highDetail;\nuniform sampler2D surfaceGrain;\nvarying vec3 detailPosition;\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
if(highDetail>0.5){
 vec3 p=detailPosition;
 vec3 weights=abs(normalize(cross(dFdx(p),dFdy(p))));weights/=max(dot(weights,vec3(1.0)),0.001);
 float grain=texture2D(surfaceGrain,p.yz*1.6).r*weights.x+texture2D(surfaceGrain,p.xz*1.6).r*weights.y+texture2D(surfaceGrain,p.xy*1.6).r*weights.z;
 float patches=texture2D(surfaceGrain,p.xz*0.018).r;
 vec3 c=diffuseColor.rgb;
 float grass=step(c.r*1.08,c.g)*step(c.b*1.18,c.g);
 float neutral=1.0-smoothstep(0.04,0.20,max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b)));
 float strength=mix(0.12,0.38,neutral);
 diffuseColor.rgb*=1.0+(grain-0.5)*strength+grass*((patches-0.5)*0.28+(grain-0.5)*0.28);
}
`);
  };m.customProgramCacheKey=()=>key+'-textured-v1';m.needsUpdate=true;
 }
 prepare(world,cars){
  const rounded=new Map();world.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material])this.material(m);
   const g=o.geometry,p=g.parameters;if(!p||o.isInstancedMesh||g.type!=='SphereGeometry')return;
   let detail=rounded.get(g);if(!detail){detail=new THREE.SphereGeometry(p.radius,32,20,p.phiStart,p.phiLength,p.thetaStart,p.thetaLength);rounded.set(g,detail)}
   this.geometry.push({mesh:o,original:g,detail});
  });
  for(const car of cars){if(car.userData.motorcycle)continue;
   const g=new THREE.Group();g.name='High detail vehicle trim';car.add(g);this.groups.push(g);
   const metal=new THREE.MeshStandardMaterial({color:0xaab7bf,metalness:.8,roughness:.26}),rubber=new THREE.MeshStandardMaterial({color:0x18201e,roughness:.92});
   const part=(geo,mat,x,y,z,parent=g)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m};
   if(!car.userData.wheels?.length){for(const x of[-.5,.5])part(new THREE.CylinderGeometry(.025,.025,1,8),metal,x,.88,.3).rotation.x=Math.PI/2;continue}
   for(const x of[-1,1]){part(new THREE.BoxGeometry(.22,.12,.25),metal,x*.83,1.02,.25);part(new THREE.CylinderGeometry(.07,.07,.25,12),metal,x*.48,.35,-1.5).rotation.x=Math.PI/2;}
   for(const x of[-.3,.3])part(new THREE.BoxGeometry(.035,.025,.42),rubber,x,1.13,.47).rotation.y=-.2;
   for(const wheel of car.userData.wheels){const trim=new THREE.Group();wheel.add(trim);this.groups.push(trim);
    const radius=wheel.children[0]?.geometry.parameters?.radiusTop||.36;
    const tread=new THREE.InstancedMesh(new THREE.BoxGeometry(.29,.025,.065),rubber,16),dummy=new THREE.Object3D();trim.add(tread);tread.castShadow=true;
    for(let i=0;i<16;i++){const a=i*Math.PI/8;dummy.position.set(0,Math.cos(a)*radius,Math.sin(a)*radius);dummy.rotation.x=a;dummy.updateMatrix();tread.setMatrixAt(i,dummy.matrix)}
    const hub=part(new THREE.CylinderGeometry(.09,.09,.34,16),metal,0,0,0,trim);hub.rotation.z=Math.PI/2;
   }
  }
  this.set(!!this.enabled.value);
 }
 clear(){for(const e of this.geometry)e.mesh.geometry=e.original;for(const g of new Set(this.geometry.map(e=>e.detail)))g.dispose();this.geometry=[];const materials=new Set();for(const g of this.groups){g.removeFromParent();g.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material)})}for(const m of materials)m.dispose();this.groups=[]}
}
