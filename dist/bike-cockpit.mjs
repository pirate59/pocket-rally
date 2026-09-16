import * as THREE from './three.module.mjs';
export class BikeCockpit{
 constructor(){
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(60,1,.01,8);this.scene.add(new THREE.HemisphereLight(0xffffff,0x253c49,3));this.last=-1;this.interior=new THREE.Group();this.scene.add(this.interior);
  const mat=(color,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness:.4,metalness}),black=mat(0x18202a),metal=mat(0x939fa9,.8),gold=mat(0xb9a45e,.6),suit=mat(0x384a5a);
  const mesh=(geo,m,x,y,z,parent=this.interior)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;};
  const box=(w,h,d,m,x,y,z,parent)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
  this.controls=new THREE.Group();this.controls.position.set(0,-.39,-.85);this.interior.add(this.controls);
  const tank=mesh(new THREE.SphereGeometry(1,32,20),mat(0x364852,.35),0,-.71,-.65);tank.scale.set(.37,.33,.55);
  const cap=mesh(new THREE.CylinderGeometry(.075,.075,.02,24),metal,0,-.40,-.55);cap.rotation.x=.25;
  box(.52,.055,.14,metal,0,0,0,this.controls);for(const side of[-1,1]){
   mesh(new THREE.CylinderGeometry(.048,.048,.10,24),gold,side*.22,.015,0,this.controls);
   const bar=box(.24,.045,.045,metal,side*.34,.015,.015,this.controls);bar.rotation.z=side*.12;
   box(.16,.066,.07,black,side*.44,.025,.035,this.controls);const glove=mesh(new THREE.SphereGeometry(1,20,12),black,side*.43,.044,.065,this.controls);glove.scale.set(.095,.065,.09);
   const arm=mesh(new THREE.CylinderGeometry(.055,.075,.28,14),suit,side*.48,-.105,.14,this.controls);arm.rotation.z=-side*.3;
   box(.17,.015,.025,metal,side*.40,.05,-.07,this.controls);box(.06,.08,.07,black,side*.29,.04,.015,this.controls);
  }
  // A curved clear windscreen with a narrow fairing rim; open road above it.
  const curve=new THREE.EllipseCurve(0,-.36,.54,.43,0,Math.PI,false),points=curve.getPoints(40).map(p=>new THREE.Vector3(p.x,p.y,-1.13));const rim=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),40,.012,6,false);mesh(rim,black,0,0,0);
  const shape=new THREE.Shape();shape.moveTo(-.54,-.36);shape.absellipse(0,-.36,.54,.43,Math.PI,0,true);shape.lineTo(-.54,-.36);const screen=mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0xbddde5,transparent:true,opacity:.08,depthWrite:false,side:THREE.DoubleSide}),0,0,-1.14);
  this.screen=screen;
  this.canvas=document.createElement('canvas');this.canvas.width=512;this.canvas.height=256;this.texture=new THREE.CanvasTexture(this.canvas);this.texture.colorSpace=THREE.SRGBColorSpace;
  box(.38,.21,.055,black,0,-.29,-1.0);mesh(new THREE.PlaneGeometry(.35,.175),new THREE.MeshBasicMaterial({map:this.texture,toneMapped:false}),0,-.285,-.968);
 }
 update(speed,lean,steer,dt,aspect){this.camera.aspect=aspect;this.camera.updateProjectionMatrix();const fit=Math.min(1,aspect/.85);this.interior.scale.set(fit,fit,1);this.interior.position.y=-.43*(1-fit);this.controls.rotation.y=steer*.06;const value=Math.round(Math.abs(speed)*5.1),bank=Math.round(Math.abs(lean)*180/Math.PI),key=value*100+bank;if(key===this.last)return;this.last=key;const c=this.canvas.getContext('2d');c.fillStyle='#0b171e';c.fillRect(0,0,512,256);c.fillStyle='#b9ec67';for(let i=0;i<20;i++){c.globalAlpha=i<Math.min(20,value/10)?1:.15;c.fillRect(20+i*24,16,18,18)}c.globalAlpha=1;c.textAlign='center';c.fillStyle='#eff7f7';c.font='bold 96px monospace';c.fillText(value,245,137);c.font='22px sans-serif';c.fillText('KM/H',245,165);c.font='25px monospace';c.fillStyle='#b3c6cb';c.fillText('LEAN '+bank+'°',256,219);this.texture.needsUpdate=true;}
 render(renderer){const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();renderer.render(this.scene,this.camera);renderer.autoClear=auto;}
}
