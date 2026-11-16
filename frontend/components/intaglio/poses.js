// Camera poses for the seal, shared by the WebGL scene and the 2D still so both frame the seal the same way.
// dist: camera distance (seal radius 1); elev, az: degrees; sx, sy: where the seal's centre sits on screen, in
// normalised device units (-1 to 1); tx, ty, tz: the point looked at; zoom: image scale (1 is the 26° lens).
//
// Two compositions share the steel, which always fills the window. Wide screens put the seal to the right of the text.
// Portrait screens (NARROW_QUERY) set it as a vignette: in the opening view the seal is larger than the screen and
// sits between the headline and the copy, its rim running behind the headline and fading out above the copy; in the
// chapters it stands, whole, in a window across the top of the screen while the text passes beneath it. Their framing
// is fitted to the layout at run time.

export const FOV = 26;

/** The portrait composition. Keep in step with the media query of the same name in intaglio.module.css. */
export const NARROW_QUERY = "(max-aspect-ratio: 19/20), (max-width: 640px)";

/** In the portrait chapters, the share of the screen's height the seal's window keeps once the text arrives. */
export const WINDOW_SHARE = 0.46;

export const POSES = {
  wide: {
    hero: { dist: 3.3, elev: 47, az: -17, sx: 0.47, sy: -0.12, tx: 0, ty: 0, tz: 0 },
    seal: { dist: 4.25, elev: 34, az: -9, sx: 0.36, sy: -0.12, tx: 0, ty: 0, tz: 0.25 },
    difference: { dist: 4.1, elev: 62, az: -3, sx: 0.45, sy: -0.02, tx: 0, ty: 0, tz: 0 },
    print: { dist: 2.4, elev: 82, az: 0, sx: 0.37, sy: 0.0, tx: 0, ty: 0, tz: 0 },
    evidence: { dist: 3.05, elev: 89.5, az: 0, sx: 0.36, sy: 0.02, tx: 0, ty: 0.05, tz: 0 },
  },
  // Portrait. The hero's sy and zoom are fitted to the space between the headline and the copy (fitPose); the
  // chapters' sy is the seal's centre as a share of the window's height, and their zoom fills the window.
  narrow: {
    hero: { dist: 3.3, elev: 47, az: -12, sx: 0.22, sy: 0.0, tx: 0, ty: 0, tz: 0 },
    seal: { dist: 5.2, elev: 34, az: -8, sx: 0.0, sy: -0.2, tx: 0, ty: 0, tz: 0.25 },
    difference: { dist: 4.9, elev: 62, az: -3, sx: 0.0, sy: -0.02, tx: 0, ty: 0, tz: 0 },
    print: { dist: 3.6, elev: 82, az: 0, sx: 0.0, sy: 0.0, tx: 0, ty: 0, tz: 0 },
    evidence: { dist: 3.4, elev: 89.5, az: 0, sx: 0.0, sy: 0.14, tx: 0, ty: 0.05, tz: 0 },
  },
};

const TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

/**
 * The pose for a chapter in a given layout: { narrow, w, h, band } where band is the opening view's free space between
 * the headline's last line and the copy, in CSS pixels from the top of the window.
 */
export function fitPose(name, layout) {
  if (!layout?.narrow) return { zoom: 1, ...(POSES.wide[name] ?? POSES.wide.hero) };
  const { w, h } = layout;
  const pose = POSES.narrow[name] ?? POSES.narrow.hero;
  if (name === "hero") {
    const [top, bottom] = layout.band ?? [h * 0.3, h * 0.66];
    const centre = (top + bottom) / 2;
    // The seal is cut larger than the screen, so its engraving is seen at the scale it is cut at on a desktop. Its
    // height follows the free band, its rim reaching a little behind the headline and into the steel's fade above
    // the copy, and it never shows its whole width.
    const squash = Math.sin((pose.elev * Math.PI) / 180);
    const radius = Math.min(w * 0.82, Math.max(w * 0.6, ((bottom - top) * 0.62) / squash));
    return { ...pose, sy: 1 - (2 * centre) / h, zoom: (radius * pose.dist * TAN) / (h / 2) };
  }
  // The chapters keep the framing of the window they are seen in.
  const share = WINDOW_SHARE;
  return { ...pose, sy: 1 - (1 - pose.sy) * share, zoom: share };
}

/** Where the 2D still draws the seal for a pose: centre and radius in CSS pixels, squash from the elevation. */
export function stillFrame(name, width, height, layout) {
  const pose = fitPose(name, { ...layout, w: width, h: height });
  const halfHeight = (pose.dist * TAN) / pose.zoom;
  // The 3D seal stands above the plate and recedes in perspective: its centre reads a little higher and its rim a
  // little smaller than a flat projection, so the still is set to match it and the cross-fade does not jump.
  const scale = height / 2 / halfHeight;
  return {
    cx: (0.5 + pose.sx * 0.5) * width - scale * 0.02 * pose.dist * TAN * 2,
    cy: (0.5 - pose.sy * 0.5) * height - scale * 0.06 * pose.dist * TAN * 2,
    radius: scale * 0.86,
    squash: Math.sin((pose.elev * Math.PI) / 180),
    tilt: (pose.az * Math.PI) / 180,
  };
}
