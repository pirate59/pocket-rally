// A lightweight tyre model in the game's scaled world units. Both human and
// computer drivers share the same force budget; boost never increases grip.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const REAL_GRIP=27;
export function driveRealCar(c,{throttle,steer,brake,onRoad,p,track},dt){
 const engine=c.engineScale||1,speed=Math.hypot(c.vx,c.vz),fx=Math.sin(c.heading),fz=Math.cos(c.heading);
 const forward=c.vx*fx+c.vz*fz,lateral=c.vx*fz-c.vz*fx;
 c.steerAngle=(c.steerAngle||0)+(steer*.48/(1+(speed/engine)*.025)-(c.steerAngle||0))*(1-Math.exp(-dt*(steer?7:12)));
 // Airborne tyres cannot accelerate, brake or steer the car.
 if(c.airborne){c.vx*=Math.exp(-dt*.025);c.vz*=Math.exp(-dt*.025);c.drifting=false;return;}
 const grip=onRoad?REAL_GRIP:8.2,handbrake=brake&&speed>2;
 const opposing=throttle*forward<-.25;
 let drive=(opposing?throttle*23:throttle*12)*engine;
 const catchup=c.catchup||1,target=(c.boosting?29:20)*catchup*engine;
 if(!opposing&&throttle>0){drive*=catchup*clamp((target-forward)/(5*engine),0,1);if(c.boosting)drive+=12*engine*clamp((target-forward)/(5*engine),0,1);}
 if(!opposing&&throttle<0)drive*=clamp((6*engine+forward)/(3*engine),0,1)*.6;
 if(handbrake)drive-=Math.sign(forward)*17*engine;
 drive=clamp(drive,-grip*.9*engine,grip*.9*engine);
 // Braking and acceleration consume some of the same grip used for cornering.
 // Scale tyre forces with class speed so turning responds like Commercial.
 // Boost adds no grip, and braking still uses some of the cornering budget.
 const lateralBudget=Math.sqrt(Math.max(0,grip*grip-(drive/engine)**2))*engine*(handbrake?.42:1);
 const sideForce=clamp(-lateral*(handbrake?2.3:onRoad?14:7),-lateralBudget,lateralBudget);
 const mechanicalYaw=(forward/engine)/2.65*Math.tan(c.steerAngle)*(handbrake?1.35:1);
 // Match normal rotation to the grip actually available, so steering does not
 // keep rotating the body faster than the tyres can turn its momentum.
 const yawLimit=(handbrake?grip*engine*1.35:lateralBudget*.92)/Math.max(4*engine,speed);
 const yawTarget=clamp(mechanicalYaw,-yawLimit,yawLimit);
 c.yawRate=(c.yawRate||0)+(yawTarget-(c.yawRate||0))*(1-Math.exp(-dt*(handbrake?5:12)));
 c.heading+=c.yawRate*dt;
 c.vx+=(fx*drive+fz*sideForce)*dt;c.vz+=(fz*drive-fx*sideForce)*dt;
 // Gravity follows the slope in world space, including when facing backwards.
 let gx=p.tx*p.slope,gz=p.tz*p.slope;
 if(!onRoad&&track.terrainHeight){const h=track.terrainHeight;gx=(h(c.x+.5,c.z)-h(c.x-.5,c.z));gz=(h(c.x,c.z+.5)-h(c.x,c.z-.5));}
 c.vx-=gx*9.8*dt;c.vz-=gz*9.8*dt;
 const drag=.10+(speed/engine)*.010+(onRoad?0:(track.course.offroadDrag??3)*.22);
 const damping=Math.exp(-drag*dt);c.vx*=damping;c.vz*=damping;
 // Hold the brakes at walking pace without alternating between forward/reverse.
 if(brake&&Math.hypot(c.vx,c.vz)<.3){c.vx=0;c.vz=0;c.yawRate=0;}
 c.speed=c.vx*Math.sin(c.heading)+c.vz*Math.cos(c.heading);
 c.drifting=speed>5&&(handbrake||Math.abs(lateral)>2.2);
}
