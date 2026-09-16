import * as THREE from './three.module.mjs';

// Keep a fixed light budget; emissive fixtures remain visible across the map,
// while the closest fixtures and vehicles supply actual moving illumination.
export class CourseLights{
 constructor(world,track,models,cars,obstacles,addCollider){
  this.world=world;this.track=track;this.models=models;this.fixtures=[];this.owned=new Set();this.group=new THREE.Group();this.group.name='Course lighting';world.add(this.group);
  const material=(color,emissive=false)=>{const m=emissive?new THREE.MeshBasicMaterial({color,toneMapped:false}):new THREE.MeshStandardMaterial({color,roughness:.55});this.owned.add(m);return m};
  const pole=material(0x294451),glow=material(0xffe4a2,true),shade=material(0x479eac),red=material(0xff493c,true);
  const part=(geo,mat,x,y,z,parent=this.group)=>{this.owned.add(geo);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=!mat.isMeshBasicMaterial;m.receiveShadow=!mat.isMeshBasicMaterial;parent.add(m);return m};
  const candidates=[];
  if(track.course.mode==='collect')for(const [a,b]of track.edges){const p=track.nodes[a],q=track.nodes[b],dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz);if(len<22)continue;for(let d=14;d<len-5;d+=36)candidates.push({x:p.x+dx*d/len-dz/len*(track.course.width/2+1.7),z:p.z+dz*d/len+dx/len*(track.course.width/2+1.7),y:0})}
  else{let spacing=0;for(let i=0;i<track.n;i++){const p=track.nodes[i],prev=track.nodes[(i+track.n-1)%track.n];spacing+=Math.hypot(p.x-prev.x,p.z-prev.z);if(spacing<(track.course.mapScale?29:17)||p.gap||p.ramp)continue;spacing=0;candidates.push({x:p.x+p.tz*(track.course.width/2+1.8),z:p.z-p.tx*(track.course.width/2+1.8),y:p.y})}}
  const boat=track.course.type==='boat',garden=track.course.type==='buggy';
  for(const p of (track.course.type==='motorcycle'?[]:candidates)){if(obstacles.some(o=>Math.hypot(o.x-p.x,o.z-p.z)<o.r+1.2)||this.fixtures.some(o=>Math.hypot(o.x-p.x,o.z-p.z)<10))continue;
   const height=boat?2.4:garden?5:7,base=p.y+.1;
   part(new THREE.CylinderGeometry(.16,.24,height,8),pole,p.x,base+height/2,p.z);
   part(new THREE.CylinderGeometry(boat?.7:.95,.65,.24,10),shade,p.x,base+height,p.z);
   part(new THREE.SphereGeometry(.38,8,6),glow,p.x,base+height-.34,p.z);
   part(new THREE.CylinderGeometry(.55,.72,.24,10),pole,p.x,base,p.z);
   this.fixtures.push({x:p.x,y:base+height-.4,z:p.z,color:boat?0x83dfff:garden?0xffc779:0xffdfab,height});addCollider(p.x,p.z,.28,base);
  }
  for(const model of models){if(model.userData.motorcycle)continue;for(const x of[-.51,.51])part(new THREE.SphereGeometry(.105,8,6),glow,x,.76,track.course.type==='boat'?1.35:1.48,model);part(new THREE.BoxGeometry(.8,.09,.025),red,0,.65,-1.49,model)}
  this.points=Array.from({length:4},()=>{const l=new THREE.PointLight(0xffdfab,0,25,1.4);world.add(l);return l});
  this.headlights=Array.from({length:3},()=>{const l=new THREE.SpotLight(0xffe7b2,0,33,Math.PI/6,.5,1.1);world.add(l,l.target);return l});this.lastSelection=-Infinity;this.selected=[];
 }
 update(cars,camera,time){if(this.track.course.type==='motorcycle')return;
  // Reassign lamps a few times per second, keeping light counts constant so
  // driving between districts does not trigger shader recompilation.
  if(time-this.lastSelection>.25||time<this.lastSelection){this.lastSelection=time;const p=cars[0];this.selected=[...this.fixtures].sort((a,b)=>(a.x-p.x)**2+(a.z-p.z)**2-((b.x-p.x)**2+(b.z-p.z)**2)).slice(0,4)}
  this.points.forEach((l,i)=>{const p=this.selected[i];if(!p){l.intensity=0;return}l.position.set(p.x,p.y,p.z);l.color.setHex(p.color);l.distance=p.height+21;const distance=Math.hypot(p.x-cars[0].x,p.z-cars[0].z);l.intensity=65*Math.max(0,Math.min(1,(60-distance)/18))*(.97+.03*Math.sin(time*1.8+i))});
  const visible=[cars[0],...cars.slice(1).sort((a,b)=>(a.x-cars[0].x)**2+(a.z-cars[0].z)**2-((b.x-cars[0].x)**2+(b.z-cars[0].z)**2)).slice(0,2)];
  this.headlights.forEach((l,i)=>{const c=visible[i];if(!c){l.intensity=0;return}const fx=Math.sin(c.heading),fz=Math.cos(c.heading);l.position.set(c.x+fx*1.55,c.y+1.05,c.z+fz*1.55);l.target.position.set(c.x+fx*13,c.y-.25,c.z+fz*13);l.intensity=c.boosting?105:80;l.color.setHex(c.boosting?0xdfffad:0xffe7b2)});
 }
 dispose(){for(const l of[...this.points,...this.headlights]){l.removeFromParent();l.target?.removeFromParent();l.dispose()}for(const r of this.owned)r.dispose();this.group.removeFromParent()}
}
