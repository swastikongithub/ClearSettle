// Canvas-drawn textures for the seal: the microtext atlas (one row per record), the medallion's numerals, the
// latent image, and the plain-type records the strips show in the evidence view. Drawn in the browser from the
// same illustrative data as the page, in the page's own fonts.

import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, ClampToEdgeWrapping } from "three";

const MICRO_FONT = '500 50px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif';
const ROW_H = 64;

function texture(canvas, { repeat = false, mips = true, anisotropy = 1 } = {}) {
  const t = new CanvasTexture(canvas);
  t.wrapS = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  t.wrapT = ClampToEdgeWrapping;
  t.minFilter = mips ? LinearMipmapLinearFilter : LinearFilter;
  t.magFilter = LinearFilter;
  t.generateMipmaps = mips;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

/**
 * One row per ring. Each row holds whole repetitions of the record's text, squeezed slightly to fill the row
 * exactly, so the text wraps around its ring without a seam. Returns the texture and, per row, its width in row
 * heights (the shader needs it to set how many times the row repeats around the ring).
 */
export function microAtlas(rows, maxWidth, anisotropy) {
  const width = Math.min(4096, maxWidth);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = ROW_H * 8;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = MICRO_FONT;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  const aspects = [];
  rows.forEach((text, i) => {
    const unit = ctx.measureText(text).width;
    const copies = Math.max(1, Math.round(width / unit));
    const line = text.repeat(copies);
    const natural = ctx.measureText(line).width;
    ctx.save();
    ctx.translate(0, i * ROW_H + ROW_H / 2 + 2);
    ctx.scale(width / natural, 1);
    ctx.fillText(line, 0, 0);
    ctx.restore();
    aspects.push(width / ROW_H);
  });
  return { texture: texture(canvas, { repeat: true, anisotropy }), rows: 8, aspects };
}

/** The medallion's numerals as a soft height map: the shader derives the relief from its slope. */
export function numerals(text, previous) {
  const size = 1024;
  const canvas = previous?.image ?? document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  let px = 250;
  ctx.font = `700 ${px}px "Bodoni Moda", "Bodoni 72", Didot, Georgia, serif`;
  const w = ctx.measureText(text).width;
  if (w > size * 0.74) {
    px = Math.floor((px * size * 0.74) / w);
    ctx.font = `700 ${px}px "Bodoni Moda", "Bodoni 72", Didot, Georgia, serif`;
  }
  ctx.filter = "blur(1.4px)";
  // Bodoni's minus is a hairline that the relief would lose, so a negative amount is cut with a bar of stem weight.
  const negative = text.startsWith("−");
  const digits = negative ? text.slice(1) : text;
  const minusW = negative ? ctx.measureText("−").width : 0;
  const digitsW = ctx.measureText(digits).width;
  const x0 = size / 2 - (minusW + digitsW) / 2;
  const baseline = size / 2 + px * 0.34;
  ctx.textAlign = "left";
  if (negative) ctx.fillRect(x0 + minusW * 0.08, baseline - px * 0.4, minusW * 0.78, px * 0.085);
  ctx.fillText(digits, x0 + minusW, baseline);
  ctx.filter = "none";
  if (previous) {
    previous.needsUpdate = true;
    return previous;
  }
  return texture(canvas, { mips: true });
}

/** The latent image: a reference cut with lines at right angles to the rest, visible only at a grazing light. */
export function latentMask(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '600 104px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif';
  const w = ctx.measureText(text).width;
  ctx.save();
  ctx.translate(512, 66);
  ctx.scale(Math.min(1, 980 / w), 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return texture(canvas, { mips: true });
}

/**
 * A record in plain type for the evidence strip: the fields from left to right along the strip, and the amount
 * at its right-hand end, the way a statement line reads.
 */
export function recordStrip(fields, amount, previous) {
  const canvas = previous?.image ?? document.createElement("canvas");
  canvas.width = 4096;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  // Strip u runs left to right; the ring's inner edge becomes the top of the strip, so the type stands upright.
  ctx.save();
  ctx.font = '500 92px "IBM Plex Sans Condensed", "Arial Narrow", sans-serif';
  ctx.textAlign = "left";
  let x = 150;
  for (const f of fields) {
    ctx.fillText(f, x, 128);
    x += ctx.measureText(f).width + 110;
  }
  ctx.font = '600 120px "IBM Plex Sans", "Segoe UI", sans-serif';
  ctx.textAlign = "right";
  ctx.fillText(amount, 4096 - 150, 128);
  ctx.restore();
  if (previous) {
    previous.needsUpdate = true;
    return previous;
  }
  return texture(canvas, { mips: true, anisotropy: 8 });
}
