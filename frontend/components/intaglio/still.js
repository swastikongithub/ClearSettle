// The seal in two dimensions, from the same geometry as the WebGL scene. It is the first frame the page paints, the
// whole experience when WebGL is unavailable or fails, and, in ink on the tint, the printed impression further
// down the page. Drawn once per state change, never per frame.

import { inr } from "../../lib/landingExample.mjs";
import { MEDALLION, REGISTER, RINGS, caseSeal } from "../../lib/intaglioSeal.mjs";

const TAU = Math.PI * 2;

const THEMES = {
  steel: {
    ground: ["#1a2026", "#0b0e11"],
    face: (ctx, cx, cy, r, rot) => {
      const g = ctx.createConicGradient ? ctx.createConicGradient(rot + 0.6, cx, cy) : null;
      if (!g) return "#59626a";
      const stops = ["#3a434b", "#8d979f", "#4a535b", "#2b3238", "#6f7981", "#c3ccd2", "#58616a", "#323a41", "#3a434b"];
      stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
      return g;
    },
    wall: "#14191d",
    line: "rgba(6, 8, 10, 0.62)",
    micro: "rgba(8, 10, 12, 0.7)",
    notch: "rgba(255, 224, 170, 0.95)",
    numerals: ["#47b98e", "#7e9bea"],
    medallion: "#20272d",
    dimAlpha: 0.32,
    open: "rgba(217, 164, 65, 0.9)",
  },
  ink: {
    ground: null,
    face: () => "rgba(227, 233, 229, 0)",
    wall: null,
    line: "rgba(14, 61, 53, 0.78)",
    micro: "rgba(14, 61, 53, 0.85)",
    notch: "rgba(14, 61, 53, 0.95)",
    numerals: ["#0e3d35", "#0e3d35"],
    medallion: null,
    dimAlpha: 0.3,
    open: "rgba(14, 61, 53, 0.9)",
  },
};

function guilloche(ctx, cx, cy, ring, rot, R, shift = [0, 0]) {
  const p = ring.pattern;
  const gr0 = (ring.r0 + 0.012) * R;
  const gr1 = (ring.r1 - 0.026) * R;
  const rc = (gr0 + gr1) / 2;
  const hw = (gr1 - gr0) / 2;
  const A = (hw * 0.8) / (1 + p.harmonicGain);
  const steps = 540;
  for (let j = 0; j < p.lines; j++) {
    const fj = p.lines > 1 ? j / (p.lines - 1) : 0.5;
    const base = rc + (fj - 0.5) * hw * 0.16;
    const ph = p.phase + ((j * TAU) / p.lines) * (p.twist / 3);
    for (const sg of [1, -1]) {
      ctx.beginPath();
      for (let k = 0; k <= steps; k++) {
        const th = (k / steps) * TAU;
        const r = base + sg * A * (Math.sin(p.petals * th + ph) + p.harmonicGain * Math.sin(p.harmonic * th + ph * 0.5));
        const x = cx + shift[0] + r * Math.cos(th + rot);
        const y = cy + shift[1] - r * Math.sin(th + rot);
        if (k) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
}

/**
 * The microtext track. At the still's scale its letters are three to six pixels high, which reads as texture, so the
 * record is drawn as one dashed stroke whose dashes follow its own words. (Thousands of separately rotated glyphs
 * cost about half a second of rasterizing per draw, measured; the legible microtext is the WebGL scene's, read in
 * the loupe.)
 */
function microtext(ctx, cx, cy, text, radius, size, rot, colour) {
  ctx.save();
  ctx.font = `500 ${Math.max(4, size)}px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif`;
  const words = text.trim().split(/\s+/);
  const space = ctx.measureText(" ").width;
  const dashes = [];
  for (const w of words) dashes.push(Math.max(0.5, ctx.measureText(w).width), space * 1.4);
  const unit = dashes.reduce((a, b) => a + b, 0);
  const circ = TAU * radius;
  const copies = Math.max(1, Math.round(circ / unit));
  const scale = circ / (unit * copies);
  ctx.setLineDash(dashes.map((d) => d * scale));
  ctx.strokeStyle = colour;
  ctx.globalAlpha *= 0.75;
  ctx.lineWidth = Math.max(0.6, size * 0.55);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -rot, -rot - TAU, true);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws the seal into a canvas. `frame` places it: centre (cx, cy) and radius in CSS pixels, plus a vertical squash
 * and tilt that approximate the 3D camera. `state` mirrors the page: the case, whether evidence is applied, the
 * selected ring. `maxDpr` caps the drawing resolution.
 */
export function drawSeal(canvas, frame, state = {}, themeName = "steel", maxDpr = 2) {
  const theme = THEMES[themeName];
  const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const { cx, cy, radius: R, squash = 1, tilt = 0 } = frame;
  if (theme.ground) {
    const g = ctx.createRadialGradient(cx - R * 0.5, cy - R * 0.4, R * 0.1, cx, cy, Math.max(w, h));
    g.addColorStop(0, theme.ground[0]);
    g.addColorStop(1, theme.ground[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Turning marks in the plate.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, squash);
    ctx.rotate(tilt);
    ctx.strokeStyle = "rgba(160, 172, 182, 0.05)";
    ctx.lineWidth = 1;
    for (let k = 1.02; k < 3.2; k += 0.014) {
      ctx.beginPath();
      ctx.arc(0, 0, R * k, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  const seal = state.caseId ? caseSeal(state.caseId) : null;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, squash);
  ctx.rotate(tilt);

  const evidence = Boolean(seal && state.evidence);
  RINGS.forEach((ring, i) => {
    const inPair = seal ? seal.rings.includes(i) : true;
    if (evidence && inPair) return;
    const isB = seal ? seal.rings[1] === i : false;
    const settled = seal ? seal.closable && state.applied : true;
    const missing = seal && isB && seal.missing;
    let rot = REGISTER;
    let open = false;
    if (seal && isB && !settled && seal.offset !== 0 && !missing) {
      rot = REGISTER + seal.offset;
      open = true;
    }
    ctx.globalAlpha = (seal && !inPair) || missing ? theme.dimAlpha * (evidence ? 0.5 : 1) : 1;
    // Wall (thickness, seen from the tilted camera) and face.
    if (theme.wall) {
      ctx.fillStyle = theme.wall;
      ctx.beginPath();
      ctx.arc(0, R * 0.02, ring.r1 * R, 0, TAU);
      ctx.arc(0, R * 0.02, ring.r0 * R, 0, TAU, true);
      ctx.fill();
    }
    ctx.fillStyle = theme.face(ctx, 0, 0, R, -rot);
    ctx.beginPath();
    ctx.arc(0, 0, ring.r1 * R, 0, TAU);
    ctx.arc(0, 0, ring.r0 * R, 0, TAU, true);
    ctx.fill();
    if (missing) return;

    ctx.strokeStyle = theme.line;
    ctx.lineWidth = Math.max(0.6, R / 700);
    guilloche(ctx, 0, 0, ring, rot, R);
    if (open) {
      // The out-of-register record: a second engraving, displaced. The two together show as moiré.
      ctx.strokeStyle = theme.open;
      ctx.lineWidth = Math.max(0.5, R / 900);
      const s = (0.0035 + Math.abs(seal.offset) * 0.012) * R;
      guilloche(ctx, 0, 0, ring, REGISTER, R, [Math.cos(REGISTER) * s, -Math.sin(REGISTER) * s]);
    }
    // Edges.
    ctx.strokeStyle = themeName === "ink" ? theme.line : "rgba(225, 232, 236, 0.35)";
    ctx.lineWidth = state.selected === i ? 2 : 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, ring.r1 * R, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, ring.r0 * R, 0, TAU);
    ctx.stroke();
    // The notch.
    ctx.strokeStyle = open ? theme.line : theme.notch;
    ctx.lineWidth = Math.max(1, R / 400);
    ctx.beginPath();
    ctx.moveTo(Math.cos(rot) * ring.r0 * R, -Math.sin(rot) * ring.r0 * R);
    ctx.lineTo(Math.cos(rot) * ring.r1 * R, -Math.sin(rot) * ring.r1 * R);
    ctx.stroke();
    // Microtext along the outer edge, legible only on a large screen.
    const size = Math.max(3.2, R * 0.0105);
    microtext(ctx, 0, 0, ring.microtext, (ring.r1 - 0.012) * R, size, rot, theme.micro);
  });
  ctx.globalAlpha = 1;

  // The medallion.
  const mr = MEDALLION.r1 * R;
  if (theme.medallion) {
    ctx.fillStyle = theme.medallion;
    ctx.beginPath();
    ctx.arc(0, 0, mr, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, mr, 0, TAU);
  ctx.stroke();
  const text = seal ? seal.medallion : MEDALLION.text;
  let px = mr * 0.42;
  ctx.font = `600 ${px}px "Bodoni Moda", "Bodoni 72", Didot, Georgia, serif`;
  const tw = ctx.measureText(text).width;
  if (tw > mr * 1.5) {
    px *= (mr * 1.5) / tw;
    ctx.font = `600 ${px}px "Bodoni Moda", "Bodoni 72", Didot, Georgia, serif`;
  }
  const g = ctx.createLinearGradient(-mr, -mr, mr, mr);
  g.addColorStop(0, theme.numerals[0]);
  g.addColorStop(1, theme.numerals[1]);
  ctx.globalAlpha = evidence ? theme.dimAlpha * 0.5 : 1;
  ctx.fillStyle = g;
  ctx.textBaseline = "middle";
  // Bodoni's minus is a hairline, so a negative amount gets a bar of stem weight, as on the steel.
  const negative = text.startsWith("−");
  const digits = negative ? text.slice(1) : text;
  const minusW = negative ? ctx.measureText("−").width : 0;
  const x0 = -(minusW + ctx.measureText(digits).width) / 2;
  if (negative) ctx.fillRect(x0 + minusW * 0.1, -px * 0.06, minusW * 0.76, Math.max(1.5, px * 0.08));
  ctx.textAlign = "left";
  ctx.fillText(digits, x0 + minusW, px * 0.05);
  ctx.globalAlpha = 1;
  ctx.restore();
  if (evidence) drawStrips(ctx, frame, seal);
}

/** The evidence view without WebGL: the two compared records as polished strips, each engraved with its record. */
function drawStrips(ctx, frame, seal) {
  const { cx, cy, radius: R } = frame;
  const len = Math.min(R * 1.5, ctx.canvas.clientWidth * 0.86);
  const h = Math.max(30, R * 0.12);
  const sides = [seal.case.a, seal.case.b];
  sides.forEach((side, k) => {
    const x = cx - len / 2;
    const y = cy - h * 1.3 + k * h * 1.6;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#d7dde1");
    g.addColorStop(0.45, "#aab3b9");
    g.addColorStop(1, "#7f888e");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, len, h);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, len - 1, h - 1);
    ctx.fillStyle = "#20272d";
    ctx.textBaseline = "middle";
    const size = Math.max(10, h * 0.36);
    ctx.font = `500 ${size}px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`${side.record.toUpperCase()}   ${side.ref ?? "NO CREDIT WITH THIS UTR"}`, x + h * 0.5, y + h / 2);
    ctx.font = `600 ${size * 1.15}px "IBM Plex Sans", "Segoe UI", sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(side.paise === null ? "NOT FOUND" : inr(side.paise), x + len - h * 0.5, y + h / 2);
  });
}
