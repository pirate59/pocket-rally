import {GamepadInput} from './gamepad.mjs';
import {Cockpit} from './cockpit.mjs';
import {configureBoosts,boostRecordSuffix} from './boost-system.mjs';
import {barrierMode,withBarriers,barrierRecordSuffix} from './barrier-modes.mjs';
import {TyreMarks,tyreSurface} from './tyre-marks.mjs';
import {engineClass,engineRecordSuffix} from './engine-classes.mjs';
import {attachBrakeLights,updateBrakeLights,disposeBrakeLights} from './vehicle-lights.mjs';
import {buildOranWorld} from './oran-world.mjs';
import {buildAlbertWorld} from './albert-world.mjs';
import {buildSandownWorld} from './sandown-world.mjs';
import {offsetBoundary,wallMeshData} from './track-boundaries.mjs';
import {buildPanoramaWorld} from './panorama-world.mjs';
import {makeCarpetTrack,CarpetRun} from './carpet-run.mjs';
import {buildCarpetWorld,drawCarpetMap} from './carpet-world.mjs';
import {buildGrandScenery} from './grand-scenery.mjs';
import {bindTouchControls} from './touch.mjs';
import {VisualStyle} from './visual-style.mjs';
import {CourseLights} from './course-lights.mjs';
import {buildBoostWorld,drawBoostMarkers} from './boost-world.mjs';
import * as THREE from './three.module.mjs';
import {COURSES,COLORS,NAMES,makeTrack,nearest,Race,clamp,wrap,angle,formatTime} from './race.mjs';
const $=id=>document.getElementById(id),canvas=$('world');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){$('loading').innerHTML='This game needs WebGL 2. Enable hardware acceleration in your browser, then reload.';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.23;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-50,50,35,-35,.1,1000);camera.position.set(55,68,70);
const chaseCamera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.15,250),chaseTarget=new THREE.Vector3();
const CAMERA_MODES=['close','distant','chase','nose','roof','cockpit'];
const perspectiveView=()=>['chase','nose','roof','cockpit'].includes(cameraMode);
const cockpit=new Cockpit();
scene.add(new THREE.HemisphereLight(0xfaffed,0x516047,1.5));const sun=new THREE.DirectionalLight(0xffedca,2.7);sun.position.set(-28,65,28);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-46;sun.shadow.camera.right=46;sun.shadow.camera.top=39;sun.shadow.camera.bottom=-39;sun.shadow.camera.near=1;sun.shadow.camera.far=140;sun.shadow.bias=-.0006;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight(0xd9edff,.55);fill.position.set(32,19,-24);scene.add(fill);
let world=new THREE.Group();scene.add(world);let selected=0,track,race,mode='menu',cameraMode='close',cpuDifficulty='medium',selectedEngine='commercial',selectedBarriers='bumper',optionsFromPause=false,cameraHeight=24,carModels=[],colliders=[],animated=[],particles=[],tyreMarks=null,soundEnabled=false,audioCtx,engineOsc,engineGain,lastTime=0,accumulator=0,menuClock=0,lastBeep=4,lastFinish=false,shownMessage='',messageUntil=0;
let grandScenery=null,carpetWorld=null,lastCollected=0,mapWasRunning=false,lowClutter=false;
const visualStyle=new VisualStyle();let panoramaWorld=null;let courseLights=null,boostWorld=null,lastBoostRefills=0;
const courseGroup=i=>COURSES[i]?.generated?4:COURSES[i]?.realWorld?3:COURSES[i]?.mode==='collect'?2:COURSES[i]?.grand?1:0;
const isCollection=()=>COURSES[selected]?.mode==='collect';
const boostOptions={manual:true,ground:true};
const createRace=()=>configureBoosts(isCollection()?new CarpetRun(track,cpuDifficulty,undefined,selectedEngine):new Race(track,cpuDifficulty,selectedEngine),boostOptions);
const keys={},mats=new Map(),viewTarget=new THREE.Vector3(),offset=new THREE.Vector3(32,44,39),temp=new THREE.Vector3();
function material(color,roughness=.6,metalness=0){const k=color+':'+roughness+':'+metalness;if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color,roughness,metalness}));return mats.get(k);}
function mesh(geo,color,x=0,y=0,z=0,parent=world,rough=.6,metal=0){const m=new THREE.Mesh(geo,typeof color==='object'?color:material(color,rough,metal));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,color,x,y,z,parent=world){return mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z,parent)}
function bevel(w,h,d,color,x,y,z,parent=world,r=.12){const s=new THREE.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r,bevelThickness:r,curveSegments:3});g.center();return mesh(g,color,x,y,z,parent,.32,.12)}
function cylinder(r1,r2,h,color,x,y,z,parent=world,segments=16){return mesh(new THREE.CylinderGeometry(r1,r2,h,segments),color,x,y,z,parent)}
function sphere(r,color,x,y,z,parent=world,sx=1,sy=1,sz=1){let m=mesh(new THREE.SphereGeometry(r,16,10),color,x,y,z,parent);m.scale.set(sx,sy,sz);return m;}
function barBetween(a,b,width,height,color,parent=world){let delta=new THREE.Vector3().subVectors(b,a),mid=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5),m=box(width,height,delta.length(),color,mid.x,mid.y,mid.z,parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),delta.normalize());return m;}
function textTexture(text,bg,fg,w=512,h=128){let c=document.createElement('canvas');c.width=w;c.height=h;let x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,h);x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';x.font=`bold ${h*.43}px Arial`;x.fillText(text,w/2,h/2);let t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function label(text,bg,fg,w,d,x,y,z,parent=world){let m=mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({map:textTexture(text,bg,fg),roughness:.8}),x,y,z,parent);m.rotation.x=-Math.PI/2;m.castShadow=false;return m;}
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function addCollider(x,z,r,y=0){colliders.push({x,z,r,y})}
function book(x,z,w,d,h,color,title,rotation=0){let g=new THREE.Group();world.add(g);g.position.set(x,0,z);g.rotation.y=rotation;bevel(w,.18,d,color,0,.14,0,g,.06);box(w-.15,h,d-.18,0xefead7,0,h/2+.19,0,g);for(let i=1;i<5;i++)box(w-.1,.02,d-.15,0xd1c7b0,0,.2+i*h/5,0,g);bevel(w,.15,d,color,0,h+.23,0,g,.07);box(.25,h+.3,d,color,-w/2, h/2+.2,0,g);label(title,'#'+new THREE.Color(color).getHexString(),'#f4e9bd',w*.77,d*.35,0,h+.4,0,g);addCollider(x,z,Math.min(w,d)*.5,h/2);return g;}
function pencil(x,z,len,color,rot){let g=new THREE.Group();world.add(g);g.position.set(x,.32,z);g.rotation.y=rot;let body=cylinder(.25,.25,len-1.1,color,0,0,0,g,6);body.rotation.x=Math.PI/2;let tip=cylinder(0,.25,.8,0xddbf87,0,0,len/2-.15,g,6);tip.rotation.x=Math.PI/2;let lead=cylinder(0,.095,.25,0x28362c,0,0,len/2+.2,g,6);lead.rotation.x=Math.PI/2;let eraser=cylinder(.26,.26,.6,0xeab6a5,0,0,-len/2+.2,g,10);eraser.rotation.x=Math.PI/2;let band=cylinder(.27,.27,.22,0xb5bdb1,0,0,-len/2+.6,g);band.rotation.x=Math.PI/2;for(let s=-len/2+.5;s<len/2;s+=1.2)addCollider(x+Math.sin(rot)*s,z+Math.cos(rot)*s,.28);return g;}
function rock(x,z,r,random){let m=mesh(new THREE.DodecahedronGeometry(r,0),[0x939b84,0x8b8b74,0x737e72][Math.floor(random()*3)],x,r*.55,z);m.scale.set(1,.65+random()*.3,.8+random()*.4);m.rotation.set(random(),random()*3,random());addCollider(x,z,r*.8);}
function duck(x,z,s=1){let g=new THREE.Group();g.position.set(x,.15,z);g.scale.setScalar(s);g.rotation.y=-.5;world.add(g);sphere(1.2,0xffd553,0,.6,0,g,1,.8,1.2);sphere(.73,0xffdc5a,0,1.6,.65,g);bevel(.72,.18,.66,0xf49c34,0,1.38,1.3,g,.1);sphere(.09,0x273b36,.5,1.79,.98,g);sphere(.09,0x273b36,-.5,1.79,.98,g);sphere(.6,0xf4bf37,.9,.64,-.1,g,.32,.6,1);addCollider(x,z,1.2*s);animated.push({g,type:'float',y:g.position.y,phase:x});return g;}
function bug(x,z,random){let g=new THREE.Group();world.add(g);g.position.set(x,.15,z);g.rotation.y=random()*6;sphere(.65,0xd45b3a,0,.32,0,g,1,.7,1.2);sphere(.38,0x2e3928,0,.23,.64,g);box(.035,.02,1,0x2e3928,0,.77,-.04,g);for(let a of [-1,1])for(let i=0;i<3;i++){sphere(.09,0x273525,a*.31,.71,-.4+i*.35,g);barBetween(new THREE.Vector3(a*.4,.2,-.4+i*.4),new THREE.Vector3(a*.88,.06,-.52+i*.4),.08,.08,0x303b26,g);}animated.push({g,type:'bug',x,z,phase:random()*6});addCollider(x,z,.75);}
function bigSandcastle(x,z,scale,random){let g=new THREE.Group();world.add(g);g.position.set(x,0,z);g.scale.setScalar(scale);g.rotation.y=random()*6;
 cylinder(4.2,5,6.4,0xE8C994,0,3.2,0,g,20);
 for(let i=0;i<10;i++){let a=i*.628;box(.9,.5,.9,0xd9b475,Math.cos(a)*4.1,6.5,Math.sin(a)*4.1,g);}
 for(let c of[[3.4,3.4],[-3.4,3.4],[3.4,-3.4],[-3.4,-3.4]]){cylinder(1.2,1.55,8.4,0xE8C994,c[0],4.2,c[1],g,16);cylinder(0,1.5,1.9,0xd9a85f,c[0],9.35,c[1],g,16);}
 cylinder(2.2,2.85,14,0xE8C994,0,7,0,g,20);cylinder(0,2.6,2.9,0xcf9c50,0,15.45,0,g,16);
 let flag=box(1.4,.9,.05,0xf25b5b,.8,17,0,g);flag.rotation.y=Math.PI/2;
 barBetween(new THREE.Vector3(.8,15.9,0),new THREE.Vector3(.8,17,0),.08,.08,0x8a6b4a,g);
 box(1.7,3.3,.4,0x6b4f36,0,1.9,4.65,g);
 for(let i=0;i<14;i++){let a=random()*6.28,r=4.3+random()*1.8;sphere(.4+random()*.3,0xd9c193,Math.cos(a)*r,.22,Math.sin(a)*r,g);}
 addCollider(x,z,4.6*scale);return g;}
function beachBucket(x,z,scale,color){let g=new THREE.Group();world.add(g);g.position.set(x,0,z);g.scale.setScalar(scale);g.rotation.y=Math.random()*6;
 cylinder(1.7,1.25,2.8,color,0,1.5,0,g,20);
 cylinder(1.7,1.7,.15,new THREE.Color(color).multiplyScalar(.75).getHex(),0,2.92,0,g,20);
 mesh(new THREE.TorusGeometry(1.3,.13,8,20),new THREE.Color(color).multiplyScalar(.6).getHex(),0,3.3,0,g);
 barBetween(new THREE.Vector3(2.1,0,.3),new THREE.Vector3(2.1,3.2,.5),.13,.13,0xE8D9B0,g);
 let blade=box(1.1,.08,1.3,0x8a95a0,2.1,.15,1.7,g);blade.rotation.x=-.5;
 addCollider(x,z,1.6*scale);return g;}
function beachUmbrella(x,z,color){let g=new THREE.Group();world.add(g);g.position.set(x,0,z);g.rotation.y=Math.random()*6;
 barBetween(new THREE.Vector3(0,0,0),new THREE.Vector3(0,5.6,0),.14,.14,0xE8C994,g);
 cylinder(4.2,0,1.3,color,0,6.1,0,g,10);
 let rim=mesh(new THREE.TorusGeometry(4.1,.12,6,20),new THREE.Color(color).multiplyScalar(.7).getHex(),0,6.72,0,g);rim.rotation.x=-Math.PI/2;
 for(let i=0;i<4;i++){let a=i*1.57+.4,strip=box(.08,.05,4,0xffffff,Math.cos(a)*2.1,6.1,Math.sin(a)*2.1,g);strip.rotation.y=a;}
 box(3.4,.05,2.2,color,2.6,.03,1.6,g);
 addCollider(x,z,1.4);return g;}
function seashell(x,z,scale){let g=new THREE.Group();world.add(g);g.position.set(x,.05,z);g.scale.setScalar(scale);g.rotation.y=Math.random()*6;
 sphere(1.1,0xf2c9a0,0,.55,0,g,1,.62,1.3);
 for(let i=0;i<3;i++){let r=1.05-i*.25,ring=mesh(new THREE.TorusGeometry(r,.06,6,16),0xe0a877,0,.5+i*.12,.15-i*.2,g);ring.rotation.x=-Math.PI/2;}
 return g;}
function beachCrab(x,z,random){let g=new THREE.Group();world.add(g);g.position.set(x,.1,z);g.rotation.y=random()*6;
 sphere(.8,0xe0644a,0,.5,0,g,1,.62,1.25);
 sphere(.07,0xffffff,-.28,.85,.75,g);sphere(.07,0xffffff,.28,.85,.75,g);sphere(.035,0x2a1c14,-.28,.85,.85,g);sphere(.035,0x2a1c14,.28,.85,.85,g);
 for(let s of[-1,1]){barBetween(new THREE.Vector3(s*.75,.85,.55),new THREE.Vector3(s*.95,1.05,.85),.1,.1,0xe0644a,g);sphere(.24,0xe0644a,s*1.02,1.1,.92,g);}
 for(let s of[-1,1])for(let i=0;i<3;i++)barBetween(new THREE.Vector3(s*.55,.5,-.4+i*.4),new THREE.Vector3(s*1.25,.05,-.5+i*.5),.08,.08,0xc2452e,g);
 addCollider(x,z,.9);animated.push({g,type:'bug',x,z,phase:random()*6});return g;}
function makeVehicle(color,type){const g=new THREE.Group();let wheels=[];const dark=0x203d42,chrome=material(0xbac4c0,.25,.8);
 if(type==='boat'){
  const shape=new THREE.Shape();shape.moveTo(-.78,-1.35);shape.lineTo(.78,-1.35);shape.quadraticCurveTo(1.1,.8,0,1.85);shape.quadraticCurveTo(-1.1,.8,-.78,-1.35);const geom=new THREE.ExtrudeGeometry(shape,{depth:.45,bevelEnabled:true,bevelSize:.15,bevelThickness:.15,bevelSegments:3,steps:1});geom.rotateX(-Math.PI/2);geom.rotateY(Math.PI);mesh(geom,color,0,.25,0,g,.27,.2);bevel(1.15,.2,1.5,0xf7ead5,0,.76,.03,g,.08);bevel(.91,.4,.85,dark,0,.96,-.1,g,.1);box(.13,.025,1.1,0xf5eedc,0,.89,-1.03,g);box(.13,.025,.65,0xf5eedc,0,.67,1.01,g);bevel(.5,.35,.4,0x314a44,0,.47,-1.65,g,.05);box(.75,.1,.25,chrome,0,.96,.52,g);
 }else{
  bevel(1.5,.39,2.65,color,0,.58,0,g,.14);bevel(1.56,.12,2.62,0x1f312b,0,.32,0,g,.06);bevel(1.18,.43,1.15,dark,0,1.00,-.12,g,.11);bevel(1.20,.09,.75,color,0,1.29,-.23,g,.07);
  for(let x of[-.22,.22]){box(.17,.025,.83,0xfff2d5,x,.94,.94,g);box(.17,.025,.7,0xfff2d5,x,1.36,-.22,g);box(.17,.025,.45,0xfff2d5,x,.94,-1.05,g)}
  box(1.34,.08,.07,0x1b3030,0,.63,1.49,g);box(1.34,.08,.07,0x1b3030,0,.6,-1.49,g);
  for(let x of[-.52,.52]){let light=box(.35,.15,.08,new THREE.MeshStandardMaterial({color:0xfff6d4,emissive:0xffeeb0,emissiveIntensity:.45}),x,.76,1.41,g);box(.08,.34,.08,0x2a352e,x,1.04,-1.16,g)}
  bevel(1.76,.1,.29,color,0,1.22,-1.19,g,.045);
  for(let x of[-.84,.84])for(let z of[-.92,.9]){let wheel=new THREE.Group();g.add(wheel);wheel.position.set(x,.4,z);let tire=cylinder(type==='buggy'?.45:.36,type==='buggy'?.45:.36,.3,0x252b27,0,0,0,wheel,20);tire.rotation.z=Math.PI/2;let rim=cylinder(.23,.23,.315,chrome,0,0,0,wheel,10);rim.rotation.z=Math.PI/2;for(let s=0;s<5;s++){let spoke=box(.325,.045,.38,0x56615c,0,0,0,wheel);spoke.rotation.x=s*Math.PI/5;}wheels.push(wheel);}
  if(type==='buggy'){g.children.forEach(m=>{if(!wheels.includes(m))m.position.y+=.13});for(let side of[-1,1]){barBetween(new THREE.Vector3(side*.58,.89,.65),new THREE.Vector3(side*.58,1.67,-.25),.09,.09,0x323e30,g);barBetween(new THREE.Vector3(side*.58,1.67,-.25),new THREE.Vector3(side*.58,.9,-.97),.09,.09,0x323e30,g);}barBetween(new THREE.Vector3(-.59,1.67,-.25),new THREE.Vector3(.59,1.67,-.25),.09,.09,0x323e30,g);for(let x of[-.38,0,.38])sphere(.12,0xffe7a1,x,1.71,-.22,g);}
 }
 const shadow=mesh(new THREE.CircleGeometry(1.25,24),new THREE.MeshBasicMaterial({color:0x142719,transparent:true,opacity:.16,depthWrite:false}),0,.04,0,g);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;g.userData={wheels,shadow};attachBrakeLights(g,type);return g;
}
function makeTrafficVehicle(color){
 const g=new THREE.Group(),wheels=[];
 bevel(1.6,.5,2.8,color,0,.55,0,g,.1);bevel(1.2,.6,1.3,0x354f60,0,1.03,-.2,g,.08);box(1.22,.09,.8,color,0,1.37,-.3,g);
 for(const x of[-.86,.86])for(const z of[-.95,.95]){const wheel=new THREE.Group();wheel.position.set(x,.36,z);g.add(wheel);const tire=cylinder(.36,.36,.28,0x293b42,0,0,0,wheel,12);tire.rotation.z=Math.PI/2;wheels.push(wheel)}
 for(const x of[-.5,.5]){box(.35,.17,.08,0xffedb9,x,.65,1.42,g);}
 g.userData={wheels};attachBrakeLights(g,'traffic');return g;
}
function waterMaterial(color,vertexColors=false){
 const mat=new THREE.MeshPhysicalMaterial({color,vertexColors,roughness:.2,metalness:.04,clearcoat:.85,clearcoatRoughness:.17,side:THREE.DoubleSide});
 mat.onBeforeCompile=shader=>{
  shader.uniforms.waterTime={value:0};mat.userData.waterShader=shader;
  shader.vertexShader='varying vec3 waterPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterPosition=(modelMatrix*vec4(position,1.0)).xyz;');
  shader.fragmentShader='uniform float waterTime;\nvarying vec3 waterPosition;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat wave=sin(waterPosition.x*1.7+waterPosition.z*1.1+waterTime*.8)*sin(waterPosition.z*2.3-waterTime*.65);\nfloat glint=pow(max(0.0,wave),9.0);\ndiffuseColor.rgb=diffuseColor.rgb*(.96+wave*.06)+vec3(.10,.19,.25)*glint;');
 };
 mat.customProgramCacheKey=()=>vertexColors?'ripple-channel-v1':'ripple-bath-v1';animated.push({type:'water',mat});return mat;
}
function buildBubbleEdges(barriers){
 const random=rng(8241),bubbles=w=>Math.max(1,Math.ceil(Math.hypot(w.bx-w.ax,w.bz-w.az)/.25)),count=barriers.reduce((n,w)=>n+bubbles(w),0),dummy=new THREE.Object3D();
 const bank=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color:0xf5fbff,roughness:.72}),barriers.length);
 barriers.forEach((wall,i)=>{const delta=new THREE.Vector3(wall.bx-wall.ax,wall.by-wall.ay,wall.bz-wall.az);dummy.position.set((wall.ax+wall.bx)/2,(wall.ay+wall.by)/2+.16,(wall.az+wall.bz)/2);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),delta.clone().normalize());dummy.scale.set(.39,.21,delta.length()/2+.22);dummy.updateMatrix();bank.setMatrixAt(i,dummy.matrix);});
 bank.name='Continuous white foam banks';bank.receiveShadow=true;world.add(bank);
 const foam=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.12,metalness:.01,clearcoat:1,clearcoatRoughness:.04,iridescence:.35,iridescenceIOR:1.33,transparent:false,opacity:1,depthWrite:true}),count);
 const shine=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.96,depthWrite:false}),count);
 let index=0;for(const wall of barriers)for(let j=0;j<bubbles(wall);j++){
  const t=(j+.5)/bubbles(wall),r=.34+random()*.20,x=wall.ax+(wall.bx-wall.ax)*t,z=wall.az+(wall.bz-wall.az)*t,y=wall.ay+(wall.by-wall.ay)*t+r*.88;
  dummy.position.set(x,y,z);dummy.scale.set(r,r*(.88+random()*.25),r);dummy.rotation.set(0,0,0);dummy.updateMatrix();foam.setMatrixAt(index,dummy.matrix);foam.setColorAt(index,new THREE.Color([0xe7f7ff,0xf8f4ff,0xd2eaff,0xffffff][j%4]));
  dummy.position.set(x+r*.32,y+r*.70,z+r*.56);dummy.scale.set(r*.25,r*.12,r*.19);dummy.updateMatrix();shine.setMatrixAt(index,dummy.matrix);index++;
 }
 foam.name='Soap bubble course edges';shine.name='Bubble highlights';foam.receiveShadow=true;world.add(foam,shine);animated.push({g:foam,type:'foam',y:0});animated.push({g:shine,type:'foam',y:0});
}
function buildRoad(){
 const tr=track,co=tr.course;let positions=[],normals=[],colors=[];const roadColor=new THREE.Color(co.road),edgeColor=new THREE.Color(co.type==='boat'?0xf5e8b1:0xe2d8b6);
 const boundaries=new Map(),indices=new Map(tr.nodes.map((p,i)=>[p,i]));
 function vertex(p,side,y=0){if(!boundaries.has(side))boundaries.set(side,offsetBoundary(tr.nodes,side));const q=boundaries.get(side)[indices.get(p)];return[q.x,q.y+y,q.z]}
 function strip(a,b,l,r,col,y=0){const verts=[vertex(a,l,y),vertex(b,l,y),vertex(a,r,y),vertex(b,l,y),vertex(b,r,y),vertex(a,r,y)];for(const v of verts){positions.push(...v);normals.push(0,1,0);colors.push(col.r,col.g,col.b)}}
 for(let i=0;i<tr.n;i++){let a=tr.nodes[i],b=tr.nodes[(i+1)%tr.n];if(a.gap||b.gap)continue;strip(a,b,-co.width/2,co.width/2,a.ramp&&co.type!=='boat'?new THREE.Color(co.type==='buggy'?0xb58c55:0xdac77d):roadColor);if(co.type!=='boat'&&!(co.intersection&&Math.hypot(a.x,a.z)<co.width*.88))for(let s of[-1,1]){let e=co.width/2;strip(a,b,s*(e-.23)-.12,s*(e-.23)+.12,new THREE.Color(0xfff7df),.035);if(co.type!=='boat')strip(a,b,s*(e-.54)-.15,s*(e-.54)+.15,new THREE.Color(Math.floor(i/4)%2?0xfff2d3:0xe77640),.028);}
  if(co.type!=='boat'&&i%11<5&&!(i<9||i>tr.n-9))strip(a,b,-.065,.065,edgeColor,.03);
  if(!co.realWorld&&a.y>1.1&&i%8===0){box(co.width,.24,.8,co.type==='car'?0xc6b680:co.type==='boat'?0x73b8e9:0x7e603e,a.x,a.y-.2,a.z).rotation.y=a.heading;for(let s of[-1,1]){let x=a.x+a.tz*s*(co.width/2-.1),z=a.z-a.tx*s*(co.width/2-.1);if(a.y>2.5&&!tr.nodes.some(p=>p.y<1&&Math.hypot(p.x-x,p.z-z)<co.width/2+.4))cylinder(.16,.2,a.y-.1,co.type==='boat'?0xa4d4f2:0x99876c,x,a.y/2-.12,z);}}
  if(!co.walls&&a.y>2.0&&!a.gap&&!b.gap)for(let s of[-1,1]){let x=a.x+a.tz*s*(co.width/2+.06),z=a.z-a.tx*s*(co.width/2+.06);if(i%6===0)box(.1,.62,.1,0xf0dfae,x,a.y+.3,z);if(i%2===0){let c=tr.nodes[(i+2)%tr.n];barBetween(new THREE.Vector3(x,a.y+.55,z),new THREE.Vector3(c.x+c.tz*s*(co.width/2+.06),c.y+.55,c.z-c.tx*s*(co.width/2+.06)),.085,.085,0xe5d5b1);}}
 }
 let geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));if(co.realWorld)geom.computeVertexNormals();const road=mesh(geom,co.type==='boat'?waterMaterial(0xffffff,true):new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:0,side:THREE.DoubleSide}));road.name=co.type==='boat'?'Blue water race channel':'Race surface';road.castShadow=co.type!=='boat';
 // Each ramp gets a wooden ruler deck, measurements and warning chevrons.
 for(const jump of tr.jumps){
  if(co.type==='car'){
   for(let i=Math.ceil(jump.rampStart*tr.n);i<Math.ceil(jump.gap[0]*tr.n)-1;i+=2){let a=tr.nodes[i],b=tr.nodes[(i+2)%tr.n];barBetween(new THREE.Vector3(a.x,a.y-.09,a.z),new THREE.Vector3(b.x,b.y-.09,b.z),co.width-.3,.1,0xdac77d);}
   for(let i=Math.ceil(jump.rampStart*tr.n);i<Math.floor(jump.gap[0]*tr.n);i+=2){let a=tr.nodes[i],m=box(i%4?.7:1.2,.018,.06,0x63543c,a.x+a.tz*2,a.y+.045,a.z-a.tx*2);m.rotation.y=a.heading;}
  }
  for(let j=0;j<3;j++){const p=tr.nodes[wrap(Math.floor(jump.rampStart*tr.n)-7+j*2,tr.n)],g=new THREE.Group();world.add(g);g.position.set(p.x,p.y+.06,p.z);g.rotation.y=p.heading;for(let side of[-1,1])barBetween(new THREE.Vector3(side*1.1,0,-.6),new THREE.Vector3(0,0,.3),.19,.025,0xf8cf59,g);}
 }
 if(co.type==='boat')buildBubbleEdges(tr.barriers);
 if(tr.barriers.length&&co.type!=='boat'){
  for(const cap of[false,true]){const data=wallMeshData(tr.barriers,cap,w=>new THREE.Color(cap?(co.type==='buggy'?0xc8a775:co.realWorld?0xe9e5d8:Math.floor(w.index/6)%2?0xffe29a:0xfff4d2):co.type==='buggy'?(Math.floor(w.index/6)%2?0x9b754a:0x5a412a):co.realWorld?(Math.floor(w.index/18)%2?0xeee9dc:0xb8463d):(Math.floor(w.index/6)%2?0xe9bd51:0x8c5839))),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));g.computeVertexNormals();const wall=mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,side:THREE.DoubleSide}));wall.name=cap?'Continuous barrier caps':'Continuous circuit barriers';wall.castShadow=true;wall.receiveShadow=true;}
 }
 for(let k=35;k<tr.n;k+=co.type==='boat'?110:55){const p=tr.nodes[k];if(p.gap)continue;let g=new THREE.Group();world.add(g);g.position.set(p.x,p.y+.06,p.z);g.rotation.y=p.heading;for(let s of[-1,1])barBetween(new THREE.Vector3(s*.48,0,-.38),new THREE.Vector3(0,0,.13),.105,.025,co.type==='boat'?0xbde9ff:0xc2c9a8,g);}
 const start=tr.nodes[0];let grid=new THREE.Group();world.add(grid);grid.position.set(start.x,start.y+.055,start.z);grid.rotation.y=start.heading;for(let x=0;x<10;x++)for(let z=0;z<2;z++)box(co.width/10,.03,.42,(x+z)%2?0xf5f0d7:0x27372d,(x-4.5)*co.width/10,0,z*.42-.21,grid);
 for(let s of[-1,1]){box(.18,3.5,.18,0xece9d0,s*(co.width/2+.38),1.7,0,grid);let banner=box(1.1,.6,.06,0xd8f964,s*(co.width/2+.9),3.0,0,grid);}
}
function buildTable(random){
 bevel(94,2,68,0xb88b5e,0,-1.25,0,world,.7);box(93,.07,67,0xcda776,0,-.15,0);for(let i=0;i<23;i++)box(92,.012,.024,0xb69163,0,-.103,-32+i*2.9);
 for(let x of[-39,39])for(let z of[-27,27])box(3.4,7,3.4,0x79593c,x,-5,z);
 const occupied=[];
 function spot(r){for(let i=0;i<2500;i++){let x=(random()-.5)*85,z=(random()-.5)*59;if(Math.abs(x)+r>45||Math.abs(z)+r>32)continue;let distance=Math.min(...track.nodes.map(p=>Math.hypot(x-p.x,z-p.z)));if(distance<track.course.width/2+r+.65||occupied.some(p=>Math.hypot(x-p.x,z-p.z)<r+p.r+.45))continue;occupied.push({x,z,r});return{x,z};}return null;}
 function groupAt(p,rotation=0){let g=new THREE.Group();world.add(g);g.position.set(p.x,0,p.z);g.rotation.y=rotation;return g;}
 // Oversized desk objects make distinct islands inside the racing circuit.
 let keyboard=spot(4.8);if(keyboard){let g=groupAt(keyboard,.08);bevel(8.6,.35,3.65,0xe5e4d8,0,.28,0,g,.18);for(let row=0;row<4;row++)for(let col=0;col<13;col++)bevel(.48,.15,.52,(row===0&&col<3)?0x58857c:0xf5f0df,-3.78+col*.62,.6,-1.15+row*.72,g,.035);bevel(3,.16,.45,0xccd6bf,0,.66,1.1,g,.03);for(let x of[-3,0,3])addCollider(keyboard.x+x,keyboard.z,1.8);}
 for(let i=0;i<7;i++){let p=spot(3.6);if(!p)break;const colors=[0x48746a,0xc16346,0xd3ac46,0x6c82a2];let g=book(p.x,p.z,5.2,4.6,.65+random()*.7,colors[i%4],['FIELD NOTES','BIG IDEAS','DESIGN','SKETCHBOOK'][i%4],(random()-.5)*.5);if(i%2===0){let b=book(p.x+.1,p.z,4.6,4.2,.8,colors[(i+1)%4],'VOL. 02',-.13);b.position.y=1.8;}}
 let cup=spot(2.7);if(cup){let g=groupAt(cup);cylinder(1.8,1.5,3.1,0xeee9d7,0,1.6,0,g,32);cylinder(1.58,1.58,.05,0x493326,0,3.18,0,g,32);let handle=mesh(new THREE.TorusGeometry(.9,.22,10,24),0xeee9d7,1.8,1.65,0,g);handle.rotation.y=Math.PI/2;addCollider(cup.x,cup.z,2);}
 let pot=spot(2.1);if(pot){let g=groupAt(pot);cylinder(1.35,1.15,2.8,0x577e77,0,1.4,0,g,24);cylinder(1.14,1.14,.05,0x314e46,0,2.81,0,g,24);for(let i=0;i<7;i++){let a=i*.95,pen=cylinder(.13,.13,3.5+i%3*.3,[0xe5bb48,0xd46e47,0x527fb3][i%3],Math.cos(a)*.65,3.7,Math.sin(a)*.65,g,6);pen.rotation.z=Math.sin(a)*.17;}addCollider(pot.x,pot.z,1.45);}
 for(let i=0;i<7;i++){let p=spot(2.5);if(!p)break;let g=groupAt(p,random()*3);
  if(i%3===0){bevel(1.45,.35,4.1,0x373e40,0,.24,0,g,.1);bevel(1.4,.46,3.9,0xa65b43,0,.88,-.12,g,.15).rotation.x=-.12;box(1.15,.13,3.6,0xb0b8b0,0,.55,0,g);}
  else if(i%3===1){cylinder(1.65,1.65,.8,0xddba64,0,.45,0,g,32);cylinder(.86,.86,.83,0x886b47,0,.48,0,g,32);cylinder(.59,.59,.84,0xcaa776,0,.49,0,g,32);}
  else{for(let side of[-1,1]){let ring=mesh(new THREE.TorusGeometry(.53,.16,8,20),0x5d9388,side*.62,.23,-1.3,g);ring.rotation.x=-Math.PI/2;barBetween(new THREE.Vector3(side*.62,.19,-.9),new THREE.Vector3(-side*.58,.19,1.9),.15,.08,0xbbc8be,g);}cylinder(.18,.18,.2,0x71857b,0,.25,.15,g);}
  addCollider(p.x,p.z,1.6);
 }
 for(let i=0;i<15;i++){let p=spot(1.45);if(!p)break;let g=groupAt(p,random()*3);
  if(i%4===0){for(let j=0;j<7;j++)box(2.1,.09,2.1,0xe2d27a,0,.09*j+.1,0,g);label('TODO','#eade89','#827b42',1.7,.55,0,.77,-.35,g);}
  else if(i%4===1){bevel(2.4,.6,1.25,0xe1a899,0,.35,0,g,.12);box(1.25,.62,1.26,0xece7d7,-.55,.35,0,g);}
  else if(i%4===2){bevel(1.55,.8,1.1,0x567d94,0,.4,0,g,.06);box(.7,.06,.83,0xbdc9c4,0,.87,0,g);cylinder(.18,.18,.06,0x4b595c,0,.93,0,g);}
  else{box(1.1,.85,.8,0x364540,0,.5,0,g);for(let side of[-1,1]){let clip=mesh(new THREE.TorusGeometry(.34,.045,5,16),0xb9c4b8,0,1.0,side*.34,g);clip.scale.y=1.3;}}
  addCollider(p.x,p.z,1.0);
 }
 // Long pencils line the desk perimeter, safely outside the raised track walls.
 pencil(-12,-32,15,0xe3b946,Math.PI/2);pencil(17,-32,14,0x629586,1.51);pencil(-10,32,14,0xc9674d,1.62);pencil(22,32,12,0x668aac,1.5);pencil(-44,-8,13,0x698fab,.06);pencil(44,10,16,0xd98b49,-.04);
 for(let i=0;i<35;i++){let p=spot(.55);if(!p)break;let g=groupAt(p,random()*3),tor=mesh(new THREE.TorusGeometry(.43,.05,5,18),i%2?0xafb5a9:0xc8a151,0,.12,0,g);tor.rotation.x=-Math.PI/2;tor.scale.set(.65,1,1.6);}
 // Book abutments flank the flyover while leaving the lower crossing open.
 if(track.nodes.some(p=>p.y>4))for(let side of[-1,1]){const node=track.nodes.reduce((best,p)=>Math.abs(p.y-4.6)<Math.abs(best.y-4.6)&&Math.sign(p.z)===side?p:best,track.nodes[0]);for(let edge of[-1,1]){let x=node.x+node.tz*edge*4.9,z=node.z-node.tx*edge*4.9;if(Math.min(...track.nodes.filter(p=>p.y<1).map(p=>Math.hypot(x-p.x,z-p.z)))<5)continue;for(let j=0;j<4;j++){let g=book(x,z,2.7,3.6,.65,[0x587b68,0xb16a4d,0xc5a65b,0x697f96][j],'',node.heading);g.position.y=j*.92;}}}
 label('POCKET RALLY  •  '+track.course.name.toUpperCase(),'#cda776','#8f744f',20,1.5,0,-.1,29);
}

function sceneryPlacer(random){const used=[];return r=>{for(let i=0;i<3000;i++){let x=(random()-.5)*86,z=(random()-.5)*59;if(Math.abs(x)+r>45||Math.abs(z)+r>32)continue;if(Math.min(...track.nodes.map(p=>Math.hypot(x-p.x,z-p.z)))<track.course.width/2+r+.8||used.some(p=>Math.hypot(x-p.x,z-p.z)<r+p.r+.4))continue;used.push({x,z,r});return{x,z};}return null;};}
function buildBath(random){
 const shell=bevel(95,3.4,69,0x167bd8,0,-3.8,0,world,1.4);shell.name='Bathtub shell below water';bevel(94,1.4,2.4,0xf3f1e8,0,.1,-34,world,.6);bevel(94,1.4,2.4,0xf3f1e8,0,.1,34,world,.6);bevel(2.4,1.4,66,0xf3f1e8,-47,.1,0,world,.6);bevel(2.4,1.4,66,0xf3f1e8,47,.1,0,world,.6);
 let waterFloor=box(92,.42,66,0x146fc9,0,-.34,0);waterFloor.name='Blue water basin';waterFloor.castShadow=false;waterFloor.receiveShadow=true;let water=mesh(new THREE.PlaneGeometry(92,66),new THREE.MeshStandardMaterial({color:0x278fe9,roughness:.18,metalness:.08}),0,-.025,0);water.name='Blue bathwater';water.userData.isWaterSurface=true;water.rotation.x=-Math.PI/2;water.castShadow=false;
 const metal=material(0xb6d3cd,.2,.8);cylinder(1.1,1.1,4,metal,42,2,-28);let spout=mesh(new THREE.TorusGeometry(2.1,.55,12,24,Math.PI),metal,40,4,-28);spout.rotation.z=.2;cylinder(.6,.6,1.3,metal,37.96,3.7,-28);addCollider(42,-28,1.6);
 for(let x of[38,44]){cylinder(.65,.65,.35,metal,x,1.1,-32);box(1.8,.2,.35,metal,x,1.4,-32);box(.35,.2,1.8,metal,x,1.4,-32);}
 const spot=sceneryPlacer(random);
 for(let i=0;i<4;i++){let p=spot(2.5);if(!p)break;duck(p.x,p.z,1.5+i%2*.3);}
 for(let i=0;i<7;i++){let p=spot(2.5);if(!p)break;let g=new THREE.Group();world.add(g);g.position.set(p.x,.1,p.z);g.rotation.y=random()*.7-.35;
  if(i%3===0){bevel(4.5,.4,3.1,0xf0e5d3,0,.22,0,g,.3);bevel(3.5,.8,2.3,0xeeb8c2,0,.83,0,g,.4);label('SOAP','#eeb8c2','#a96078',2,.65,0,1.65,0,g);}
  else if(i%3===1){bevel(3.6,1.1,3.1,0xf0d36f,0,.65,0,g,.3);for(let j=0;j<16;j++)sphere(.10,0xc3a349,(random()-.5)*2.9,1.53,(random()-.5)*2.4,g);}
  else{cylinder(1.05,1.18,4.3,0x5e98a7,0,2.15,0,g,24);cylinder(.3,.4,.8,metal,0,4.6,0,g);bevel(1.7,.22,.5,0xf3e3c3,.45,5.03,0,g,.07);let tag=label('BUBBLES','#f2e6c8','#487179',1.6,1.5,0,2.5,1.06,g);tag.rotation.x=0;}
  addCollider(p.x,p.z,1.8);
 }
 for(let i=0;i<5;i++){let p=spot(1.9);if(!p)break;let g=new THREE.Group();world.add(g);g.position.set(p.x,.12,p.z);g.rotation.y=random()*6;bevel(2.7,.42,1.7,[0xe78c5a,0x7cab78,0xcbabdc][i%3],0,.35,0,g,.25);barBetween(new THREE.Vector3(0,.5,0),new THREE.Vector3(0,2.7,0),.08,.08,0xf2e5bd,g);const sail=new THREE.Shape();sail.moveTo(.1,.85);sail.lineTo(.1,2.6);sail.lineTo(1.1,.85);sail.closePath();mesh(new THREE.ShapeGeometry(sail),new THREE.MeshStandardMaterial({color:0xfff4d2,side:THREE.DoubleSide}),0,0,0,g);animated.push({g,type:'float',y:.12,phase:i});addCollider(p.x,p.z,1.3);}
 for(let i=0;i<80;i++){let x=(random()-.5)*87,z=(random()-.5)*60;if(nearest(track,x,z).d<4.1)continue;let bub=sphere(.25+random()*.7,new THREE.MeshStandardMaterial({color:0xf0ffff,transparent:true,opacity:.4,roughness:.13,metalness:.1}),x,.3,z);bub.castShadow=false;animated.push({g:bub,type:'float',y:.3,phase:random()*6});}

 for(let i=0;i<25;i++){let ring=mesh(new THREE.TorusGeometry(.5+random()*1.2,.025,4,32),new THREE.MeshBasicMaterial({color:0xd5fff4,transparent:true,opacity:.3}),(random()-.5)*83,.018,(random()-.5)*56);ring.rotation.x=-Math.PI/2;ring.castShadow=false;animated.push({g:ring,type:'ripple',phase:random()*6});}
 // A giant toothbrush sits along the bath ledge.
 const brush=new THREE.Group();world.add(brush);brush.position.set(-10,1,-33);bevel(15,.4,1.2,0x65aa9c,0,.3,0,brush,.3);bevel(3.9,.5,1.9,0xecebd9,7.4,.4,0,brush,.35);for(let x=0;x<8;x++)for(let z=0;z<3;z++)box(.25,.65,.28,z%2?0xa0cbba:0xf6f4dc,5.9+x*.42,.98,-.5+z*.5,brush);
}
function buildGarden(random){
 bevel(95,2.7,69,0x725939,0,-1.8,0,world,.9);box(94,.45,68,0x6c874d,0,-.3,0);
 const bladeGeo=new THREE.ConeGeometry(.19,1.8,3),grass=new THREE.InstancedMesh(bladeGeo,material(0x668f42),2500),dummy=new THREE.Object3D();let count=0;
 for(let i=0;i<6500&&count<2500;i++){let x=(random()-.5)*91,z=(random()-.5)*65;if(nearest(track,x,z).d<4.2)continue;dummy.position.set(x,.35+random()*.6,z);dummy.rotation.set((random()-.5)*.45,random()*6,(random()-.5)*.45);dummy.scale.set(.7+random(),.5+random()*1.6,.7+random());dummy.updateMatrix();grass.setMatrixAt(count,dummy.matrix);grass.setColorAt(count,new THREE.Color().setHSL(.23+random()*.06,.36+random()*.2,.22+random()*.18));count++;}grass.count=count;grass.castShadow=true;grass.receiveShadow=true;world.add(grass);
 const spot=sceneryPlacer(random);
 for(let i=0;i<7;i++){let p=spot(2.4);if(!p)break;for(let j=0;j<3;j++){let x=p.x+(j-1)*1.0,z=p.z+(j%2)*.65,scale=j===1?1:.55;cylinder(.18*scale,.24*scale,2.3*scale,0xe5d7b0,x,1.15*scale,z);sphere(1.2*scale,j%2?0xe0ad59:0xc9644c,x,2.3*scale,z,world,1,.42,1);for(let a=0;a<4;a++)sphere(.12*scale,0xefe3c5,x+Math.cos(a*1.57)*.6*scale,2.75*scale,z+Math.sin(a*1.57)*.6*scale);addCollider(x,z,.85*scale);}}
 for(let i=0;i<7;i++){let p=spot(2.2);if(!p)break;let g=new THREE.Group();world.add(g);g.position.set(p.x,0,p.z);g.rotation.y=random()*3;const color=[0xdf864f,0x82a8a0,0xd6b15b][i%3];bevel(3.3,1.6,2.6,color,0,.85,0,g,.09);for(let x of[-.95,0,.95])for(let z of[-.7,.7])cylinder(.27,.27,.18,color,x,1.82,z,g);addCollider(p.x,p.z,1.9);}
 for(let i=0;i<3;i++){let p=spot(3.0);if(!p)break;let g=new THREE.Group();world.add(g);g.position.set(p.x,0,p.z);g.rotation.y=random()*4;
  if(i===0){let abandoned=makeVehicle(0xc99051,'buggy');g.add(abandoned);abandoned.rotation.z=.12;abandoned.scale.setScalar(1.4);}
  else if(i===1){sphere(2.1,0xdbbc65,0,2,0,g);mesh(new THREE.TorusGeometry(2.11,.07,6,32),0xe78554,0,2,0,g);}
  else{sphere(1.4,0x80a77b,0,1.8,0,g,1,.8,1.7);sphere(.7,0x80a77b,0,3,1.6,g);for(let x of[-.7,.7])for(let z of[-.9,.9])cylinder(.28,.4,1.2,0x689466,x,.6,z,g);barBetween(new THREE.Vector3(0,1.8,-1.9),new THREE.Vector3(0,2,-3.1),.45,.4,0x80a77b,g);sphere(.1,0x2e4436,.5,3.2,1.9,g);for(let j=0;j<5;j++){let spine=mesh(new THREE.ConeGeometry(.32,.7,3),0xb6c87f,0,3.05,-1.5+j*.55,g);}}
  addCollider(p.x,p.z,2.0);
 }
 for(let i=0;i<6;i++){let p=spot(2.5);if(!p)break;let log=cylinder(.7,.85,4.4,0x6d5136,p.x,.72,p.z,world,14);log.rotation.z=Math.PI/2;let end=cylinder(.61,.61,.07,0xc1a070,p.x+2.23,.72,p.z,world,14);end.rotation.z=Math.PI/2;for(let x of[-1.4,0,1.4])addCollider(p.x+x,p.z,.8);}
 for(let i=0;i<12;i++){let p=spot(1.0);if(!p)break;bug(p.x,p.z,random);}
 for(let i=0;i<42;i++){let p=spot(.7+random()*.5);if(!p)break;if(i%5===0){sphere(.55,material([0x87bbc3,0xcd995f,0x88a76c][i%3],.12,.35),p.x,.55,p.z);addCollider(p.x,p.z,.55);}else rock(p.x,p.z,.6+random()*.5,random);}
 for(let i=0;i<10;i++){let x=i<5?-45:45,z=-27+(i%5)*13.5,g=new THREE.Group();world.add(g);g.position.set(x,0,z);cylinder(.16,.22,4.8,0x476c36,0,2.4,0,g);sphere(.58,0xe4ae48,0,4.9,0,g);for(let j=0;j<7;j++)sphere(.53,0xf7e9c3,Math.cos(j*.9)*.85,4.8,Math.sin(j*.9)*.85,g,1,.25,1);}
 // Timber decking and cut log ends make the elevated section unmistakable.
 for(let i=0;i<track.n;i+=4){let p=track.nodes[i];if(p.y>2&&!p.gap&&!p.ramp){let sleeper=box(track.course.width,.12,.75,i%8?0xa88b5b:0xc2a375,p.x,p.y+.025,p.z);sleeper.rotation.y=p.heading;}}
}
function buildBeach(random){
 // The track (a stadium loop) is kept within |x|<=35, |z|<=18. The water and
 // dune bands sit at |z|>=24, a clear 6-unit gap from the racing line, and all
 // scattered scenery is confined to the sand strip between them.
 bevel(95,2.4,68,0xE3C88F,0,-1.6,0,world,.8);box(93,.1,66,0xEBD5A3,0,-.32,0);
 let water=box(93,.3,9,0x2e9fd6,0,.3,28.5);water.name='Shoreline water';water.userData.isWaterSurface=true;water.castShadow=false;
 for(let i=0;i<16;i++){let x=(random()-.5)*90,foam=mesh(new THREE.BoxGeometry(2.6+random()*2,.06,.9),new THREE.MeshStandardMaterial({color:0xf3fbff,transparent:true,opacity:.6,roughness:.3}),x,.48,24+random()*1.2);foam.castShadow=false;animated.push({g:foam,type:'float',y:.48,phase:random()*6});}
 // Dune hills with sparse marram grass tufts line the opposite, inland edge.
 // Generated courses may reach the dune band, so each dune steps inland until
 // its footprint clears the road, or is left out if it cannot.
 for(let i=0;i<7;i++){let x=-40+i*13.5+((i%2)*2-1)*2,z=-28-random()*2,r=4.5+random()*2;const clear=()=>Math.min(...track.nodes.map(p=>Math.hypot(x-p.x,z-p.z)))>track.course.width/2+r*.85+.8;while(!clear()&&z>-33)z-=1;if(!clear())continue;let dune=sphere(r,0xDDBB80,x,r*.42,z,world,1.5,.55,1.15);dune.rotation.y=random()*6;
  for(let j=0;j<5;j++)cylinder(.05,.12,1+random()*1.1,0x9aa66a,x+(random()-.5)*r*1.6,r*.7+.4,z+(random()-.5)*r*.8,world,4);
 }
 // A dedicated placer keeps every scattered item inland of both bands, clear
 // of the water and off the dune footprint, so nothing looms over the track.
 const used=[];
 function beachSpot(r){for(let i=0;i<3000;i++){let x=(random()-.5)*76,z=(random()-.5)*38;if(Math.abs(x)+r>36||z+r>21||z-r<-21)continue;if(Math.min(...track.nodes.map(p=>Math.hypot(x-p.x,z-p.z)))<track.course.width/2+r+2.4)continue;if(used.some(p=>Math.hypot(x-p.x,z-p.z)<r+p.r+.7))continue;used.push({x,z,r});return{x,z};}return null;}
 for(let i=0;i<2;i++){let p=beachSpot(7);if(!p)break;bigSandcastle(p.x,p.z,.85,random);}
 for(let i=0;i<5;i++){let p=beachSpot(2.4);if(!p)break;beachBucket(p.x,p.z,.8+random()*.3,[0xef5b57,0x4fb3d9,0xf2c14e,0x6ec488][i%4]);}
 for(let i=0;i<3;i++){let p=beachSpot(5);if(!p)break;beachUmbrella(p.x,p.z,[0xef8362,0x4fb3d9,0xf2c14e][i%3]);}
 for(let i=0;i<3;i++){let p=beachSpot(2.2);if(!p)break;let log=cylinder(.5,.62,3.4,0x8a765c,p.x,.55,p.z,world,12);log.rotation.z=Math.PI/2;log.rotation.y=random()*3;addCollider(p.x,p.z,1.6);}
 for(let i=0;i<8;i++){let p=beachSpot(.7);if(!p)break;seashell(p.x,p.z,.4+random()*.3);}
 for(let i=0;i<4;i++){let p=beachSpot(1);if(!p)break;beachCrab(p.x,p.z,random);}
 label('POCKET RALLY  •  '+track.course.name.toUpperCase(),'#E3C88F','#8f744f',20,1.5,0,-.1,-33);
}


function buildGrandWorld(random){
 const co=track.course,theme=co.base,[w,d]=co.mapSize;
 const base=bevel(w,2,d,[0xb88b5e,0xf0eee5,0x725939,0xdcc38c][theme],0,-2,0,world,.6);base.name='Grand tour base';
 const surface=box(w-1,.12,d-1,[0xcda776,waterMaterial(0x168ed0),0x68844a,0xE3C88F][theme],0,-.16,0);surface.name=theme===1?'Full blue basin water':'Grand tour terrain';
 if(theme===0){for(let z=-d/2+3;z<d/2;z+=5)box(w-2,.015,.035,0xb89363,0,-.09,z);for(let x of[-w*.43,w*.43])for(let z of[-d*.42,d*.42])box(5,7,5,0x79593c,x,-6,z);}
 if(theme===1){for(let side of[-1,1]){bevel(w,1.7,2.8,0xf6f4e9,0,.2,side*(d/2-1),world,.5);bevel(2.8,1.7,d,0xf6f4e9,side*(w/2-1),.2,0,world,.5);}}
 // The circuit (Bay lobe + Dune lobe joined at one coastal junction) is
 // verified to stay within x:[-140,178] z:[-86,198]. The shoreline wraps the
 // bay's NE corner (beyond x=195 or z=215) and the dune band wraps the SW
 // corner (beyond x=-160 or z=-105) — both a guaranteed 15+ unit clearance
 // from the racing line on every approach, never crossed by the track.
 if(theme===3){
  box(20,1.6,d+40,0x2e9fd6,205,.3,85).name='Grand tour shoreline east';
  box(w+40,1.6,20,0x2e9fd6,77.5,.3,225).name='Grand tour shoreline north';
  for(let i=0;i<7;i++){let z=-d/2+20+i*(d-40)/6,r=9+random()*4,dune=sphere(r,0xDDBB80,-170,r*.42,z,world,1.25,.55,1.7);dune.rotation.y=random()*6;for(let j=0;j<4;j++)cylinder(.05,.12,1+random()*1.2,0x9aa66a,-170+(random()-.5)*r*1.3,r*.75+.4,z+(random()-.5)*r*1.6,world,4);}
  for(let i=0;i<5;i++){let x=-w/2+20+i*(w*.42)/4,r=9+random()*4,dune=sphere(r,0xDDBB80,x,r*.42,-115,world,1.7,.55,1.25);dune.rotation.y=random()*6;for(let j=0;j<4;j++)cylinder(.05,.12,1+random()*1.2,0x9aa66a,x+(random()-.5)*r*1.6,r*.75+.4,-115+(random()-.5)*r*1.3,world,4);}
 }
 const occupied=[];
 function spot(r){for(let tries=0;tries<400;tries++){let x=(random()-.5)*(w-12),z=(random()-.5)*(d-12);if(nearest(track,x,z).d<co.width/2+r+(theme===3?4.5:1.5)||track.hazards.some(h=>Math.hypot(x-h.x,z-h.z)<20)||occupied.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+r+1)||(theme===3&&(x+r>195||z+r>215||x-r<-160||z-r<-105)))continue;occupied.push({x,z,r});return{x,z};}return null;}
 grandScenery=buildGrandScenery({world,track,random,spot,addCollider});
 // Two hand-placed signature landmarks mark the course's named corners.
 if(theme===3){
  // Lighthouse Point: a tall striped tower overlooking the headland hairpin.
  let lg=new THREE.Group();world.add(lg);lg.position.set(140,0,228);
  cylinder(2.2,3.2,18,0xf2ede0,0,9,0,lg,16);
  cylinder(2.5,2.5,2,0xd6473a,0,5.5,0,lg,16);
  cylinder(2.35,2.35,1.8,0xd6473a,0,12.5,0,lg,16);
  cylinder(1.9,1.9,1.6,0xd9d2c1,0,18.8,0,lg,16);
  cylinder(1.5,1.5,2,0xbfe8ef,0,20.6,0,lg,12);
  cylinder(0,1.9,1.8,0xb43b30,0,22.5,0,lg,12);
  sphere(.6,0xfff3c2,0,20.6,0,lg);
  box(5,3,5,0xf2ede0,4.4,1.5,0,lg);
  addCollider(140,228,9.5);
  // Reef Chicane: a half-buried shipwreck marks the outside of the flick.
  let hull=sphere(6,0x8a6b4a,112,1.6,138,world,1.9,1,3.4);hull.rotation.y=.6;
  let mast=cylinder(.22,.3,6,0x5c4530,112+Math.sin(.6)*1.5,4.6,138+Math.cos(.6)*1.5);mast.rotation.z=.3;
  addCollider(112,138,6.5);
 }
 for(let i=0;i<32;i++){let p=spot(i%5===0?5:2.7);if(!p)continue;let {x,z}=p;
  if(theme===0){if(i%5===0)book(x,z,7,5,1+random()*1.7,[0x48746a,0xc16346,0xd3ac46,0x6c82a2][i%4],['SKETCHBOOK','BIG IDEAS','FIELD NOTES'][i%3],random()*3);else if(i%5===1)pencil(x,z,4.5,0xe5b842,random()*6);else if(i%5===2){cylinder(1.3,1.1,2.8,0xf0ead6,x,1.4,z);cylinder(1.12,1.12,.08,0x503d2c,x,2.83,z);addCollider(x,z,1.3);}else if(i%5===3){bevel(3.2,.75,1.8,0xe7a29a,x,.4,z);addCollider(x,z,1.7);}else{let g=new THREE.Group();world.add(g);g.position.set(x,.05,z);g.rotation.y=random()*3;for(let j=0;j<3;j++)box(4,.025,3,0xf5eedb,j*.15,j*.04,0,g);}}
  else if(theme===1){if(i%4===0)duck(x,z,1.1+random()*.6);else if(i%4===1){bevel(3.5,.6,2.2,[0xf3b9c9,0xb4e0c5,0xecdab0][i%3],x,.28,z,world,.25);addCollider(x,z,1.7);}else if(i%4===2){cylinder(.9,1.1,3.2,[0x61a8b2,0xb698cd,0xe9ba71][i%3],x,1.6,z);cylinder(.6,.6,.5,0xf8f2df,x,3.4,z);addCollider(x,z,1.1);}else{for(let j=0;j<5;j++)sphere(.4+random()*.5,0xe9faff,x+(random()-.5)*3,.35,z+(random()-.5)*3);}}
  else if(theme===2){if(i%5===0){let g=makeVehicle([0xcd854b,0x7eaaa2,0xd6ad58][i%3],'buggy');g.position.set(x,0,z);g.rotation.y=random()*6;world.add(g);addCollider(x,z,1.8);}else if(i%5===1){cylinder(.3,.4,2.3,0xe5d7b0,x,1.15,z);sphere(1.5,0xc9644c,x,2.3,z,world,1,.4,1);addCollider(x,z,.9);}else if(i%5===2)bug(x,z,random);else if(i%5===3){bevel(3,1.3,2,0xd9ae56,x,.7,z);for(let a of[-.8,.8])for(let b of[-.5,.5])cylinder(.25,.25,.25,0xd9ae56,x+a,1.5,z+b);addCollider(x,z,1.6);}else rock(x,z,1.3+random(),random);}
  else{if(i%4===0){let log=cylinder(.55,.7,3.6,0x8a765c,x,.6,z);log.rotation.z=Math.PI/2;log.rotation.y=random()*3;addCollider(x,z,1.7);}else if(i%4===1)seashell(x,z,.7+random()*.5);else if(i%4===2)rock(x,z,1+random()*.7,random);else{let g=new THREE.Group();world.add(g);g.position.set(x,.05,z);g.rotation.y=random()*6;for(let k=0;k<5;k++){let a=k*1.2566,arm=box(.5,.22,1.5,0xef8f5c,Math.cos(a)*1.2,.18,Math.sin(a)*1.2,g);arm.rotation.y=-a;}addCollider(x,z,1.3);}}
 }
 if(theme===2||theme===3){const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.23,1.8,3),material(theme===3?0x9aa66a:0x668f42),9000),dummy=new THREE.Object3D();let count=0;for(let i=0;i<15000&&count<9000;i++){let x=(random()-.5)*(w-3),z=(random()-.5)*(d-3);if(nearest(track,x,z).d<co.width/2+1)continue;if(theme===3&&(x>195||z>215||x<-160||z<-105))continue;dummy.position.set(x,.6,z);dummy.rotation.set(0,random()*6,(random()-.5)*.5);dummy.scale.set(1,.5+random()*1.7,1);dummy.updateMatrix();grass.setMatrixAt(count,dummy.matrix);grass.setColorAt(count,new THREE.Color().setHSL(theme===3?.16+random()*.05:.24+random()*.05,theme===3?.35:.45,.25+random()*.15));count++;}grass.count=count;world.add(grass);}
 for(const o of track.debris){let g=new THREE.Group();g.name='Passable lane debris';g.position.set(o.x,o.y,o.z);g.rotation.y=o.heading+.45;world.add(g);if(theme===0){bevel(1.7,.6,1.2,0xe6a29a,0,.32,0,g);box(.6,.03,1.22,0x75a8a0,0,.67,0,g);}else if(theme===1){sphere(.9,0xffd553,0,.4,0,g,1,.55,1);sphere(.48,0xffdc5a,0,1,.5,g);box(.5,.15,.45,0xf49c34,0,.9,.9,g);}else if(theme===2){mesh(new THREE.DodecahedronGeometry(1.05),0x939b84,0,.45,0,g).scale.y=.65;}else{sphere(.75,0xf2c9a0,0,.42,0,g,1,.6,.9);let ring=mesh(new THREE.TorusGeometry(.55,.05,6,16),0xe0a877,0,.48,-.15,g);ring.rotation.x=-Math.PI/2;}colliders.push(o);}
 // Four open approaches share the same height. The corner posts never block cross traffic.
 const e=co.width/2+1.3,corners=theme===1?[[0,-13],[13,0],[0,13],[-13,0]]:[[-e,-e],[-e,e],[e,-e],[e,e]];for(const [x,z] of corners){cylinder(.15,.2,2,0xe9c153,x,1,z);let sign=box(1.1,1.1,.1,0xf4c64f,x,2.25,z);sign.rotation.z=Math.PI/4;}
 for(const h of track.hazards){let g=new THREE.Group();g.name=h.label;g.position.set(h.x,.02,h.z);g.rotation.y=Math.atan2(h.tx,h.tz);world.add(g);const side=(co.width/2+2)*(theme===0?-1:1);
  if(theme===0){cylinder(1.3,1.5,.3,0x315d61,side,.2,0,g);box(.3,3,.3,0x315d61,side,1.7,0,g);let fan=new THREE.Group();fan.position.set(side,3.5,0);fan.rotation.y=Math.PI/2;g.add(fan);mesh(new THREE.TorusGeometry(1.5,.12,8,32),0x658582,0,0,0,fan);let rotor=new THREE.Group();fan.add(rotor);for(let i=0;i<4;i++){let blade=box(.48,2.5,.1,0x78ada6,0,0,0,rotor);blade.rotation.z=i*Math.PI/4;}sphere(.27,0x315d61,0,0,.15,fan);animated.push({type:'fan',g:rotor});}
  else if(theme===1){cylinder(1.7,1.7,.12,0x567f89,side,.1,0,g);for(let i=-2;i<=2;i++)box(2.3,.02,.12,0x24424d,side,.17,i*.42,g);for(let i=0;i<3;i++){let ring=mesh(new THREE.TorusGeometry(1.8+i*.7,.045,4,32),0xbdefff,side,.14,0,g);ring.rotation.x=-Math.PI/2;animated.push({g:ring,type:'ripple',phase:i*.25});}}
  else if(theme===2){box(co.width+7,.025,9,waterMaterial(0x37aaca),0,.18,0,g);for(let sideSign of[-1,1])for(let j of[-1,1])sphere(.8,0x8d9984,sideSign*(co.width/2+2),.35,j*4.8,g,1,.6,1);}
  else{box(co.width+7,.025,9,waterMaterial(0x2e9fd6),0,.18,0,g);for(let sideSign of[-1,1]){cylinder(.18,.18,2.2,0x8a765c,sideSign*(co.width/2+2),1.1,-3,g);cylinder(.18,.18,2.2,0x8a765c,sideSign*(co.width/2+2),1.1,3,g);}for(let j of[-1,1])sphere(1.1,0xDDBB80,0,.3,j*5.4,g,1.6,.5,1.2);}
  for(let i=0;i<12;i++){let streak=box(1.1,.025,.07,[0xf0e4b9,0xc8f6ff,0xc8f6ff,0xbfe9f7][theme],0,.24,(i%6-2.5)*1.35,g);animated.push({type:'current',g:streak,phase:i/12,width:co.width+3,speed:theme===0?5:2.5});}
  label(['SIDE DRAFT','DRAIN CURRENT','RUNNING CREEK','RIP CURRENT'][theme],'#244c4c','#e5f5cc',7,1.3,h.x, .07,h.z-10);
 }
}

function clearWorld(){tyreMarks?.dispose();tyreMarks=null;carModels.forEach(disposeBrakeLights);panoramaWorld?.dispose();panoramaWorld=null;visualStyle.clear();boostWorld?.dispose();boostWorld=null;courseLights?.dispose();courseLights=null;grandScenery?.dispose();grandScenery=null;carpetWorld=null;world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Array.isArray(o.material)&&o.material.map){o.material.map.dispose();o.material.dispose();}});scene.remove(world);world=new THREE.Group();scene.add(world);carModels=[];animated=[];colliders=[];particles=[];}
function setupCourse(index){sun.position.set(-28,65,28);sun.target.position.set(0,0,0);sun.shadow.camera.left=-46;sun.shadow.camera.right=46;sun.shadow.camera.top=39;sun.shadow.camera.bottom=-39;sun.shadow.camera.far=140;sun.shadow.camera.updateProjectionMatrix();selected=index;clearWorld();track=isCollection()?makeCarpetTrack(COURSES[index]):makeTrack(withBarriers(COURSES[index],selectedBarriers));race=createRace();tyreMarks=new TyreMarks(world,track);const theme=index%3,random=rng(713+index*201);scene.background=new THREE.Color(0x000000);scene.fog=new THREE.Fog(0x000000,115,210);
 if(isCollection()){carpetWorld=buildCarpetWorld({world,track,addCollider});grandScenery=carpetWorld.fader;}else{if(track.course.realWorld)panoramaWorld=(track.course.id==='sandown'?buildSandownWorld:track.course.id==='albert-park'?buildAlbertWorld:track.course.id==='oran-park'?buildOranWorld:buildPanoramaWorld)({world,track,addCollider});else if(track.course.grand)buildGrandWorld(random);else if(track.course.deco==='bath')buildBath(random);else if(track.course.deco==='garden')buildGarden(random);else if(track.course.deco==='beach')buildBeach(random);else buildTable(random);buildRoad();}race.obstacles=colliders;
 for(const c of race.cars){const model=isCollection()&&!c.racer?makeTrafficVehicle(c.color):makeVehicle(c.color,COURSES[index].type);world.add(model);carModels.push(model);if(c.id===0||c.racer){const playerTag=new THREE.Sprite(new THREE.SpriteMaterial({map:textTexture(c.name,'#203129',c.id===0?'#dcff61':'#ffffff',128,64),depthTest:false,transparent:true}));playerTag.scale.set(1.8,.9,1);playerTag.position.y=3;model.add(playerTag);model.userData.playerTag=playerTag;}}
 for(let i=0;i<race.cars.length;i++){let model=carModels[i],c=race.cars[i];model.position.set(c.x,c.y,c.z);model.rotation.y=c.heading;}
 courseLights=new CourseLights(world,track,carModels,race.cars,colliders,addCollider);boostWorld=buildBoostWorld(world,race.boostPickups,race.boostPads);visualStyle.prepare(world,carModels);
 $('course-title').textContent=COURSES[index].name;$('course-tag').textContent=COURSES[index].tag;$('course-desc').innerHTML=COURSES[index].desc;$('terrain-tags').innerHTML=COURSES[index].tags.map(t=>`<span>${t}</span>`).join('');document.querySelectorAll('.course').forEach((b,i)=>{b.classList.toggle('selected',i===index);b.setAttribute('aria-pressed',String(i===index));});
 document.querySelectorAll('[data-course]').forEach(b=>b.classList.toggle('hidden',courseGroup(Number(b.dataset.course))!==courseGroup(index)));document.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.group)===courseGroup(index))));let record=getBest(index);$('best').textContent=record?`BEST ${formatTime(record)}`:'NO RECORD YET';$('loading').classList.add('hidden');configureRaceUI();resize();
}
function getBest(index){try{return Number(localStorage.getItem('pocket-rally-best-'+cpuDifficulty+'-'+index+(COURSES[index].revision?'-v'+COURSES[index].revision:'')+engineRecordSuffix(selectedEngine)+barrierRecordSuffix(COURSES[index],selectedBarriers)+boostRecordSuffix(boostOptions)))||0}catch{return 0}}
function setVisible(id,visible){$(id).classList.toggle('hidden',!visible)}
function startRace(){if($('options-dialog').open)return;$('barrier-mode').disabled=true;tyreMarks?.clear();$('engine-class').disabled=true;$('cpu-difficulty').disabled=true;race=createRace();lastCollected=0;lastBoostRefills=0;closeMap(false);race.obstacles=colliders;mode='race';cameraHeight=raceCameraHeight();viewTarget.set(race.cars[0].x,race.cars[0].y*.7,race.cars[0].z);lastFinish=false;lastBeep=4;shownMessage='';messageUntil=0;accumulator=0;clearKeys();for(const p of particles)world.remove(p.mesh);particles=[];['menu','course-info'].forEach(id=>setVisible(id,false));['hud','driving-hud','minimap','pause'].forEach(id=>setVisible(id,true));document.querySelector('.race-only').classList.remove('hidden');document.body.classList.add('racing');$('results').close();$('pause-dialog').close();if(soundEnabled)initAudio();updateHUD();}
function backToMenu(){$('barrier-mode').disabled=false;$('engine-class').disabled=false;closeMap(false);$('cpu-difficulty').disabled=false;mode='menu';race.paused=false;clearKeys();$('pause-dialog').close();$('results').close();['menu','course-info'].forEach(id=>setVisible(id,true));['hud','driving-hud','minimap','pause'].forEach(id=>setVisible(id,false));document.querySelector('.race-only').classList.add('hidden');document.body.classList.remove('racing');$('race-message').textContent='';setupCourse(selected);}
function togglePause(force){if(mode!=='race'||$('options-dialog').open)return;if($('carpet-map').open)closeMap(false);race.paused=typeof force==='boolean'?force:!race.paused;clearKeys();if(race.paused)$('pause-dialog').showModal();else $('pause-dialog').close();}
function clearKeys(){for(const k in keys)delete keys[k];touchControls.clear();controller.block()}
function notify(message,duration=1.7){if(lowClutter&&message!=='BACK ON TRACK')return;shownMessage=message;messageUntil=performance.now()/1000+duration}
function finish(){lastFinish=true;mode='results';race.paused=true;clearKeys();let me=race.cars[0],ranking=race.ranking(),place=ranking.findIndex(c=>c.id===0)+1,best=getBest(selected);if(me.finish!==null&&(!best||me.finish<best)){try{localStorage.setItem('pocket-rally-best-'+race.difficulty+'-'+selected+(COURSES[selected].revision?'-v'+COURSES[selected].revision:'')+engineRecordSuffix(race.engineClass)+barrierRecordSuffix(track.course,selectedBarriers)+boostRecordSuffix(race.boostOptions),String(me.finish))}catch{}}
 if(isCollection()){finishCollection(me,best);return;}
 $('result-eyebrow').textContent=place===1?'WINNER’S CIRCLE':'FINISH LINE';$('result-title').textContent=['','Small car. Big win.','So close.','A wild ride.','Keep it tiny.'][place];$('result-time').textContent=`${COURSES[selected].name} · ${race.difficulty.toUpperCase()} · ${formatTime(me.finish)}${!best||me.finish<best?' · New personal best':''}`;$('result-standings').innerHTML=ranking.map((c,i)=>`<li>${i+1}<span class="car-dot" style="background:${c.color}"></span><strong>${c.name}</strong><span>${c.finish?formatTime(c.finish):'Unfinished'}</span></li>`).join('');$('race-message').textContent='';$('results').showModal();beep(place===1?880:550,.3);}
function initAudio(){if(audioCtx){audioCtx.resume();return}try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();engineOsc=audioCtx.createOscillator();engineGain=audioCtx.createGain();engineOsc.type='sawtooth';engineGain.gain.value=0;let filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;engineOsc.connect(filter);filter.connect(engineGain);engineGain.connect(audioCtx.destination);engineOsc.start();}catch{soundEnabled=false}}
function beep(freq,duration=.11){if(!soundEnabled||!audioCtx)return;let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.07,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}
function updateHUD(){if(isCollection()){updateCollectionHUD();return;}let me=race.cars[0],ranking=race.ranking();$('hazard-status').textContent=track.course.realWorld?((track.sections.filter(s=>s.index<=me.index).at(-1)||track.sections[0]).name+(track.course.elevationScale===null?'':(' · '+Math.round(Math.max(0,me.y-.13)/.18)+' m ↑'))):me.hazard||'';$('position').textContent=ranking.findIndex(c=>c.id===0)+1;$('lap').textContent=Math.min(3,Math.max(1,Math.floor(me.progress/track.n)+1));$('timer').textContent=formatTime(race.time);$('speed').textContent=Math.round(Math.abs(me.speed)*5.1);updateBoostHUD(me);$('standings').innerHTML=ranking.map((c,i)=>`<li class="${c.id===0?'you':''}">${i+1}<span class="car-dot" style="background:${c.color}"></span>${c.name}${c.finish?' ✓':''}</li>`).join('');drawMinimap();}
function drawMinimap(){if(isCollection()){drawCarpetMap($('minimap'),track,race);return;}let cv=$('minimap'),ctx=cv.getContext('2d'),sx=track.course.realWorld?(cv.width-20)/track.course.mapSize[0]:2.35/(track.course.mapScale||1),sz=track.course.realWorld?(cv.height-20)/track.course.mapSize[1]:2.35/(track.course.mapScale||1),cx=cv.width/2,cz=cv.height/2;ctx.clearRect(0,0,cv.width,cv.height);ctx.lineWidth=8;ctx.strokeStyle=track.course.type==='boat'?'#1676c7':'#66775955';ctx.lineJoin='round';ctx.beginPath();track.nodes.forEach((p,i)=>{i?ctx.lineTo(cx+p.x*sx,cz+p.z*sz):ctx.moveTo(cx+p.x*sx,cz+p.z*sz)});ctx.closePath();ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#e9efd9';ctx.stroke();let p=track.nodes[0];ctx.fillStyle='#203b2b';ctx.fillRect(cx+p.x*sx-3,cz+p.z*sz-3,6,6);drawBoostMarkers(ctx,(x,z)=>[cx+x*sx,cz+z*sz],race);for(let c of [...race.cars].reverse()){ctx.beginPath();ctx.arc(cx+c.x*sx,cz+c.z*sz,c.id===0?5:3.8,0,Math.PI*2);ctx.fillStyle=c.color;ctx.fill();ctx.strokeStyle='#fff9e6';ctx.lineWidth=c.id===0?2:1;ctx.stroke();}}
function spawnParticle(c,type,surface){
 if(particles.length>=90)return;const isWater=COURSES[selected].type==='boat',dirt=type==='dirt',side=Math.random()<.5?-1:1;
 const color=type==='boost'?0xdfff85:dirt?(Math.random()<.5?0x80512e:0xb38a55):isWater?0xd6fff8:0xa79678;
 const x=c.x-Math.sin(c.heading)*1.1+(dirt?Math.cos(c.heading)*side*.84:0),z=c.z-Math.cos(c.heading)*1.1-(dirt?Math.sin(c.heading)*side*.84:0);
 const m=sphere(type==='boost'?.12:dirt?.07+Math.random()*.12:.12+Math.random()*.11,new THREE.MeshBasicMaterial({color,transparent:true,opacity:dirt?.8:.55,depthWrite:false}),x,dirt?surface.y+.12:c.y+.35,z);m.castShadow=false;
 particles.push({mesh:m,life:0,max:dirt?.35+Math.random()*.35:.5+Math.random()*.4,vx:-c.vx*.15+(Math.random()-.5)*(dirt?4:1),vz:-c.vz*.15+(Math.random()-.5)*(dirt?4:1),vy:dirt?1.5+Math.random()*1.7:isWater?.6:1.1,gravity:dirt?8:0,opacity:dirt?.8:.5,growth:dirt?.5:2});
}
function updateVisuals(dt,t){
 if(mode==='race'&&!race.paused&&race.countdown<=0)tyreMarks?.update(race.cars,race.time);
 boostWorld?.update(race,t,mode!=='menu'&&perspectiveView()?chaseCamera:camera);
 for(let i=0;i<race.cars.length;i++){let c=race.cars[i],g=carModels[i];g.position.set(c.x,c.y+.04,c.z);g.rotation.y=c.heading;let p=track.nodes[c.index],pitch=c.airborne?clamp(-c.vy*.035,-.3,.3):clamp(p.slope,-.45,.45);g.rotation.x=0;g.rotation.z=0;g.rotateX(-pitch);if(COURSES[selected].type==='boat')g.position.y+=Math.sin(t*5+i)*.045;g.visible=c.flash<=0||Math.floor(t*12)%3!==0;if(g.userData.playerTag)g.userData.playerTag.visible=mode==='menu'||(!lowClutter&&cameraMode!=='chase');for(const wheel of g.userData.wheels)wheel.rotation.x+=c.speed*dt*2.7;
  updateBrakeLights(g,c.braking&&mode!=='menu');visualStyle.animate(c,g,dt,t,mode==='race'&&!race.paused&&race.countdown<=0);c.hitboxScaleX=g.scale.x;c.hitboxScaleZ=g.scale.z;
  if(mode==='race'&&!race.paused&&race.countdown<=0){if(c.boosting&&Math.random()<.7)spawnParticle(c,'boost');const surface=tyreSurface(track,c);if(surface?.soil&&Math.abs(c.speed)>2&&c.flash<1.6&&c.finish===null&&Math.random()<1-Math.exp(-Math.min(35,Math.abs(c.speed)*1.8)*dt))spawnParticle(c,'dirt',surface);else if(!c.airborne&&(c.drifting||COURSES[selected].type==='boat')&&Math.abs(c.speed)>4&&Math.random()<.25)spawnParticle(c,'dust');}
 }
 for(let a of animated){if(a.type==='fan'){a.g.rotation.z+=dt*14;}else if(a.type==='current'){a.g.position.x=((t*a.speed+a.phase*a.width)%a.width)-a.width/2;}else if(a.type==='water'){if(a.mat.userData.waterShader)a.mat.userData.waterShader.uniforms.waterTime.value=t;}else if(a.type==='foam'){a.g.position.y=Math.sin(t*1.4)*.025;}else if(a.type==='float'){a.g.position.y=a.y+Math.sin(t*1.4+a.phase)*.12;a.g.rotation.z=Math.sin(t+a.phase)*.028;}else if(a.type==='bug'){a.g.position.x=a.x+Math.sin(t*.3+a.phase)*.25;a.g.rotation.y+=dt*.06;}else if(a.type==='ripple'){let s=1+(t*.3+a.phase)%1;a.g.scale.set(s,s,s);}}
 for(let i=particles.length-1;i>=0;i--){if(mode!=='race'||race.paused)continue;let p=particles[i];p.life+=dt;p.vy-=p.gravity*dt;if(p.life>p.max){world.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);continue}p.mesh.position.x+=p.vx*dt;p.mesh.position.z+=p.vz*dt;p.mesh.position.y+=p.vy*dt;p.mesh.material.opacity=p.opacity*(1-p.life/p.max);p.mesh.scale.setScalar(1+p.life*p.growth);}
 if(engineGain){engineGain.gain.setTargetAtTime(soundEnabled&&mode==='race'&&!race.paused&&race.countdown<=0?.018:0,audioCtx.currentTime,.1);engineOsc.frequency.setTargetAtTime(42+Math.abs(race.cars[0].speed)*6+(race.cars[0].boosting?35:0),audioCtx.currentTime,.08);}
}
function selectEngine(value){if(mode!=='menu')return;selectedEngine=engineClass(value);$('engine-class').value=selectedEngine;try{localStorage.setItem('pocket-rally-engine-class',selectedEngine)}catch{}setupCourse(selected);}
function selectDifficulty(value){if(mode!=='menu')return;cpuDifficulty=['easy','medium','hard'].includes(value)?value:'medium';$('cpu-difficulty').value=cpuDifficulty;try{localStorage.setItem('pocket-rally-cpu',cpuDifficulty)}catch{}setupCourse(selected);}
function raceCameraHeight(){return cameraMode==='close'?(innerWidth<650?30:23):(innerWidth<650?48:40);}
function selectCamera(value){cameraMode=CAMERA_MODES.includes(value)?value:'close';$('camera-mode').value=cameraMode;try{localStorage.setItem('pocket-rally-camera',cameraMode)}catch{}}
function updateChaseCamera(){
 const car=race.cars[0],forwardX=Math.sin(car.heading),forwardZ=Math.cos(car.heading);
 if(cameraMode!=='chase'){
  const model=carModels[0],height=cameraMode==='nose'?.5:cameraMode==='roof'?1.65:1.12,front=cameraMode==='nose'?1.8:cameraMode==='roof'?0:.12;
  chaseCamera.near=.04;
  chaseCamera.position.copy(new THREE.Vector3(0,height,front).applyQuaternion(model.quaternion)).add(model.position);
  chaseTarget.copy(new THREE.Vector3(0,height,front+20).applyQuaternion(model.quaternion)).add(model.position);
  chaseCamera.up.set(0,1,0);chaseCamera.lookAt(chaseTarget);chaseCamera.updateProjectionMatrix();return;
 }
 chaseCamera.near=.15;chaseCamera.updateProjectionMatrix();
 // A fixed offset in the vehicle's heading keeps the view behind the car, including drifts and jumps.
 chaseCamera.position.set(car.x-forwardX*8,car.y+4.3,car.z-forwardZ*8);
 if(track.terrainHeight)chaseCamera.position.y=Math.max(chaseCamera.position.y,track.terrainHeight(chaseCamera.position.x,chaseCamera.position.z)+3);
 chaseTarget.set(car.x+forwardX*3.7,car.y+.85,car.z+forwardZ*3.7);
 chaseCamera.lookAt(chaseTarget);
}
function cycleCamera(){selectCamera(CAMERA_MODES[(CAMERA_MODES.indexOf(cameraMode)+1)%CAMERA_MODES.length]);}
function resize(){let w=innerWidth,h=innerHeight;renderer.setSize(w,h);chaseCamera.aspect=w/h;chaseCamera.fov=w<650?70:62;chaseCamera.updateProjectionMatrix();const aspect=w/h,height=mode==='menu'?(w<540?89:78):raceCameraHeight();camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();}

const controller=new GamepadInput();let controllerStatus='';
function controllerMenu(actions){
 if(!Object.values(actions).some(Boolean))return;
 const dialog=document.querySelector('dialog[open]'),root=dialog||$('menu');
 if(actions.back){if(dialog?.id==='options-dialog')closeOptions();else if(dialog?.id==='carpet-map')closeMap();else if(dialog?.id==='pause-dialog')togglePause(false);else if(dialog?.id==='results')backToMenu();return;}
 const items=[...root.querySelectorAll('button,select,input')].filter(el=>!el.disabled&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
 if(!items.length)return;let index=items.indexOf(document.activeElement),current=items[index];
 if((actions.left||actions.right)&&current?.tagName==='SELECT'){current.selectedIndex=wrap(current.selectedIndex+(actions.right?1:-1),current.options.length);current.dispatchEvent(new Event('change',{bubbles:true}));return;}
 if(actions.up||actions.down||actions.left||actions.right){index=wrap(index+(actions.up||actions.left?-1:1),items.length);items[index].focus();items[index].scrollIntoView({block:'nearest'});}
 if(actions.confirm){current=items[index<0?0:index];if(current.tagName==='SELECT'){current.selectedIndex=(current.selectedIndex+1)%current.options.length;current.dispatchEvent(new Event('change',{bubbles:true}));}else current.click();}
}
function pollController(t){
 let pads=[];try{pads=navigator.getGamepads?.()||[]}catch{}
 const pad=controller.poll(pads,t),status=pad.connected?'Controller connected · ready':Array.from(pads).some(Boolean)?'Controller needs a standard browser mapping. Try another browser or controller mode.':'Connect a controller and press a button to wake it.';
 if(status!==controllerStatus){controllerStatus=status;$('controller-status').textContent=status;}
 if(pad.disconnected){document.body.classList.remove('controller-active');if(mode==='race'&&!race.paused)togglePause(true);}
 if(document.hidden||!document.hasFocus()){controller.block();return {};}
 if(pad.active)document.body.classList.add('controller-active');
 const a=pad.actions;if(document.querySelector('dialog[open]')||mode==='menu'||mode==='results'){if(a.map&&$('carpet-map').open)closeMap();else if(a.pause&&$('pause-dialog').open)togglePause(false);else controllerMenu(a);}
 else if(mode==='race'){if(a.pause)togglePause();else if(a.map&&isCollection())openMap();else{if(a.camera)cycleCamera();if(a.recover&&!race.paused){race.recover(race.cars[0]);notify('BACK ON TRACK');}}}
 return controller.blocked?{}:pad.input;
}
function frame(ms){requestAnimationFrame(frame);let t=ms/1000,dt=Math.min(.05,lastTime?t-lastTime:.016);lastTime=t;if(!race)return;const pad=pollController(t);
 if(mode==='race'&&!race.paused){accumulator+=dt;while(accumulator>=1/90){race.step(1/90,{forward:Math.max(Number(!!(keys.KeyW||keys.ArrowUp||touchControls.keys.KeyW)),pad.forward||0),reverse:Math.max(Number(!!(keys.KeyS||keys.ArrowDown||touchControls.keys.KeyS)),pad.reverse||0),left:Math.max(Number(!!(keys.KeyA||keys.ArrowLeft||touchControls.keys.KeyA)),pad.left||0),right:Math.max(Number(!!(keys.KeyD||keys.ArrowRight||touchControls.keys.KeyD)),pad.right||0),brake:keys.Space||touchControls.keys.Space||pad.brake,boost:keys.ShiftLeft||keys.ShiftRight||touchControls.keys.ShiftLeft||pad.boost});accumulator-=1/90;}
 let countdown=Math.ceil(race.countdown);if(countdown<lastBeep&&countdown>=0){lastBeep=countdown;beep(countdown===0?880:440,countdown===0?.25:.1)}
 let message=race.countdown>.05?String(Math.min(3,Math.ceil(race.countdown))):race.time<.65?'GO!':t<messageUntil?shownMessage:!lowClutter&&race.cars[0].airborne&&race.cars[0].y>1.5?'AIR TIME!':'';$('race-message').textContent=message;$('race-message').classList.toggle('small',message.length>3);
 if(race.cars[0].flash>1.6)notify('BACK ON TRACK',1);if(Math.floor(ms/90)!==Math.floor((ms-dt*1000)/90))updateHUD();if((isCollection()?race.winner!==null:race.cars[0].finish!==null)&&!lastFinish)finish();
 }
 updateVisuals(dt,t);
 if(mode==='menu'){
  let w=innerWidth,h=innerHeight,aspect=w/h;const scale=track.course.mapScale||1;const target=w<(track.course.realWorld?700:540)?new THREE.Vector3(0,0,0):new THREE.Vector3(-13*scale,0,8*scale);viewTarget.lerp(target,1-Math.exp(-dt*4));let height=track.course.realWorld?Math.max(track.course.overviewHeight||390,(track.course.overviewWidth||300)/aspect):(w<540?108:Math.max(95,144/aspect))*scale;camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.position.copy(viewTarget).add(offset.clone().multiplyScalar(1.45*scale));if(track.course.realWorld){viewTarget.y=12;camera.position.copy(viewTarget).add(new THREE.Vector3(0,240,270));camera.lookAt(viewTarget);}else camera.lookAt(viewTarget);
  if(w<(track.course.realWorld?700:540))camera.setViewOffset(w,h,0,h*.21,w,h);else camera.clearViewOffset();
 }else if(perspectiveView()){camera.clearViewOffset();updateChaseCamera();viewTarget.set(race.cars[0].x,Math.max(0,race.cars[0].y*(track.course.realWorld?1:.7)),race.cars[0].z);
 }else{camera.clearViewOffset();let c=race.cars[0];const lead=cameraMode==='close'?.14:.35;temp.set(c.x+c.vx*lead,Math.max(0,c.y*(track.course.realWorld?1:.7)),c.z+c.vz*lead);viewTarget.lerp(temp,1-Math.exp(-dt*(cameraMode==='close'?7.5:4.3)));camera.position.copy(viewTarget).add(offset);camera.lookAt(viewTarget);cameraHeight+=(raceCameraHeight()-cameraHeight)*(1-Math.exp(-dt*6));let height=cameraHeight,aspect=innerWidth/innerHeight;camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;}
 if(track.course.mapScale){const overview=mode==='menu',c=race.cars[0],x=overview?0:c.x,z=overview?0:c.z,r=overview?(track.course.realWorld?220:160):46;const ground=track.course.realWorld?(overview?15:c.y):0;sun.position.set(x-28,ground+(overview?260:65),z+28);sun.target.position.set(x,ground,z);sun.shadow.camera.left=-r;sun.shadow.camera.right=r;sun.shadow.camera.top=r;sun.shadow.camera.bottom=-r;sun.shadow.camera.far=overview?450:140;sun.shadow.camera.updateProjectionMatrix();scene.fog.near=overview?450:115;scene.fog.far=overview?950:210;}camera.updateProjectionMatrix();const activeCamera=mode!=='menu'&&perspectiveView()?chaseCamera:camera;grandScenery?.update(activeCamera,race.cars[0],dt,mode!=='menu');carpetWorld?.update(race,t,activeCamera);courseLights?.update(race.cars,activeCamera,t);visualStyle.update();
 const interior=mode!=='menu'&&cameraMode==='cockpit',player=carModels[0],visible=player.visible;
 if(interior)player.visible=false;
 if(mode!=='menu'&&perspectiveView()&&player.userData.playerTag)player.userData.playerTag.visible=false;
 renderer.render(scene,activeCamera);player.visible=visible;
 if(interior){const steer=Math.max(Number(!!(keys.KeyA||keys.ArrowLeft||touchControls.keys.KeyA)),pad.left||0)-Math.max(Number(!!(keys.KeyD||keys.ArrowRight||touchControls.keys.KeyD)),pad.right||0);cockpit.update(race.cars[0].speed,steer,race.paused?0:dt,innerWidth/innerHeight);cockpit.render(renderer);}
}
function configureRaceUI(){
 document.body.classList.toggle('sandown-mode',track.course.id==='sandown');
 document.body.classList.toggle('albert-park-mode',track.course.id==='albert-park');
 document.querySelector('.touch-help').innerHTML=track.course.realWorld?'Hold GAS to drive · BRAKE before corners · ease off BOOST to turn<br>Landscape gives you more room to race.':'Hold GAS to drive · steer with LEFT / RIGHT · hold BOOST for speed<br>Landscape gives you more room to race.';
 document.body.classList.toggle('manual-boost-off',!boostOptions.manual);
 $('boost-help').textContent='Manual boost: '+(boostOptions.manual?'on':'off')+' · Ground boost: '+(boostOptions.ground?'on':'off');
 const collect=isCollection();document.body.classList.toggle('collection-mode',collect);
 document.body.classList.toggle('real-world-mode',!!track.course.realWorld);$('minimap').width=collect?207:track.course.realWorld?180:240;$('minimap').height=collect?299:track.course.realWorld?266:165;if(track.course.minimapSize){[$('minimap').width,$('minimap').height]=track.course.minimapSize;}document.body.classList.toggle('oran-park-mode',track.course.id==='oran-park');
 if(collect){$('carpet-map-canvas').width=621;$('carpet-map-canvas').height=897;}
 $('position-label').textContent=collect?'BLOCKS':'POSITION';$('position-total').textContent=collect?'/ '+track.pickups.length:'/ 4';
 setVisible('lap-stat',!collect);setVisible('standings',true);setVisible('collection-guide',collect);setVisible('show-map',collect);
 $('cpu-difficulty').previousElementSibling.innerHTML='CPU difficulty<small>'+ (collect?'Rival pace and traffic level':'How hard your rivals push')+'</small>';$('cpu-difficulty').setAttribute('aria-label','CPU difficulty');
 $('cpu-difficulty').title=collect?'Choose rival difficulty and traffic level before starting':'Choose CPU difficulty before starting a race';
 $('race-format').textContent=collect?track.pickups.length+' BLOCKS EACH':'3 LAPS';$('race-opponents').textContent='3 CPU RIVALS';
 document.querySelector('.intro').innerHTML=collect?'Collect every block before your three rivals.<br>Everyone has their own set. Each block counts once.':track.course.realWorld?'Famous circuits. More realistic handling.<br>Brake before corners. Build speed on the way out.':'Ordinary places. Extraordinary races.<br>Three rivals. No room for hesitation.';
 $('start').innerHTML=collect?'START COLLECTING <span>↗</span>':'LET’S RACE <span>↗</span>';
 $('pause-dialog').querySelector('p').textContent='Your rivals can wait.';
 $('minimap').setAttribute('aria-label',collect?'Carpet road map with your remaining blocks, rival racers and traffic':'Course minimap');
}
function updateCollectionHUD(){
 const me=race.cars[0],target=race.nearestPickup();$('position').textContent=race.collected.size;$('timer').textContent=formatTime(race.time);$('speed').textContent=Math.round(Math.abs(me.speed)*5.1);updateBoostHUD(me);$('hazard-status').textContent=me.hazard||'';
 $('nearest-block').textContent=target?`${target.id+1}. ${target.name}`:'All blocks collected!';
 $('standings').innerHTML=race.ranking().map((c,i)=>`<li class="${c.id===0?'you':''}"><span class="car-dot" style="background:${c.color}"></span>${c.name}<strong>${c.collected.size}/${track.pickups.length}${c.finish!==null?' ✓':''}</strong></li>`).join('');
 if(race.collected.size>lastCollected){lastCollected=race.collected.size;notify(`${lastCollected} / ${track.pickups.length} BLOCKS`,1.2);beep(700+lastCollected*25,.12)}drawMinimap();
}
function updateBoostHUD(me){
 $('boost-fill').style.width=me.boost*100+'%';$('boost-label').textContent=me.boostLocked?'REFILL NEEDED':'BOOST';$('boost-fill').parentElement.classList.toggle('locked',!!me.boostLocked);
 if((me.boostRefills||0)>lastBoostRefills){lastBoostRefills=me.boostRefills;notify(me.lastBoostSource==='lap'?'LAP COMPLETE · BOOST FULL':'BOOST REFILLED',1.4);beep(1050,.13)}
}
function finishCollection(me,best){
 const winner=race.racers.find(c=>c.id===race.winner),won=winner.id===0;
 $('result-eyebrow').textContent=won?'WINNER’S CIRCLE':'RACE COMPLETE';$('result-title').textContent=won?'Every block. First place.':winner.name+' collected them all!';
 $('result-time').textContent=`${formatTime(winner.finish)} · ${race.difficulty.toUpperCase()} · First to collect all ${track.pickups.length}${won&&(!best||me.finish<best)?' · New personal best':''}`;
 $('result-standings').innerHTML=race.ranking().map((c,i)=>`<li>${i+1}<span class="car-dot" style="background:${c.color}"></span><strong>${c.name}</strong><span>${c.collected.size}/${track.pickups.length} · ${c.finish!==null?formatTime(c.finish):'Unfinished'}</span></li>`).join('');
 $('race-message').textContent='';$('results').showModal();updateCollectionHUD();beep(won?880:550,.3);
}
function openMap(){
 if(!isCollection()||$('results').open||$('pause-dialog').open)return;mapWasRunning=mode==='race'&&!race.paused;if(mode==='race')race.paused=true;clearKeys();
 drawCarpetMap($('carpet-map-canvas'),track,race,true);$('map-status').textContent=mode==='race'?`Race paused · ${race.collected.size} / ${track.pickups.length} blocks · ${formatTime(race.time)}`:'Plan your route before starting. The timer begins after the countdown.';$('carpet-map').showModal();
}
function closeMap(resume=true){if(!$('carpet-map').open)return;$('carpet-map').close();clearKeys();if(resume&&mapWasRunning&&mode==='race')race.paused=false;mapWasRunning=false;}
$('show-map').onclick=openMap;$('close-map').onclick=()=>closeMap();$('carpet-map').addEventListener('cancel',e=>{e.preventDefault();closeMap()});
document.querySelectorAll('[data-course]').forEach(b=>b.addEventListener('click',()=>setupCourse(Number(b.dataset.course))));$('start').onclick=startRace;$('pause').onclick=()=>togglePause();$('resume').onclick=()=>togglePause(false);$('restart').onclick=startRace;$('again').onclick=startRace;$('quit').onclick=backToMenu;$('choose').onclick=backToMenu;$('next').onclick=()=>{backToMenu();setupCourse((selected+1)%COURSES.length)};
function openOptions(){for(const id of ['manual-boost','ground-boost'])$(id).disabled=mode!=='menu';optionsFromPause=mode==='race';if(optionsFromPause){race.paused=true;$('pause-dialog').close();}clearKeys();$('race-options-note').textContent=optionsFromPause?'Race settings are locked until you choose another course.':'Choose before starting. Your preferences are saved.';$('options-dialog').showModal();}
function closeOptions(){$('options-dialog').close();if(optionsFromPause)$('pause-dialog').showModal();else $('open-options').focus();}
$('open-options').onclick=openOptions;$('pause-options').onclick=openOptions;$('close-options').onclick=closeOptions;$('done-options').onclick=closeOptions;$('options-dialog').addEventListener('cancel',e=>{e.preventDefault();closeOptions()});
$('sound-enabled').onchange=e=>{soundEnabled=e.target.checked;if(soundEnabled)initAudio();e.target.checked=soundEnabled;try{localStorage.setItem('pocket-rally-sound',String(soundEnabled))}catch{}if(soundEnabled)beep(600)};
try{soundEnabled=localStorage.getItem('pocket-rally-sound')==='true'}catch{}$('sound-enabled').checked=soundEnabled;
$('pause-dialog').addEventListener('cancel',e=>{e.preventDefault();togglePause(false)});$('results').addEventListener('cancel',e=>{e.preventDefault();backToMenu()});
window.addEventListener('keydown',e=>{if($('options-dialog').open||['SELECT','INPUT'].includes(e.target?.tagName)||e.target?.tagName==='BUTTON'&&(mode!=='race'||race.paused))return;if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){if(mode==='race'&&!race.paused){e.preventDefault();keys[e.code]=true;}}if(e.code==='Escape'&&!e.repeat&&!$('pause-dialog').open&&!$('results').open)togglePause();if(e.code==='KeyM'&&!e.repeat&&isCollection()){e.preventDefault();$('carpet-map').open?closeMap():openMap();}if(e.code==='KeyC'&&!e.repeat&&e.target?.tagName!=='SELECT'){cycleCamera();}if(e.code==='KeyR'&&mode==='race'&&!race.paused&&!e.repeat){race.recover(race.cars[0]);notify('BACK ON TRACK')}if(e.code==='Enter'&&mode==='menu')startRace();});window.addEventListener('keyup',e=>{keys[e.code]=false});window.addEventListener('blur',()=>{clearKeys();if(mode==='race')togglePause(true)});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='race')togglePause(true)});window.addEventListener('resize',resize);
const touchControls=bindTouchControls($('touch'),()=>mode==='race'&&!race.paused);
window.addEventListener('pointerdown',()=>document.body.classList.remove('controller-active'),{passive:true});
window.addEventListener('keydown',()=>document.body.classList.remove('controller-active'));
// Block browser long-press UI anywhere on the active race surface.
for(const type of ['contextmenu','selectstart','dragstart']){
 $('game').addEventListener(type,e=>{if(document.body.classList.contains('touch-enabled')&&mode==='race')e.preventDefault()});
}
const touchMedia=matchMedia('(any-pointer: coarse)');
function updateTouchMode(){document.body.classList.toggle('touch-enabled',touchMedia.matches||navigator.maxTouchPoints>0)}
updateTouchMode();touchMedia.addEventListener('change',updateTouchMode);
window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')document.body.classList.add('touch-enabled')},{passive:true});
$('recover').onclick=()=>{if(mode==='race'&&!race.paused){clearKeys();race.recover(race.cars[0]);notify('BACK ON TRACK')}};
window.addEventListener('resize',()=>{clearKeys();if(mode==='race'&&!race.paused)togglePause(true)});
$('camera-mode').addEventListener('change',e=>selectCamera(e.target.value));try{selectCamera(localStorage.getItem('pocket-rally-camera')||'close')}catch{selectCamera('close')}
function selectLowClutter(enabled){
 lowClutter=!!enabled;document.body.classList.toggle('low-clutter',lowClutter);
 document.querySelectorAll('[data-low-clutter]').forEach(input=>{input.checked=lowClutter});
 if(lowClutter){shownMessage='';messageUntil=0;}
 try{localStorage.setItem('pocket-rally-low-clutter',String(lowClutter))}catch{}
}
document.querySelectorAll('[data-low-clutter]').forEach(input=>input.addEventListener('change',e=>selectLowClutter(e.target.checked)));
try{selectLowClutter(localStorage.getItem('pocket-rally-low-clutter')==='true')}catch{selectLowClutter(false)}
function selectVisualStyle(value){visualStyle.set(value);$('visual-style').value=visualStyle.mode;document.body.dataset.visualStyle=visualStyle.mode;try{localStorage.setItem('pocket-rally-visual-style',visualStyle.mode)}catch{}}
$('visual-style').addEventListener('change',e=>selectVisualStyle(e.target.value));try{selectVisualStyle(localStorage.getItem('pocket-rally-visual-style')||'polished')}catch{selectVisualStyle('polished')}
for(const key of ['manual','ground']){const input=$(key+'-boost');try{boostOptions[key]=localStorage.getItem('pocket-rally-'+key+'-boost')!=='false'}catch{}input.checked=boostOptions[key];input.addEventListener('change',()=>{if(mode!=='menu')return;boostOptions[key]=input.checked;try{localStorage.setItem('pocket-rally-'+key+'-boost',String(input.checked))}catch{}setupCourse(selected);});}
try{selectedEngine=engineClass(localStorage.getItem('pocket-rally-engine-class'));}catch{}$('engine-class').value=selectedEngine;$('engine-class').addEventListener('change',e=>selectEngine(e.target.value));
try{const saved=localStorage.getItem('pocket-rally-cpu');if(['easy','medium','hard'].includes(saved))cpuDifficulty=saved;}catch{}$('cpu-difficulty').value=cpuDifficulty;$('cpu-difficulty').addEventListener('change',e=>selectDifficulty(e.target.value));
try{selectedBarriers=barrierMode(localStorage.getItem('pocket-rally-barriers'))}catch{}$('barrier-mode').value=selectedBarriers;$('barrier-mode').addEventListener('change',e=>{if(mode!=='menu')return;selectedBarriers=barrierMode(e.target.value);try{localStorage.setItem('pocket-rally-barriers',selectedBarriers)}catch{}setupCourse(selected);});
document.querySelectorAll('[data-group]').forEach(b=>b.addEventListener('click',()=>{const group=Number(b.dataset.group);setupCourse(courseGroup(selected)===group?selected:COURSES.findIndex((c,i)=>courseGroup(i)===group))}));setupCourse(8);requestAnimationFrame(frame);
