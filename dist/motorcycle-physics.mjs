const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function driveMotorcycle(c,{throttle,steer,brake,onRoad,p,track},dt){
 const engine=c.engineScale||1,speed=Math.hypot(c.vx,c.vz),fx=Math.sin(c.heading),fz=Math.cos(c.heading),forward=c.vx*fx+c.vz*fz,lateral=c.vx*fz-c.vz*fx;
 const grip=onRoad?27:8.2,opposing=throttle*forward<-.25,target=(c.boosting?29:20)*(c.catchup||1)*engine;
 let drive=(opposing?throttle*23:throttle*12)*engine;
 if(!opposing&&throttle>0){drive*=clamp((target-forward)/(5*engine),0,1);if(c.boosting)drive+=12*engine*clamp((target-forward)/(5*engine),0,1);}
 if(!opposing&&throttle<0)drive*=clamp((6*engine+forward)/(3*engine),0,1)*.6;
 if(brake)drive-=Math.sign(forward)*17*engine;
 drive=clamp(drive,-grip*.9*engine,grip*.9*engine);
 const budget=Math.sqrt(Math.max(0,grip**2-(drive/engine)**2))*engine*(brake?.8:1);
 const requestedYaw=(speed/engine)/2.65*Math.tan(steer*.48/(1+(speed/engine)*.025));
 const maxLean=Math.min(1.02,Math.atan(budget/(9.8*engine)));
 const wanted=clamp(Math.atan(requestedYaw*speed/(9.8*engine)),-maxLean,maxLean)*clamp(speed/3,0,1);
 // Lean is the steering state: finite roll response drives yaw through tan(lean).
 const rollTarget=c.airborne?0:wanted;c.lean=(c.lean||0)+clamp((rollTarget-(c.lean||0))*7,-2.8,2.8)*dt;
 if(c.airborne){c.vx*=Math.exp(-dt*.025);c.vz*=Math.exp(-dt*.025);c.drifting=false;return;}
 const yaw=9.8*engine*Math.tan(c.lean)/Math.max(speed,3)*Math.sign(forward||1);
 c.yawRate=clamp(yaw,-budget/Math.max(speed,3),budget/Math.max(speed,3));c.heading+=c.yawRate*dt;
 const force=clamp(-lateral*(onRoad?15:7),-budget,budget);c.vx+=(fx*drive+fz*force)*dt;c.vz+=(fz*drive-fx*force)*dt;
 let gx=p.tx*p.slope,gz=p.tz*p.slope;if(!onRoad&&track.terrainHeight){const h=track.terrainHeight;gx=h(c.x+.5,c.z)-h(c.x-.5,c.z);gz=h(c.x,c.z+.5)-h(c.x,c.z-.5);}
 c.vx-=gx*9.8*dt;c.vz-=gz*9.8*dt;const damping=Math.exp(-dt*(.10+(speed/engine)*.010+(onRoad?0:(track.course.offroadDrag??3)*.22)));c.vx*=damping;c.vz*=damping;
 if(brake&&Math.hypot(c.vx,c.vz)<.3){c.vx=0;c.vz=0;c.yawRate=0;}
 c.speed=c.vx*Math.sin(c.heading)+c.vz*Math.cos(c.heading);c.drifting=speed>5&&Math.abs(lateral)>2.2;
}
