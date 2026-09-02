// Read the current physical head centre directly from the XR frame.
// The renderer's ArrayCamera is a stereo culling camera, not the tracked head;
// getWorldPosition() on it can discard the locomotion rig's transform.
export function readHeadPose(frame, referenceSpace, rig, position, orientation) {
  const pose=frame?.getViewerPose(referenceSpace);
  if(!pose)return false;
  const p=pose.transform.position,q=pose.transform.orientation;
  position.set(p.x,p.y,p.z).applyMatrix4(rig.matrixWorld);
  orientation.set(q.x,q.y,q.z,q.w).premultiply(rig.quaternion);
  return true;
}
