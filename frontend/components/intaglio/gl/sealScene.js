// The seal in WebGL (D-UI-15). One plate, a medallion and six rings, all drawn with custom shaders: eight draw
// calls in total. Nothing animates unless something is changing: the loop stops when every spring has settled, so
// an idle page costs no GPU time. Loaded only in the browser, after the page's content has rendered.

import {
  ACESFilmicToneMapping, CircleGeometry, Color, HalfFloatType, Mesh, OrthographicCamera, PerspectiveCamera, Scene,
  ShaderMaterial, SRGBColorSpace, Vector2, Vector3, Vector4, WebGLRenderer, WebGLRenderTarget,
} from "three";
import { inr } from "../../../lib/landingExample.mjs";
import { MEDALLION, OPENING_OFFSETS, REGISTER, RINGS, caseSeal } from "../../../lib/intaglioSeal.mjs";
import { medallionProfile, plateGeometry, revolve, ringProfile } from "./geometry";
import { LOUPE_FRAGMENT, LOUPE_VERTEX, PLATE_FRAGMENT, PLATE_VERTEX, RING_FRAGMENT, RING_VERTEX, SHADER_COMMON } from "./shaders";
import { latentMask, microAtlas, numerals, recordStrip } from "./textures";
import { FOV, POSES, isNarrow } from "../poses";

const DEFINES = "#ifndef PI\n#define PI 3.141592653589793\n#endif\n#define TAU 6.283185307179586\n";
const FRAGMENT_HEAD = "#include <common>\n#include <dithering_pars_fragment>\n";
const BASE_Z = -0.034;
const BEVEL = 0.0055;
const D2R = Math.PI / 180;

/**
 * A critically damped spring: settles without overshoot, at a pace set by its stiffness. Within `eps` of its target
 * (in the value's own unit: degrees, pixels, radians) it snaps to rest, so the render loop can stop.
 */
class Spring {
  constructor(value, stiffness = 40, eps = 1e-3) {
    this.x = value;
    this.v = 0;
    this.target = value;
    this.k = stiffness;
    this.eps = eps;
  }
  set(target, stiffness) {
    this.target = target;
    if (stiffness) this.k = stiffness;
  }
  jump(value) {
    this.x = value;
    this.target = value;
    this.v = 0;
  }
  step(dt) {
    if (this.x === this.target && this.v === 0) return false;
    const d = 2 * Math.sqrt(this.k);
    const a = -this.k * (this.x - this.target) - d * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
    if (Math.abs(this.x - this.target) < this.eps && Math.abs(this.v) < this.eps * 4) {
      this.x = this.target;
      this.v = 0;
      return false;
    }
    return true;
  }
}

const POSE_KEYS = ["dist", "elev", "az", "sx", "sy", "tx", "ty", "tz"];
const CHAPTERS = ["hero", "seal", "difference", "print"];

const steel = new Color(0.62, 0.64, 0.67);
const inkA = new Color("#1f7a5a").convertSRGBToLinear().multiplyScalar(1.6);
const inkB = new Color("#2d4e9e").convertSRGBToLinear().multiplyScalar(1.7);
const beam = new Color(1.0, 0.86, 0.6);
const openTint = new Color("#d9a441").convertSRGBToLinear();

export function createSealScene(canvas, options = {}) {
  const { reducedMotion = false, integrated = false, onPick, onHover, onProject, onLost, onSlow, onFirstFrame } = options;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(new Color("#0b0e11"), 1);
  const gl = renderer.getContext();
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const anisotropy = renderer.capabilities.getMaxAnisotropy();

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.05, 40);
  camera.up.set(0, 0, 1);

  const shared = {
    uLampPos: { value: new Vector3(-2.2, -1.6, 2.4) },
    uLamp: { value: 1 },
    uTime: { value: 0 },
    uShadowRings: { value: Array.from({ length: 7 }, () => new Vector4()) },
    uShadowOn: { value: 1 },
    uGrazing: { value: 0 },
  };

  // Textures from the page's own fonts and data.
  const atlas = microAtlas([...RINGS.map((r) => r.microtext), "CLEARSETTLE   ILLUSTRATIVE SEAL   NOT LIVE DATA   "], maxTex, anisotropy);
  const numeralTex = numerals(MEDALLION.text);
  const latentTex = latentMask(RINGS[3].ref);
  const recordTex = [recordStrip([], ""), recordStrip([], "")];

  // The plate.
  const plateMat = new ShaderMaterial({
    uniforms: { ...shared, uSteel: { value: steel.clone().multiplyScalar(0.62) }, uWell: { value: 0.985 }, uUnderprint: { value: 1 } },
    vertexShader: PLATE_VERTEX,
    fragmentShader: FRAGMENT_HEAD + SHADER_COMMON + PLATE_FRAGMENT,
    dithering: true,
  });
  const plate = new Mesh(plateGeometry(0.985, 0.034, 9, 256), plateMat);
  scene.add(plate);

  // The medallion and the rings: one material each, sharing the lamp and shadow uniforms.
  const pieces = [];
  const makePiece = (geometry, params) => {
    const uniforms = {
      ...shared,
      uIndex: { value: params.index },
      uR0: { value: params.r0 },
      uR1: { value: params.r1 },
      uRm: { value: (params.r0 + params.r1) / 2 },
      uBevel: { value: BEVEL },
      uPat: { value: new Vector4(...params.pat) },
      uPat2: { value: new Vector2(...params.pat2) },
      uKind: { value: params.kind },
      uRot: { value: 0 },
      uLift: { value: 0 },
      uBend: { value: 0 },
      uStrip: { value: 0 },
      uStripScale: { value: 1 },
      uStripPos: { value: new Vector3() },
      uSel: { value: 0 },
      uHover: { value: 0 },
      uDim: { value: 0 },
      uMoire: { value: 0 },
      uMoireShift: { value: new Vector2() },
      uLit: { value: 0 },
      uReveal: { value: reducedMotion ? 1 : 0 },
      uMicro: { value: atlas.texture },
      uMicroInfo: { value: new Vector3(params.row, atlas.rows, 1) },
      uMicroOn: { value: 1 },
      uDivA: { value: new Vector4(-1, -1, -1, -1) },
      uDivB: { value: new Vector4(-1, -1, -1, -1) },
      uKindA: { value: new Vector4() },
      uKindB: { value: new Vector4() },
      uGrad: { value: new Vector2(params.graduations ?? 0, params.marked ?? -1) },
      uGradLit: { value: 0 },
      uLatent: { value: latentTex },
      uLatentBox: { value: new Vector3(params.latent?.[0] ?? 0, params.latent?.[1] ?? 0, params.latent ? 1 : 0) },
      uNumerals: { value: numeralTex },
      uNumeralsOn: { value: params.kind > 0.5 ? 1 : 0 },
      uRecord: { value: recordTex[0] },
      uRecordMix: { value: 0 },
      uStripView: { value: 0 },
      uSteel: { value: steel },
      uInkA: { value: inkA },
      uInkB: { value: inkB },
      uBeam: { value: beam },
      uOpen: { value: openTint },
      uOpenGlow: { value: 0 },
    };
    // Divisions: start turns of each arc and the hatching it is cut with (0 guilloché, 1 radial, 2 concentric).
    const starts = [];
    const kinds = [];
    let acc = 0;
    (params.divisions ?? []).forEach((d, i) => {
      starts.push(acc);
      kinds.push(params.divKind ? params.divKind(d, i) : 0);
      acc += d.turn;
    });
    const pad = (a, fill) => [...a, ...Array(8).fill(fill)].slice(0, 8);
    const s8 = pad(starts.length > 1 ? starts : [], -1);
    const k8 = pad(kinds, 0);
    uniforms.uDivA.value.set(s8[0], s8[1], s8[2], s8[3]);
    uniforms.uDivB.value.set(s8[4], s8[5], s8[6], s8[7]);
    uniforms.uKindA.value.set(k8[0], k8[1], k8[2], k8[3]);
    uniforms.uKindB.value.set(k8[4], k8[5], k8[6], k8[7]);
    // How many times the microtext row repeats around the ring, so its glyphs keep their proportions.
    const microH = params.kind > 0.5 ? 0.0105 : 0.0125;
    const textR = params.r1 - BEVEL - microH;
    uniforms.uMicroInfo.value.z = Math.max(1, Math.round((Math.PI * 2 * textR) / (atlas.aspects[params.row] * microH)));
    const material = new ShaderMaterial({
      uniforms,
      vertexShader: DEFINES + RING_VERTEX,
      fragmentShader: FRAGMENT_HEAD + SHADER_COMMON + RING_FRAGMENT,
      dithering: true,
    });
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    const piece = {
      mesh, uniforms, params,
      rot: new Spring(params.kind > 0.5 ? 0 : REGISTER, 26, 2e-4),
      lift: new Spring(0, 34, 2e-4),
      dim: new Spring(0, 30),
      sel: new Spring(0, 70),
      hover: new Spring(0, 90),
      moire: new Spring(0, 26),
      open: new Spring(0, 26),
      lit: new Spring(0, 18),
      bend: new Spring(0, 16),
      strip: new Spring(0, 14),
      record: new Spring(0, 14),
    };
    pieces.push(piece);
    return piece;
  };

  makePiece(revolve(medallionProfile(MEDALLION.r1, MEDALLION.z, BASE_Z, BEVEL), 360), {
    index: 0, r0: 0, r1: MEDALLION.r1, kind: 1, row: 6, pat: [36, 61, 0.2, 6], pat2: [1, 0.4],
  });
  RINGS.forEach((ring, i) => {
    const p = ring.pattern;
    makePiece(revolve(ringProfile(ring.r0, ring.r1, ring.z, BASE_Z, BEVEL), 720), {
      index: i + 1,
      r0: ring.r0,
      r1: ring.r1,
      kind: 0,
      row: i,
      pat: [p.petals, p.harmonic, p.harmonicGain, p.lines],
      pat2: [p.twist, p.phase],
      divisions: ring.divisions,
      // The settlement line's fee and GST are hatched apart from the net; the journal's credits are cut across its
      // debits; the payout is satin-turned, with the latent reference hidden in it.
      divKind: ring.id === "settlement" ? (d, k) => (k === 0 ? 0 : 1)
        : ring.id === "journal" ? (d) => (d.label.startsWith("Dr") ? 0 : 2)
        : ring.id === "payout" ? () => 2 : null,
      graduations: ring.graduations,
      marked: ring.markedGraduation,
      latent: ring.id === "payout" ? [0.19, 0.33] : null,
    });
  });
  const rings = pieces.slice(1);
  const medallion = pieces[0];

  // Scene-wide springs.
  const POSE_EPS = { dist: 1e-3, elev: 0.02, az: 0.02, sx: 2e-4, sy: 2e-4, tx: 2e-4, ty: 2e-4, tz: 2e-4 };
  const pose = Object.fromEntries(POSE_KEYS.map((k) => [k, new Spring(POSES.wide.hero[k], 10, POSE_EPS[k])]));
  const explode = new Spring(0, 12, 5e-4);
  const lamp = { az: new Spring(212, 22, 0.05), el: new Spring(34, 22, 0.05) };
  let lampDriftUntil = 0;
  // Where the lamp stands in each chapter: never behind the text column, where its streak would cost contrast.
  const LAMP = { hero: [212, 34], seal: [252, 42], difference: [28, 40], print: [212, 50] };

  // The loupe: the scene rendered again through a narrow lens, shown in a glass circle. The engraving is computed
  // per pixel, so the loupe shows real detail (the microtext) rather than enlarged pixels.
  const MAGNIFY = 10;
  const loupe = {
    rt: new WebGLRenderTarget(640, 640, { samples: 4, type: HalfFloatType }),
    cam: new PerspectiveCamera(FOV / MAGNIFY, 1, 0.05, 40),
    scene: new Scene(),
    ortho: new OrthographicCamera(0, 1, 1, 0, -1, 1),
    opacity: new Spring(0, 40),
    x: new Spring(0, 90, 0.1),
    y: new Spring(0, 90, 0.1),
    point: new Vector3(),
    hover: null,
  };
  const loupeMat = new ShaderMaterial({
    uniforms: { uView: { value: loupe.rt.texture }, uOpacity: { value: 0 } },
    vertexShader: LOUPE_VERTEX,
    fragmentShader: LOUPE_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const loupeMesh = new Mesh(new CircleGeometry(1, 96), loupeMat);
  loupe.scene.add(loupeMesh);

  // State from the page.
  const state = { chapter: "hero", scroll: 0, selected: null, hovered: null, caseId: null, applied: false, evidence: false, narrow: false };
  let width = 1;
  let height = 1;
  let opening = reducedMotion ? null : { start: -1 };
  let raf = 0;
  let running = false;
  let last = 0;
  let firstFrame = true;
  let ready = false; // set once every shader has compiled
  // Adaptive resolution: if animated frames keep arriving slower than about 40 a second, the drawing resolution
  // steps down (never below 0.6 of the CSS pixel size). It never steps back up within a visit, so it cannot oscillate.
  let pixelRatio = null;
  const pace = { frames: 0, slow: 0, crawl: 0, skip: 30, gaveUp: false };
  let disposed = false;
  let litPulseUntil = 0;
  const dragging = { ring: null, startX: 0, base: 0 };

  if (reducedMotion) {
    for (const p of rings) p.rot.jump(REGISTER);
    for (const p of pieces) p.lit.jump(1);
  } else {
    rings.forEach((p, i) => p.rot.jump(REGISTER + OPENING_OFFSETS[i]));
  }

  function poseFor(name) {
    return (state.narrow ? POSES.narrow : POSES.wide)[name];
  }

  /** Targets from the page's state: what the seal should look like now. */
  function retarget() {
    const k = Math.max(0, Math.min(CHAPTERS.length - 1, state.scroll));
    const i0 = Math.floor(k);
    const i1 = Math.min(CHAPTERS.length - 1, i0 + 1);
    const f = k - i0;
    const ease = f * f * (3 - 2 * f);
    const a = poseFor(CHAPTERS[i0]);
    const b = poseFor(CHAPTERS[i1]);
    let target = Object.fromEntries(POSE_KEYS.map((key) => [key, a[key] + (b[key] - a[key]) * ease]));

    const inSeal = state.chapter === "seal";
    const inDifference = state.chapter === "difference";
    const seal = inDifference && state.caseId ? caseSeal(state.caseId) : null;

    if (state.evidence && seal) target = { ...poseFor("evidence") };
    if (inSeal && state.selected !== null) {
      // A chosen ring rises out of the tower; the camera leans in a little, and the loupe does the close reading.
      target = { ...target, dist: target.dist * 0.9, elev: 52, tz: target.tz + 0.08 };
    }
    for (const key of POSE_KEYS) pose[key].set(target[key]);

    const ex = Math.max(0, 1 - Math.abs(k - 1) * 1.6);
    explode.set(inSeal && state.selected !== null ? 1 : ex);

    rings.forEach((p, i) => {
      const inPair = seal ? seal.rings.includes(i) : false;
      const isB = seal ? seal.rings[1] === i : false;
      let rot = REGISTER;
      let dim = 0;
      let liftExtra = 0;
      let moire = 0;
      let open = 0;
      let bend = 0;
      let strip = 0;
      if (seal) {
        dim = inPair ? 0 : 1;
        liftExtra = inPair ? 0.012 : -0.028;
        if (isB) {
          const settled = seal.closable && state.applied;
          if (seal.missing) { dim = 1; liftExtra = -0.06; }
          else if (!settled && seal.offset !== 0) { rot = REGISTER + seal.offset; moire = 1; open = seal.closable ? 0.35 : 1; }
        }
        if (state.evidence && !inPair) { dim = 1; liftExtra = -0.09; }
        if (state.evidence && inPair) {
          rot = Math.PI / 2;
          bend = 1;
          strip = 1;
        }
      }
      if (inSeal && state.selected !== null) {
        if (state.selected === i) liftExtra = 0.17;
        else dim = 0.6;
      }
      if (dragging.ring === i) rot = dragging.base + dragging.delta;
      // During the opening the rings turn into register on their own schedule.
      if (!opening) p.rot.set(rot);
      p.dim.set(dim);
      p.extraLift = liftExtra;
      p.moire.set(moire);
      p.open.set(open);
      p.bend.set(bend);
      p.strip.set(strip);
      p.record.set(strip);
      p.sel.set(inSeal && state.selected === i ? 1 : 0);
      p.hover.set(state.hovered === i ? 1 : 0);
    });
    medallion.dim.set(seal && state.evidence ? 1 : inSeal && state.selected !== null ? 0.6 : 0);
    medallion.extraLift = seal && state.evidence ? -0.09 : 0;
    // The evidence is read under an even, high light.
    if (seal && state.evidence) { lamp.el.set(64); lamp.az.set(240); }

    const registered = !seal || seal.offset === 0 || (seal.closable && state.applied);
    const allLit = registered && !(seal && seal.missing) && !state.evidence ? 1 : 0;
    const openingDone = !opening;
    // The registration line pulses once, when the rings come into register.
    if (openingDone && allLit && pieces[1].lit.target < 0.5) litPulseUntil = performance.now() + 2600;
    for (const p of pieces) p.lit.set(openingDone ? allLit : p.lit.target);
    wake();
  }

  function liftFor(index) {
    // Exploded: the inner rings rise highest, so the stack reads as a stepped tower.
    const p = pieces[index];
    const tower = (7 - index) * 0.085 + 0.02;
    return explode.x * tower + (p.extraLift ?? 0);
  }

  function updateCaseTextures() {
    const seal = state.chapter === "difference" && state.caseId ? caseSeal(state.caseId) : null;
    const text = seal ? seal.medallion : MEDALLION.text;
    numerals(text, numeralTex);
    if (seal) {
      const c = seal.case;
      [c.a, c.b].forEach((side, k) => {
        const fields = [side.record.toUpperCase(), side.source.toUpperCase(), side.ref ?? "NO REFERENCE ON THE STATEMENT"];
        recordStrip(fields, side.paise === null ? "NOT FOUND" : inr(side.paise), recordTex[k]);
      });
      seal.rings.forEach((ringIndex, k) => { rings[ringIndex].uniforms.uRecord.value = recordTex[k]; });
    }
  }

  // ---------------------------------------------------------------- camera
  function applyCamera() {
    const dist = pose.dist.x;
    const el = pose.elev.x * D2R;
    const az = pose.az.x * D2R;
    const tx = pose.tx.x;
    const ty = pose.ty.x;
    const tz = pose.tz.x;
    camera.position.set(tx + dist * Math.cos(el) * Math.sin(az), ty - dist * Math.cos(el) * Math.cos(az), tz + dist * Math.sin(el));
    const topDown = Math.min(1, Math.max(0, (pose.elev.x - 70) / 20));
    camera.up.set(0, topDown, 1 - topDown).normalize();
    camera.lookAt(tx, ty, tz);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[8] = -pose.sx.x;
    camera.projectionMatrix.elements[9] = -pose.sy.x;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  // ---------------------------------------------------------------- lamp
  function applyLamp(now) {
    let az = lamp.az.x;
    let el = lamp.el.x;
    if (now < lampDriftUntil && !reducedMotion) {
      const t = now / 1000;
      az += Math.sin(t * 0.21) * 26;
      el += Math.sin(t * 0.13 + 1.3) * 7;
    }
    const r = 2.6 * Math.cos(el * D2R);
    shared.uLampPos.value.set(r * Math.cos(az * D2R), r * Math.sin(az * D2R), 0.3 + 2.6 * Math.sin(el * D2R));
    shared.uGrazing.value = Math.min(1, Math.max(0, (24 - el) / 12));
  }

  // ---------------------------------------------------------------- frame
  let lastDraw = 0;
  let wasMoving = true;
  function frame(now) {
    if (disposed) return;
    // While only the ambient lamp drifts, draw at most 30 times a second: half the GPU time for a slow light.
    if (!wasMoving && !opening && now < lampDriftUntil && now - lastDraw < 30) {
      raf = requestAnimationFrame(frame);
      return;
    }
    lastDraw = now;
    const rawDt = last ? (now - last) / 1000 : 0;
    const dt = Math.min(0.05, rawDt || 0.016);
    if (rawDt > 0 && rawDt < 0.25 && wasMoving) adapt(rawDt);
    last = now;
    let moving = false;

    if (opening) {
      if (opening.start < 0) opening.start = now;
      const t = (now - opening.start) / 1000;
      const reveal = Math.min(1, t / 1.5);
      for (const p of pieces) p.uniforms.uReveal.value = reveal * reveal * (3 - 2 * reveal);
      rings.forEach((p, i) => { if (t > 0.55 + (5 - i) * 0.17) p.rot.set(REGISTER, 30); });
      if (t > 2.35) {
        for (const p of pieces) p.lit.set(1, 16);
        litPulseUntil = now + 2800;
        opening = null;
        retarget();
      }
      moving = true;
    }

    for (const key of POSE_KEYS) moving = pose[key].step(dt) || moving;
    moving = explode.step(dt) || moving;
    moving = lamp.az.step(dt) || moving;
    moving = lamp.el.step(dt) || moving;
    for (const p of pieces) {
      for (const s of [p.rot, p.lift, p.dim, p.sel, p.hover, p.moire, p.open, p.lit, p.bend, p.strip, p.record]) moving = s.step(dt) || moving;
    }

    applyCamera();
    applyLamp(now);
    shared.uTime.value = now / 1000;

    pieces.forEach((p, i) => {
      p.lift.set(liftFor(i));
      const u = p.uniforms;
      u.uRot.value = p.rot.x;
      u.uLift.value = p.lift.x;
      u.uDim.value = p.dim.x;
      u.uSel.value = p.sel.x;
      u.uHover.value = p.hover.x;
      u.uMoire.value = p.moire.x;
      u.uOpenGlow.value = p.open.x;
      const pulse = now < litPulseUntil ? 1 : 0.55;
      u.uLit.value = p.lit.x * pulse;
      u.uGradLit.value = p.sel.x + p.lit.x * 0.4;
      // The second engraving of an out-of-register ring is displaced along the ring's own notch direction.
      const shift = 0.012 + Math.abs(p.rot.target - REGISTER) * 0.09;
      u.uMoireShift.value.set(Math.cos(REGISTER) * shift, Math.sin(REGISTER) * shift);
      const bend = p.bend.x;
      const bendEase = bend * bend * (3 - 2 * bend);
      u.uBend.value = Math.min(0.9995, bendEase);
      const strip = Math.max(0, Math.min(1, (p.strip.x - 0.55) / 0.45));
      u.uStrip.value = strip * strip * (3 - 2 * strip);
      u.uStripView.value = u.uStrip.value;
      u.uRecordMix.value = Math.max(0, (p.record.x - 0.7) / 0.3);
      if (i > 0) {
        const seal = state.caseId ? caseSeal(state.caseId) : null;
        const k = seal ? seal.rings.indexOf(i - 1) : -1;
        const len = state.narrow ? 1.2 : 1.02;
        const rm = u.uRm.value;
        u.uStripScale.value = len / (Math.PI * 2 * rm);
        u.uStripPos.value.set(0, k === 0 ? 0.13 : -0.02, 0.24);
      }
      shared.uShadowRings.value[i].set(p.params.r0, p.params.r1, (i === 0 ? MEDALLION.z : RINGS[i - 1].z) + p.lift.x, p.uniforms.uStrip.value > 0.01 ? 0 : 1);
    });
    for (const p of pieces) moving = p.lift.step(0) || moving;

    renderer.render(scene, camera);
    moving = renderLoupe(dt) || moving;
    if (firstFrame) {
      firstFrame = false;
      onFirstFrame?.();
    }
    if (onProject) onProject(projectLabels(), projectEvidence());

    const pulsing = now < litPulseUntil;
    const drifting = now < lampDriftUntil;
    wasMoving = moving || pulsing;
    if (moving || pulsing || drifting) {
      raf = requestAnimationFrame(frame);
    } else {
      running = false;
      last = 0;
    }
  }

  function loupePoint() {
    if (state.chapter !== "seal") return null;
    if (loupe.hover) return loupe.hover;
    if (state.selected === null) return null;
    // The front of the chosen ring, on its microtext, where the text stands upright to the camera.
    const ring = RINGS[state.selected];
    const p = pieces[state.selected + 1];
    const r = ring.r1 - BEVEL - 0.016;
    const a = -Math.PI / 2 - 0.12;
    return tmp2.set(r * Math.cos(a), r * Math.sin(a), ring.z + p.lift.x);
  }

  const tmp2 = new Vector3();
  function renderLoupe(dt) {
    const point = loupePoint();
    loupe.opacity.set(point ? 1 : 0);
    let moving = loupe.opacity.step(dt);
    const radius = Math.max(70, Math.min(150, Math.min(width, height) * 0.15));
    if (point) {
      loupe.point.copy(point);
      tmp.copy(point).project(camera);
      // The lens stays whole inside the frame: a target at its edge (the outer ring's front, low in the frame) is
      // read through a lens held just inside it.
      const m = radius + 12;
      loupe.x.set(Math.min(Math.max((tmp.x * 0.5 + 0.5) * width, m), width - m));
      loupe.y.set(Math.min(Math.max((tmp.y * 0.5 + 0.5) * height, m), height - m));
      if (loupe.opacity.x < 0.02) { loupe.x.jump(loupe.x.target); loupe.y.jump(loupe.y.target); }
    }
    moving = loupe.x.step(dt) || moving;
    moving = loupe.y.step(dt) || moving;
    if (loupe.opacity.x < 0.01) return moving;
    loupe.cam.position.copy(camera.position);
    loupe.cam.up.copy(camera.up);
    loupe.cam.lookAt(loupe.point);
    loupe.cam.updateProjectionMatrix();
    renderer.setRenderTarget(loupe.rt);
    renderer.render(scene, loupe.cam);
    renderer.setRenderTarget(null);
    loupe.ortho.right = width;
    loupe.ortho.top = height;
    loupe.ortho.updateProjectionMatrix();
    loupeMesh.position.set(loupe.x.x, loupe.y.x, 0);
    loupeMesh.scale.setScalar(radius * (0.85 + 0.15 * loupe.opacity.x));
    loupeMat.uniforms.uOpacity.value = loupe.opacity.x;
    renderer.autoClear = false;
    renderer.render(loupe.scene, loupe.ortho);
    renderer.autoClear = true;
    return moving;
  }

  function adapt(interval) {
    if (pace.skip > 0) {
      pace.skip -= 1;
      return;
    }
    pace.frames += 1;
    if (interval > 0.024) pace.slow += 1;
    if (interval > 0.05) pace.crawl += 1;
    if (pace.frames < 24) return;
    if (pace.slow > 14 && pixelRatio > 0.6) {
      pixelRatio = Math.max(0.6, pixelRatio * 0.78);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      pace.skip = 20;
    } else if (pace.crawl > 14 && pixelRatio <= 0.6 && !pace.gaveUp) {
      // Fewer than 20 frames a second even at the lowest resolution: the still serves this device better. (Called
      // after this frame, so the page can dispose of the scene.)
      pace.gaveUp = true;
      setTimeout(() => onSlow?.(), 0);
    }
    pace.frames = 0;
    pace.slow = 0;
    pace.crawl = 0;
  }

  function wake() {
    if (running || disposed || !ready) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  // Shaders compile before the first frame, in parallel where the browser offers it (KHR_parallel_shader_compile),
  // so the page stays responsive while the still is showing. Rendering into the loupe needs its own variant of each
  // program (no tone mapping into a float target), compiled now so choosing a ring never stalls.
  applyCamera();
  const compiled = renderer.compileAsync(scene, camera);
  renderer.setRenderTarget(loupe.rt);
  const compiledLoupe = renderer.compileAsync(scene, loupe.cam);
  renderer.setRenderTarget(null);
  Promise.all([compiled, compiledLoupe, renderer.compileAsync(loupe.scene, loupe.ortho)]).then(() => {
    if (disposed) return;
    ready = true;
    wake();
  });

  // ---------------------------------------------------------------- projection for page labels
  const tmp = new Vector3();
  let leaderMinX = 0;
  function projectLabels() {
    return pieces.slice(1).map((p, i) => {
      const ring = RINGS[i];
      const r = ring.r1 - 0.01;
      // A point on the ring's left, moved around its lower side until it is clear of the text beside the seal (a
      // lifted outer ring reaches under the text).
      for (let deg = 200; ; deg += 4) {
        const a = deg * D2R;
        tmp.set(r * Math.cos(a), r * Math.sin(a), ring.z + p.lift.x).project(camera);
        const x = (tmp.x * 0.5 + 0.5) * width;
        if (x >= leaderMinX || deg >= 260) return { x, y: (1 - (tmp.y * 0.5 + 0.5)) * height, visible: tmp.z < 1 };
      }
    });
  }

  /** Where the evidence strips end on screen, so the page can set the difference beside them. */
  function projectEvidence() {
    const seal = state.evidence && state.chapter === "difference" && state.caseId ? caseSeal(state.caseId) : null;
    if (!seal) return null;
    const [a, b] = seal.rings.map((i) => rings[i]);
    const settled = Math.min(a.uniforms.uStrip.value, b.uniforms.uStrip.value);
    const ends = [a, b].map((p) => {
      const u = p.uniforms;
      const len = u.uStripScale.value * Math.PI * 2 * u.uRm.value;
      tmp.set(u.uStripPos.value.x + len / 2, u.uStripPos.value.y, RINGS[p.params.index - 1].z + p.lift.x + u.uStripPos.value.z).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * width, y: (1 - (tmp.y * 0.5 + 0.5)) * height };
    });
    return { settled, a: ends[0], b: ends[1] };
  }

  // ---------------------------------------------------------------- picking (analytic: rings are annuli)
  const ndc = new Vector2();
  const lastHit = new Vector3();
  const origin = new Vector3();
  const dir = new Vector3();
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    origin.copy(camera.position);
    dir.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(origin).normalize();
    let best = null;
    let bestT = Infinity;
    rings.forEach((p, i) => {
      if (p.uniforms.uStrip.value > 0.05 || p.dim.x > 0.5) return;
      const z = RINGS[i].z + p.lift.x;
      if (Math.abs(dir.z) < 1e-4) return;
      const t = (z - origin.z) / dir.z;
      if (t <= 0 || t >= bestT) return;
      const x = origin.x + dir.x * t;
      const y = origin.y + dir.y * t;
      const r = Math.hypot(x, y);
      if (r >= RINGS[i].r0 && r <= RINGS[i].r1) {
        best = i;
        bestT = t;
        lastHit.set(x, y, z);
      }
    });
    return best;
  }

  // ---------------------------------------------------------------- input
  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    if (dragging.ring !== null) {
      dragging.delta = ((e.clientX - dragging.startX) / rect.width) * 2.2;
      retarget();
      return;
    }
    if (e.pointerType === "mouse") {
      // The lamp follows the pointer around the seal: far from the seal it drops toward a grazing light.
      tmp.set(0, 0, 0).project(camera);
      const cx = (tmp.x * 0.5 + 0.5) * rect.width + rect.left;
      const cy = (1 - (tmp.y * 0.5 + 0.5)) * rect.height + rect.top;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const angle = Math.atan2(-dy, dx) / D2R;
      const reach = Math.min(1, Math.hypot(dx, dy) / (rect.height * 0.9));
      lamp.az.set(angle);
      lamp.el.set(62 - reach * 50);
      lampDriftUntil = 0;
    }
    const hit = e.target === canvas ? pick(e.clientX, e.clientY) : null;
    loupe.hover = hit !== null && e.pointerType === "mouse" && state.chapter === "seal" ? lastHit.clone() : null;
    if (hit !== state.hovered) {
      state.hovered = hit;
      onHover?.(hit);
      canvas.style.cursor = hit === null ? "" : "pointer";
      retarget();
    }
    wake();
  }

  function onPointerDown(e) {
    const hit = pick(e.clientX, e.clientY);
    if (hit === null) return;
    const seal = state.chapter === "difference" && state.caseId ? caseSeal(state.caseId) : null;
    if (seal && seal.rings[1] === hit && !state.evidence) {
      dragging.ring = hit;
      dragging.startX = e.clientX;
      dragging.base = rings[hit].rot.x;
      dragging.delta = 0;
      dragging.moved = false;
      canvas.setPointerCapture?.(e.pointerId);
    }
    dragging.downHit = hit;
    dragging.downX = e.clientX;
    dragging.downY = e.clientY;
  }

  function onPointerUp(e) {
    const moved = Math.hypot(e.clientX - (dragging.downX ?? e.clientX), e.clientY - (dragging.downY ?? e.clientY)) > 6;
    if (dragging.ring !== null) {
      const ring = dragging.ring;
      dragging.ring = null;
      retarget();
      if (moved) onPick?.(ring, "drag");
    }
    if (!moved && dragging.downHit !== undefined && dragging.downHit !== null) {
      const hit = pick(e.clientX, e.clientY);
      if (hit === dragging.downHit) onPick?.(hit, "tap");
    }
    dragging.downHit = null;
  }

  function onPointerLeave() {
    loupe.hover = null;
    if (state.hovered !== null) {
      state.hovered = null;
      onHover?.(null);
      retarget();
    }
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);

  function onLostContext(e) {
    e.preventDefault();
    cancelAnimationFrame(raf);
    running = false;
    onLost?.();
  }
  canvas.addEventListener("webglcontextlost", onLostContext);

  // ---------------------------------------------------------------- public API
  return {
    resize(w, h, dpr) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      state.narrow = isNarrow(width, height);
      pixelRatio = pixelRatio === null ? (integrated ? Math.min(dpr, 1) : dpr) : Math.min(pixelRatio, dpr);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      retarget();
      wake();
    },
    setScroll(value) {
      if (Math.abs(value - state.scroll) < 1e-4) return;
      state.scroll = value;
      retarget();
    },
    setState(next) {
      const caseChanged = next.caseId !== undefined && next.caseId !== state.caseId;
      const chapterChanged = next.chapter !== undefined && next.chapter !== state.chapter;
      // The lamp drifts on its own only in the opening view; elsewhere it stays where the reader left it.
      if (chapterChanged && next.chapter !== "hero") lampDriftUntil = 0;
      if (chapterChanged && LAMP[next.chapter]) {
        lamp.az.set(LAMP[next.chapter][0]);
        lamp.el.set(LAMP[next.chapter][1]);
      }
      Object.assign(state, next);
      if (caseChanged || chapterChanged) updateCaseTextures();
      retarget();
    },
    /** The leftmost x (CSS pixels in the canvas) a leader line may end at: the text column's edge. */
    setLeaderMinX(x) {
      leaderMinX = x;
      wake();
    },
    /** Moves the lamp from a slider: angle in degrees around the seal, height 0 (grazing) to 1 (overhead). */
    setLamp(angle, heightFraction) {
      lamp.az.set(angle);
      lamp.el.set(8 + heightFraction * 60);
      lampDriftUntil = 0;
      wake();
    },
    /** A slow drift of the lamp for a while, so a still page keeps a little light moving. */
    drift(ms) {
      if (reducedMotion || state.chapter !== "hero") return;
      lampDriftUntil = performance.now() + ms;
      wake();
    },
    /** Pretends a drag on the out-of-register ring, for keyboard and touch users: it turns, then returns. */
    nudge(direction = 1) {
      const seal = state.caseId ? caseSeal(state.caseId) : null;
      if (!seal) return;
      const ring = rings[seal.rings[1]];
      ring.rot.v += direction * 2.6;
      wake();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onLostContext);
      for (const p of pieces) {
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      }
      plate.geometry.dispose();
      plateMat.dispose();
      atlas.texture.dispose();
      numeralTex.dispose();
      latentTex.dispose();
      recordTex.forEach((t) => t.dispose());
      loupe.rt.dispose();
      loupeMesh.geometry.dispose();
      loupeMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
