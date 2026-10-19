import {Matrix4,Quaternion,Vector3} from "three";

export type CameraPose={position:Vector3;target:Vector3;up:Vector3};

// Rotate around the interpolated target. A straight position chord can cross
// the target, reverse the viewing direction and make lookAt jump at a pole.
export function cameraFlight(from:CameraPose,to:CameraPose){
  const rotation=(pose:CameraPose)=>new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(pose.position,pose.target,pose.up));
  const first=rotation(from),last=rotation(to);
  const near=from.position.distanceTo(from.target),far=to.position.distanceTo(to.target);
  return {
    duration:650+350*first.angleTo(last)/Math.PI,
    sample(progress:number):CameraPose{
      if(progress<=0)return {position:from.position.clone(),target:from.target.clone(),up:from.up.clone()};
      if(progress>=1)return {position:to.position.clone(),target:to.target.clone(),up:to.up.clone()};
      const t=progress*progress*(3-2*progress),q=first.clone().slerp(last,t);
      const target=from.target.clone().lerp(to.target,t);
      return {target,position:new Vector3(0,0,near+(far-near)*t).applyQuaternion(q).add(target),up:new Vector3(0,1,0).applyQuaternion(q)};
    },
  };
}
