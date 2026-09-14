const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
export function deadzone(value,zone=.16){const v=clamp(value,-1,1);return Math.abs(v)<=zone?0:Math.sign(v)*(Math.abs(v)-zone)/(1-zone);}
export function readPad(pad){
 const b=i=>clamp(pad?.buttons?.[i]?.value??(pad?.buttons?.[i]?.pressed?1:0),0,1),x=deadzone(pad?.axes?.[0]??0),y=deadzone(pad?.axes?.[1]??0);
 return {forward:deadzone(b(7),.05),reverse:deadzone(b(6),.05),left:Math.max(-x,b(14),0),right:Math.max(x,b(15),0),brake:b(1)>.5,boost:b(0)>.5,
 actions:{confirm:b(0)>.5,back:b(1)>.5,recover:b(3)>.5,camera:b(4)>.5,map:b(8)>.5,pause:b(9)>.5,up:b(12)>.5||y<-.55,down:b(13)>.5||y>.55,left:b(14)>.5||x<-.55,right:b(15)>.5||x>.55}};
}
export class GamepadInput{
 constructor(){this.index=null;this.previous={};this.blocked=true;this.nextRepeat=0;}
 block(){this.blocked=true;}
 poll(pads,time){
  const list=Array.from(pads||[]).filter(p=>p?.connected!==false&&p?.mapping==='standard');
  const pad=list.find(p=>p.index===this.index)||list[0],disconnected=this.index!==null&&!list.some(p=>p.index===this.index);
  if(!pad){this.index=null;this.previous={};this.blocked=true;return {connected:false,disconnected,actions:{},input:{}};}
  const fresh=pad.index!==this.index;
  if(fresh){this.index=pad.index;this.previous={};this.blocked=true;}
  const state=readPad(pad),actions={};
  const active=state.forward||state.reverse||state.left||state.right||Object.values(state.actions).some(Boolean);
  if(!active)this.blocked=false;
  for(const [key,held] of Object.entries(state.actions)){
   const navigation=['up','down','left','right'].includes(key);
   actions[key]=!fresh&&held&&(!this.previous[key]||navigation&&time>=this.nextRepeat);
   if(actions[key]&&navigation)this.nextRepeat=time+(this.previous[key]?.16:.4);
  }
  this.previous=state.actions;
  return {connected:true,disconnected,active:!!active,actions,input:this.blocked?{}:state};
 }
}
