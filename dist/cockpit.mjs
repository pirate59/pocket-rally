import * as THREE from './three.module.mjs';

// A separate interior pass keeps the windscreen clear of the exterior shell.
export class Cockpit{
 constructor(){
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(60,1,.01,10);this.angle=0;this.speed=-1;
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x27313d,2.4));
  const light=new THREE.DirectionalLight(0xffe5cc,2);light.position.set(-2,3,1);this.scene.add(light);
  const mat=(color,roughness=.7)=>new THREE.MeshStandardMaterial({color,roughness});
  const dark=mat(0x17202b),trim=mat(0x647780,.3),skin=mat(0xc28d64),sleeve=mat(0x204c63);
  const mesh=(geo,m,x,y,z,parent=this.scene)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o};
  // The instrument binnacle is moulded into the full-width dashboard fascia.
  const fascia=new THREE.Shape();fascia.moveTo(-3,-.95);fascia.lineTo(-3,-.34);fascia.lineTo(-.64,-.34);fascia.quadraticCurveTo(-.43,-.34,-.35,-.24);fascia.quadraticCurveTo(-.29,-.19,0,-.19);fascia.quadraticCurveTo(.29,-.19,.35,-.24);fascia.quadraticCurveTo(.43,-.34,.64,-.34);fascia.lineTo(3,-.34);fascia.lineTo(3,-.95);fascia.closePath();
  this.dash=mesh(new THREE.ExtrudeGeometry(fascia,{depth:.3,bevelEnabled:true,bevelSegments:3,bevelSize:.018,bevelThickness:.018,steps:1,curveSegments:24}),dark,0,0,-1.42);
  mesh(new THREE.BoxGeometry(6,.012,.016),trim,0,-.44,-1.087);
  this.wheel=new THREE.Group();this.wheel.position.set(0,-.48,-.9);this.scene.add(this.wheel);
  this.pillars=[-1,1].map(side=>{const p=mesh(new THREE.BoxGeometry(.035,1.4,.04),dark,side,0,-1);p.rotation.z=side*.08;return p});
  mesh(new THREE.TorusGeometry(.22,.026,12,48),dark,0,0,0,this.wheel);
  for(const a of[0,Math.PI*2/3,Math.PI*4/3]){const spoke=mesh(new THREE.BoxGeometry(.022,.21,.022),trim,Math.sin(a)*.095,Math.cos(a)*.095,0,this.wheel);spoke.rotation.z=-a;}
  mesh(new THREE.CylinderGeometry(.065,.065,.045,24),dark,0,0,.015,this.wheel).rotation.x=Math.PI/2;
  for(const side of[-1,1]){
   const hand=mesh(new THREE.SphereGeometry(1,16,12),skin,side*.207,.035,.025,this.wheel);hand.scale.set(.045,.066,.04);hand.rotation.z=side*-.3;
   mesh(new THREE.SphereGeometry(.021,12,8),skin,side*.18,.016,.052,this.wheel);
   const arm=mesh(new THREE.CylinderGeometry(.038,.052,.22,12),sleeve,side*.24,-.11,.055,this.wheel);arm.rotation.z=side*-.27;
  }
  this.canvas=document.createElement('canvas');this.canvas.width=512;this.canvas.height=192;this.ctx=this.canvas.getContext('2d');this.texture=new THREE.CanvasTexture(this.canvas);this.texture.colorSpace=THREE.SRGBColorSpace;
  this.instrument=new THREE.Group();this.instrument.position.set(0,-.295,-1.095);this.scene.add(this.instrument);
  mesh(new THREE.PlaneGeometry(.57,.185),new THREE.MeshBasicMaterial({map:this.texture,transparent:true,toneMapped:false}),0,0,0,this.instrument);
  for(const side of[-1,1]){mesh(new THREE.BoxGeometry(.18,.07,.015),mat(0x090f15),side*.49,-.38,-1.087);for(let i=0;i<5;i++)mesh(new THREE.BoxGeometry(.13,.003,.006),trim,side*.49,-.356-i*.012,-1.076);}
 }
 update(speed,steer,dt,aspect){
  this.angle+=(steer*1.1-this.angle)*(1-Math.exp(-dt*12));this.wheel.rotation.z=this.angle;
  this.camera.aspect=aspect;this.camera.updateProjectionMatrix();
  this.pillars.forEach((p,i)=>p.position.x=(i?1:-1)*aspect*.57);
  // Keep the full wheel visible on portrait phones without raising the dash.
  this.wheel.scale.setScalar(Math.min(.82,aspect/.65));
  this.instrument.scale.setScalar(Math.min(1,aspect/.55));
  const value=Math.round(Math.abs(speed)*5.1);if(value===this.speed)return;this.speed=value;
  const c=this.ctx;c.clearRect(0,0,512,192);c.beginPath();c.roundRect(3,3,506,186,65);c.fillStyle='#53616b';c.fill();c.beginPath();c.roundRect(8,8,496,176,61);c.fillStyle='#080e14';c.fill();
  const start=Math.PI*1.08,end=Math.PI*1.92;
  for(let i=0;i<=30;i++){const a=start+(end-start)*i/30,major=i%5===0;c.beginPath();c.moveTo(256+Math.cos(a)*218,170+Math.sin(a)*145);c.lineTo(256+Math.cos(a)*(major?199:208),170+Math.sin(a)*(major?128:136));c.strokeStyle=i<value/10?'#c6f77b':'#647784';c.lineWidth=major?4:2;c.stroke();}
  c.fillStyle='#eaf4ee';c.textAlign='center';c.font='bold 76px monospace';c.fillText(String(value),256,126);c.font='21px sans-serif';c.fillStyle='#9caeb7';c.fillText('KM/H',256,157);c.font='17px sans-serif';c.fillText('0',56,157);c.fillText('300',455,157);this.texture.needsUpdate=true;
 }
 render(renderer){const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(this.scene,this.camera);renderer.autoClear=auto;}
}
