// Camera poses for the seal, shared by the WebGL scene and the 2D still so both frame the seal the same way.
// dist: camera distance (seal radius 1); elev, az: degrees; sx, sy: where the seal's centre sits on screen, in
// normalised device units (-1 to 1); tx, ty, tz: the point looked at. Wide screens put the seal to the right of the
// text across the whole window; narrow screens pin it in a stage across the top half, with the text scrolling below.

export const FOV = 26;

export const POSES = {
  wide: {
    hero: { dist: 3.3, elev: 47, az: -17, sx: 0.47, sy: -0.12, tx: 0, ty: 0, tz: 0 },
    seal: { dist: 4.25, elev: 34, az: -9, sx: 0.36, sy: -0.12, tx: 0, ty: 0, tz: 0.25 },
    difference: { dist: 4.1, elev: 62, az: -3, sx: 0.45, sy: -0.02, tx: 0, ty: 0, tz: 0 },
    print: { dist: 2.4, elev: 82, az: 0, sx: 0.37, sy: 0.0, tx: 0, ty: 0, tz: 0 },
    evidence: { dist: 3.05, elev: 89.5, az: 0, sx: 0.36, sy: 0.02, tx: 0, ty: 0.05, tz: 0 },
  },
  narrow: {
    hero: { dist: 4.1, elev: 50, az: -14, sx: 0.12, sy: -0.12, tx: 0, ty: 0, tz: 0 },
    seal: { dist: 5.2, elev: 34, az: -8, sx: 0.0, sy: -0.2, tx: 0, ty: 0, tz: 0.25 },
    difference: { dist: 4.9, elev: 62, az: -3, sx: 0.0, sy: -0.02, tx: 0, ty: 0, tz: 0 },
    print: { dist: 3.6, elev: 82, az: 0, sx: 0.0, sy: 0.0, tx: 0, ty: 0, tz: 0 },
    evidence: { dist: 3.4, elev: 89.5, az: 0, sx: 0.0, sy: -0.06, tx: 0, ty: 0.05, tz: 0 },
  },
};

export const isNarrow = (width, height) => width / height < 0.95;

/** Where the 2D still draws the seal for a pose: centre and radius in CSS pixels, squash from the elevation. */
export function stillFrame(name, width, height) {
  const pose = POSES[isNarrow(width, height) ? "narrow" : "wide"][name] ?? POSES.wide.hero;
  const halfHeight = pose.dist * Math.tan(((FOV / 2) * Math.PI) / 180);
  // The 3D seal stands above the plate and recedes in perspective: its centre reads a little higher and its rim a
  // little smaller than a flat projection, so the still is set to match it and the cross-fade does not jump.
  return {
    cx: (0.5 + pose.sx * 0.5) * width - height * 0.02,
    cy: (0.5 - pose.sy * 0.5) * height - height * 0.06,
    radius: (height / 2 / halfHeight) * 0.86,
    squash: Math.sin((pose.elev * Math.PI) / 180),
    tilt: (pose.az * Math.PI) / 180,
  };
}
