import * as THREE from './three.module.mjs';
import {HighDetail} from './high-detail.mjs';

// Modify the existing materials in place so textures, water animation and
// camera-occlusion fading retain their original material references.
export class VisualStyle{
 constructor(){this.detail=new HighDetail();this.mode='polished';this.uniform={value:0};this.edges=[];this.edgeGeometry=new Map();this.motion=new WeakMap()}
 set(mode){this.mode=['cartoon','high'].includes(mode)?mode:'polished';this.detail.set(this.mode==='high');this.uniform.value=this.mode==='cartoon'?1:0;for(const e of this.edges)e.line.visible=!!this.uniform.value}
 prepare(world,vehicles){
  const candidates=[],vehicleMeshes=new Set();for(const car of vehicles)car.traverse(o=>{if(o.isMesh)vehicleMeshes.add(o)});
  world.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material])this.material(m);
   if(o.isInstancedMesh||Array.isArray(o.material)||o.material.map||o.material.transparent||!o.geometry.attributes.normal)return;
   o.geometry.computeBoundingBox();const size=o.geometry.boundingBox.getSize(new THREE.Vector3());if(size.y<.24||Math.max(size.x,size.y,size.z)<1.1)return;
   candidates.push({o,priority:(vehicleMeshes.has(o)?1e6:0)+size.x*size.y*size.z});
  });
  this.detail.prepare(world,vehicles);
  // Bounded extra draws on mobile. Rounded forms also get shader silhouettes.
  for(const {o}of candidates.sort((a,b)=>b.priority-a.priority).slice(0,120)){
   let geometry=this.edgeGeometry.get(o.geometry);if(!geometry){geometry=new THREE.EdgesGeometry(o.geometry,35);this.edgeGeometry.set(o.geometry,geometry)}
   const material=new THREE.LineBasicMaterial({color:0x10131d,transparent:true,depthWrite:false,toneMapped:false});const line=new THREE.LineSegments(geometry,material);line.name='Cartoon ink';line.visible=this.mode==='cartoon';o.add(line);this.edges.push({line,source:o.material});
  }
 }
 material(m){
  if(!(m.isMeshStandardMaterial||m.isMeshPhysicalMaterial)||m.userData.celStyled)return;
  const compile=m.onBeforeCompile,cache=m.customProgramCacheKey.bind(m),key=cache();m.userData.celStyled=true;
  m.onBeforeCompile=(shader,renderer)=>{compile.call(m,shader,renderer);shader.uniforms.cartoonStyle=this.uniform;shader.fragmentShader='uniform float cartoonStyle;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
if(cartoonStyle > 0.5){
 vec3 lightRatio=(reflectedLight.directDiffuse+reflectedLight.indirectDiffuse)/max(diffuseColor.rgb,vec3(0.035));
 float lightLevel=dot(lightRatio,vec3(0.2126,0.7152,0.0722));
 float shade=0.36+0.30*smoothstep(0.40,0.44,lightLevel)+0.36*smoothstep(0.84,0.88,lightLevel)+0.36*smoothstep(1.42,1.47,lightLevel);
 vec3 lightTint=mix(vec3(1.0),clamp(lightRatio/max(lightLevel,0.001),vec3(0.6),vec3(1.45)),0.45);
 vec3 cel=diffuseColor.rgb*shade*lightTint+totalEmissiveRadiance;
 float facing=abs(dot(normal,geometryViewDir));
 float ink=smoothstep(0.055,0.16,facing);
 outgoingLight=mix(cel*0.16,cel,ink);
}
#include <opaque_fragment>`);
  };m.customProgramCacheKey=()=>key+'-cel-style-v1';m.needsUpdate=true;
 }
 animate(car,model,dt,time,active){
  const prev=this.motion.get(model)||{heading:car.heading,airborne:car.airborne,landing:0};if(prev.airborne&&!car.airborne)prev.landing=1;
  prev.landing=Math.max(0,prev.landing-dt*4);const turn=Math.atan2(Math.sin(car.heading-prev.heading),Math.cos(car.heading-prev.heading))/Math.max(dt,.001);prev.heading=car.heading;prev.airborne=car.airborne;this.motion.set(model,prev);
  if(this.mode!=='cartoon'){model.scale.set(1,1,1);return}
  const moving=active?Math.min(1,Math.abs(car.speed)/10):0,bounce=Math.sin(time*19+car.id)*.045*moving,boost=car.boosting&&active?1:0,squash=prev.landing*.15;
  model.scale.set(1.1+squash,1.06-squash-boost*.09+(car.airborne?.12:0),1+boost*.13);model.position.y+=Math.max(0,bounce)+squash*.15;model.rotateZ(Math.max(-.16,Math.min(.16,-turn*.035))*moving);model.rotateX(bounce*.4);
 }
 update(){for(const {line,source}of this.edges){line.visible=this.mode==='cartoon'&&source.visible!==false;line.material.opacity=source.opacity*.85}}
 clear(){this.detail.clear();for(const {line}of this.edges){line.removeFromParent();line.material.dispose()}for(const g of this.edgeGeometry.values())g.dispose();this.edges=[];this.edgeGeometry.clear();this.motion=new WeakMap()}
}
