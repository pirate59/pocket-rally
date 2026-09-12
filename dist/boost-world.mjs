import * as THREE from './three.module.mjs';
export function buildBoostWorld(world,pickups=[],pads=[]){
 const markers=[],padMarkers=[],materials=new Set(),geometries=new Set();
 const material=options=>{const m=new THREE.MeshBasicMaterial({toneMapped:false,...options});materials.add(m);return m};
 const cyan=material({color:0x36dfff}),white=material({color:0xeaffff}),dark=material({color:0x123e50});
 const mesh=(geometry,mat,parent,x=0,y=0,z=0)=>{geometries.add(geometry);const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);parent.add(m);return m};
 const block=(w,h,d,mat,parent,x=0,y=0,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);
 for(const p of pickups){
  const group=new THREE.Group();group.name='Gas tank boost refill '+(p.id+1);group.position.set(p.x,p.y,p.z);world.add(group);
  const base=mesh(new THREE.RingGeometry(.9,1.2,24),material({color:0x36dfff,transparent:true,opacity:.6,depthWrite:false}),group,0,.07);base.rotation.x=-Math.PI/2;
  const item=new THREE.Group();item.name='Miniature gas tank';item.position.y=1.65;group.add(item);
  block(1.12,1.22,.52,cyan,item);block(.98,.1,.57,dark,item,0,-.58);
  // Open handle, offset filler cap and embossed ribs keep the can readable at game scale.
  block(.12,.34,.3,white,item,-.27,.75);block(.12,.34,.3,white,item,.22,.75);block(.61,.12,.3,white,item,-.025,.9);
  const cap=block(.28,.18,.36,dark,item,.46,.66);cap.rotation.z=-.3;
  for(const side of [-1,1]){block(.83,.88,.035,dark,item,0,-.02,side*.28);for(const direction of[-1,1]){const rib=block(.075,.93,.04,cyan,item,0,-.02,side*.31);rib.rotation.z=direction*.65}}
  markers.push({group,item,base,id:p.id});
 }
 const chevron=new THREE.Shape();chevron.moveTo(-1.12,-.22);chevron.lineTo(0,.39);chevron.lineTo(1.12,-.22);chevron.lineTo(1.12,-.58);chevron.lineTo(0,.03);chevron.lineTo(-1.12,-.58);chevron.closePath();
 const chevronGeometry=new THREE.ShapeGeometry(chevron);chevronGeometry.rotateX(Math.PI/2);
 for(const p of pads){
  const group=new THREE.Group();group.name='Forward glowing boost chevrons '+(p.id+1);group.position.set(p.x,p.y+.08,p.z);group.rotation.y=p.heading||0;world.add(group);const arrows=[];
  for(let i=0;i<3;i++){
   const arrow=mesh(chevronGeometry,material({color:0xccfbff,side:THREE.DoubleSide}),group,0,.025,(i-1)*1.05);
   const glow=mesh(chevronGeometry,material({color:0x20ceff,side:THREE.DoubleSide,transparent:true,opacity:.25,depthWrite:false,blending:THREE.AdditiveBlending}),group,0,.012,(i-1)*1.05);glow.scale.set(1.2,1,1.25);
   arrows.push({arrow,glow});
  }padMarkers.push({group,arrows,id:p.id});
 }
 return{update(run,time){for(const m of markers){const ready=run.boostPickups[m.id].readyAt<=run.time;m.item.visible=ready;m.base.material.opacity=ready?.6:.12;m.item.position.y=1.65+Math.sin(time*3+m.id)*.15;m.item.rotation.y=time*.65+m.id}for(const m of padMarkers)for(let i=0;i<m.arrows.length;i++){const {arrow,glow}=m.arrows[i],pulse=.5+.5*Math.sin(time*6-i*1.5);arrow.material.color.setRGB(.35+pulse*.45,.85+pulse*.15,1);glow.material.opacity=.16+pulse*.3}},dispose(){for(const m of [...markers,...padMarkers])m.group.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose()}};
}
export function drawBoostMarkers(ctx,xy,run,large=false){
 for(const p of run.boostPickups){const ready=p.readyAt<=run.time,[x,y]=xy(p.x,p.z),r=large?8:4;ctx.save();ctx.translate(x,y);ctx.globalAlpha=ready?1:.35;ctx.fillStyle=ready?'#37ddff':'#577e89';ctx.strokeStyle='#103545';ctx.lineWidth=1.2;ctx.fillRect(-r*.7,-r*.55,r*1.4,r*1.45);ctx.strokeRect(-r*.7,-r*.55,r*1.4,r*1.45);ctx.strokeStyle=ready?'#b5faff':'#577e89';ctx.strokeRect(-r*.4,-r,r*.65,r*.45);ctx.fillRect(r*.3,-r*.85,r*.4,r*.3);ctx.beginPath();ctx.moveTo(-r*.4,-r*.25);ctx.lineTo(r*.4,r*.6);ctx.moveTo(r*.4,-r*.25);ctx.lineTo(-r*.4,r*.6);ctx.stroke();ctx.restore()}
 for(const p of run.boostPads||[]){const[x,y]=xy(p.x,p.z),[fx,fy]=xy(p.x+Math.sin(p.heading||0),p.z+Math.cos(p.heading||0)),r=large?7:4;ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(fy-y,fx-x)+Math.PI/2);ctx.strokeStyle='#5de7ff';ctx.shadowColor='#24cfff';ctx.shadowBlur=large?5:2;ctx.lineWidth=large?2.5:1.6;ctx.lineJoin='round';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-r*.65,i*r*.65+r*.25);ctx.lineTo(0,i*r*.65-r*.2);ctx.lineTo(r*.65,i*r*.65+r*.25);ctx.stroke()}ctx.restore()}
}
