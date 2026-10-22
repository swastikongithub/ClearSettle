// GLSL for the Intaglio seal. The engraving is computed per pixel from the guilloché equations, so it stays sharp at
// any distance and needs no texture for its lines. Line coverage is anti-aliased against the pixel footprint: an
// aliased line pattern would draw moiré of its own, and on this page moiré means a record that does not agree.

const COMMON = /* glsl */ `
#ifndef PI
#define PI 3.141592653589793
#endif
#define TAU 6.283185307179586

uniform vec3 uLampPos;
uniform float uLamp;
uniform float uTime;
uniform vec4 uShadowRings[7];   // r0, r1, top z (world), casts (0/1)
uniform float uShadowOn;
uniform float uGrazing;          // 0 lamp high, 1 lamp low across the plate

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// The studio: a dark room, a long softbox above and behind the lamp, a faint fill from the right, and a cool floor
// bounce. Evaluated analytically, so reflections need no environment texture; roughness widens each source.
vec3 studio(vec3 R, float rough) {
  float up = R.z;
  vec3 col = mix(vec3(0.004, 0.005, 0.006), vec3(0.020, 0.024, 0.028), smoothstep(-0.3, 0.9, up));
  vec3 kd = normalize(vec3(-0.55, -0.25, 0.80));
  vec3 ka = normalize(vec3(0.42, -0.9, 0.0));
  float along = dot(R, ka);
  vec3 perp = R - ka * along;
  float k = dot(normalize(perp + 1e-5), kd);
  float w = 0.004 + rough * 0.22;
  col += vec3(1.0, 0.985, 0.96) * 3.2 * smoothstep(1.0 - 0.012 - w, 1.0 - 0.002, k) * smoothstep(0.85, 0.2, abs(along));
  vec3 fd = normalize(vec3(0.85, 0.1, 0.52));
  col += vec3(0.62, 0.70, 0.78) * 0.55 * smoothstep(1.0 - 0.05 - w, 1.0, dot(R, fd));
  col += vec3(0.05, 0.065, 0.075) * smoothstep(0.2, -0.6, up);
  return col;
}

// Anisotropic GGX (Burley), with the long axis across the grooves: light streaks perpendicular to the cut.
float ggxAniso(float NoH, float ToH, float BoH, float at, float ab) {
  float a2 = at * ab;
  vec3 v = vec3(ab * ToH, at * BoH, a2 * NoH);
  float v2 = dot(v, v);
  float w2 = a2 / v2;
  return a2 * w2 * w2 / PI;
}

float visSmith(float NoV, float NoL, float a) {
  float k = a * 0.5;
  return 0.25 / ((NoV * (1.0 - k) + k) * (NoL * (1.0 - k) + k));
}

// Soft shadows from the rings above a point, toward the lamp. The rings are annuli, so each test is exact:
// intersect the ray with the ring's top plane and check the radius.
float ringShadow(vec3 P, vec3 L, float selfIndex) {
  if (uShadowOn < 0.5) return 1.0;
  float lit = 1.0;
  for (int i = 0; i < 7; i++) {
    vec4 ring = uShadowRings[i];
    if (ring.w < 0.5 || float(i) == selfIndex) continue;
    float dz = ring.z - P.z;
    if (dz <= 0.002 || L.z <= 0.01) continue;
    float t = dz / L.z;
    vec2 q = P.xy + L.xy * t;
    float rq = length(q);
    float pen = 0.004 + t * 0.06;
    float inside = smoothstep(ring.x - pen, ring.x + pen, rq) * (1.0 - smoothstep(ring.y - pen, ring.y + pen, rq));
    lit *= 1.0 - inside * 0.92;
  }
  return lit;
}
`;

export const RING_VERTEX = /* glsl */ `
attribute vec2 aPolar;   // r, turn (0..1) in the ring's own frame
attribute vec2 aProfN;   // profile normal: radial, up
attribute float aFace;   // 0 top, 1 chamfer, 2 wall

uniform float uRot;
uniform float uLift;
uniform float uBend;     // 0 ring, 1 straight
uniform float uStrip;    // 0 in the seal, 1 at the evidence position
uniform float uRm;       // the ring's middle radius
uniform float uStripScale;
uniform vec3 uStripPos;

varying vec2 vPolar;
varying vec3 vWorld;
varying vec3 vN;
varying vec3 vT;
varying vec3 vO;
varying float vFace;
varying vec3 vLocal;

void main() {
  float r = aPolar.x;
  float u = aPolar.y;
  float z = position.z;

  // Unrolling: the ring is cut at its anchor (turn 0.5) and its curvature relaxes to zero while every arc keeps its
  // length, so the engraving deforms with the steel instead of sliding over it.
  float thA = PI + uRot;
  vec2 nA = vec2(cos(thA), sin(thA));
  vec2 tA = vec2(-nA.y, nA.x);
  vec2 inw = -nA;
  vec2 A = uRm * nA;
  float c = (1.0 / uRm) * (1.0 - uBend);
  float s = (u - 0.5) * TAU * uRm;
  float d = r - uRm;
  float phi = s * c;
  vec2 P = c < 1e-5 ? vec2(s, 0.0) : vec2(sin(phi) / c, (1.0 - cos(phi)) / c);
  vec2 outw = vec2(sin(phi), -cos(phi));
  vec2 Q = P + d * outw;
  float along = Q.x * mix(1.0, uStripScale, uStrip);
  vec2 rel = along * tA + Q.y * inw;
  vec2 xy = mix(A, uStripPos.xy, uStrip) + rel;
  vec3 local = vec3(xy, z + uLift + uStrip * uStripPos.z);

  vec2 T2 = cos(phi) * tA + sin(phi) * inw;
  vec2 O2 = outw.x * tA + outw.y * inw;
  vec3 n = aProfN.x * vec3(O2, 0.0) + aProfN.y * vec3(0.0, 0.0, 1.0);

  vec4 world = modelMatrix * vec4(local, 1.0);
  vWorld = world.xyz;
  vLocal = local;
  vN = normalize(mat3(modelMatrix) * n);
  vT = normalize(mat3(modelMatrix) * vec3(T2, 0.0));
  vO = normalize(mat3(modelMatrix) * vec3(O2, 0.0));
  vPolar = aPolar;
  vFace = aFace;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const RING_FRAGMENT = /* glsl */ `
uniform float uIndex;
uniform float uR0;
uniform float uR1;
uniform float uBevel;
uniform vec4 uPat;          // petals, harmonic, harmonic gain, lines
uniform vec2 uPat2;         // twist, phase
uniform float uKind;        // 0 ring, 1 medallion
uniform float uSel;
uniform float uHover;
uniform float uDim;
uniform float uMoire;
uniform vec2 uMoireShift;
uniform float uLit;
uniform float uReveal;      // 0..1 cut progress during the opening
uniform sampler2D uMicro;
uniform vec3 uMicroInfo;    // row, rows, repeats per turn
uniform float uMicroOn;
uniform vec4 uDivA;
uniform vec4 uDivB;
uniform vec4 uKindA;
uniform vec4 uKindB;
uniform vec2 uGrad;         // count, marked index (-1: none)
uniform float uGradLit;
uniform sampler2D uLatent;
uniform vec3 uLatentBox;    // turn from, turn to, enabled
uniform sampler2D uNumerals;
uniform float uNumeralsOn;
uniform sampler2D uRecord;
uniform float uRecordMix;
uniform float uStripView;
uniform vec3 uSteel;
uniform vec3 uInkA;
uniform vec3 uInkB;
uniform vec3 uBeam;
uniform vec3 uOpen;
uniform float uOpenGlow;

varying vec2 vPolar;
varying vec3 vWorld;
varying vec3 vN;
varying vec3 vT;
varying vec3 vO;
varying float vFace;
varying vec3 vLocal;


// Nearest line of the ring's guilloché family; returns distance and the unit gradient (radial, tangential).
vec3 guilloche(float r, float th, float rc, float hw, vec4 pat, vec2 pat2) {
  float p = pat.x;
  float q = pat.y;
  float g = pat.z;
  float n = pat.w;
  float A = hw * 0.8 / (1.0 + g);
  float best = 1e9;
  vec2 grad = vec2(1.0, 0.0);
  // Lines are spread evenly over part of a period (a third per step of twist): a lattice, not a rope. The sines of
  // pθ + φj and qθ + φj/2 come from angle addition, with (cos φj, sin φj) rotated from line to line, so the loop runs
  // without a single trigonometric call: what makes the engraving affordable on integrated GPUs.
  float step1 = TAU / n * (pat2.x / 3.0);
  vec2 s1 = vec2(cos(p * th + pat2.y), sin(p * th + pat2.y));
  vec2 s2 = vec2(cos(q * th + pat2.y * 0.5), sin(q * th + pat2.y * 0.5));
  vec2 rot1 = vec2(cos(step1), sin(step1));
  vec2 rot2 = vec2(cos(step1 * 0.5), sin(step1 * 0.5));
  float pr = p / max(r, 1e-3);
  float qr = g * q / max(r, 1e-3);
  for (int j = 0; j < 16; j++) {
    if (float(j) >= n) break;
    float fj = n > 1.0 ? float(j) / (n - 1.0) : 0.5;
    float base = rc + (fj - 0.5) * hw * 0.16;
    float w = s1.y + g * s2.y;
    float dw = pr * s1.x + qr * s2.x;
    for (int k = 0; k < 2; k++) {
      float sg = k == 0 ? 1.0 : -1.0;
      float f = r - base - sg * A * w;
      vec2 gr = vec2(1.0, -sg * A * dw);
      float len = length(gr);
      float dist = abs(f) / len;
      if (dist < best) { best = dist; grad = (gr / len) * sign(f); }
    }
    s1 = vec2(s1.x * rot1.x - s1.y * rot1.y, s1.y * rot1.x + s1.x * rot1.y);
    s2 = vec2(s2.x * rot2.x - s2.y * rot2.y, s2.y * rot2.x + s2.x * rot2.y);
  }
  return vec3(best, grad);
}

float lineCover(float dist, float halfWidth, float fw) {
  float c = 1.0 - smoothstep(halfWidth - fw, halfWidth + fw, dist);
  return c * min(1.0, halfWidth / fw);
}

float arcKind(float u) {
  float kind = uKindA.x;
  if (uDivA.y >= 0.0 && u >= uDivA.y) kind = uKindA.y;
  if (uDivA.z >= 0.0 && u >= uDivA.z) kind = uKindA.z;
  if (uDivA.w >= 0.0 && u >= uDivA.w) kind = uKindA.w;
  if (uDivB.x >= 0.0 && u >= uDivB.x) kind = uKindB.x;
  if (uDivB.y >= 0.0 && u >= uDivB.y) kind = uKindB.y;
  if (uDivB.z >= 0.0 && u >= uDivB.z) kind = uKindB.z;
  if (uDivB.w >= 0.0 && u >= uDivB.w) kind = uKindB.w;
  return kind;
}

float divisionDist(float u, float r) {
  float best = 1e9;
  vec4 a = uDivA;
  vec4 b = uDivB;
  for (int i = 0; i < 4; i++) {
    float ba = a[i];
    float bb = b[i];
    if (ba >= 0.0) best = min(best, abs(fract(u - ba + 0.5) - 0.5) * TAU * r);
    if (bb >= 0.0) best = min(best, abs(fract(u - bb + 0.5) - 0.5) * TAU * r);
  }
  return best;
}

void main() {
  float r = vPolar.x;
  float u = vPolar.y;
  float th = u * TAU;
  vec3 N = normalize(vN);
  vec3 T = normalize(vT);
  vec3 O = normalize(vO);
  vec3 V = normalize(cameraPosition - vWorld);
  float fw = max(length(fwidth(vWorld)) * 0.62, 1e-5);
  bool top = vFace < 0.5;

  float cavity = 0.0;          // 0 polished steel, 1 engraved groove
  vec2 tilt = vec2(0.0);       // normal tilt in (radial, tangential)
  float anisoRadial = 0.0;     // 1: grooves run radially (latent image, hatching)
  float emissive = 0.0;
  float ink = 0.0;             // colour-shifting ink on the medallion numerals
  float openNotch = 0.0;

  float rTop0 = uR0 + uBevel;
  float rTop1 = uR1 - uBevel;

  if (top) {
    float microH = uKind > 0.5 ? 0.0105 : 0.0125;
    float microR0 = rTop1 - microH - 0.0035;
    float gr0 = rTop0 + (uKind > 0.5 ? 0.0 : 0.006);
    float gr1 = microR0 - 0.0045;
    float rc = 0.5 * (gr0 + gr1);
    float hw = 0.5 * (gr1 - gr0);
    float revealCut = 1.0 - smoothstep(uReveal * 1.08 - 0.08, uReveal * 1.08, fract(u + 0.25));

    // 1. The guilloché, or the arc's own hatching where a division marks a component.
    float kind = uKind > 0.5 ? 3.0 : arcKind(u);
    float lat = 0.0;
    bool inLatent = uLatentBox.z > 0.5 && uRecordMix < 0.01 && u > uLatentBox.x && u < uLatentBox.y && r > gr0 && r < gr1;
    if (inLatent) {
      vec2 luv = vec2((u - uLatentBox.x) / (uLatentBox.y - uLatentBox.x), (r - gr0) / (gr1 - gr0));
      lat = texture2D(uLatent, vec2(luv.x, 1.0 - luv.y)).a;
      // The latent field: concentric cuts around the letters, radial cuts inside them, at one pitch, so the reference
      // has the same tone as its surroundings and shows only when a low light catches one direction and not the other.
      kind = lat > 0.5 ? 1.0 : 2.0;
    }
    float latentWeight = inLatent && lat > 0.5 ? uGrazing : 1.0;
    if (r > gr0 - 0.002 && r < gr1 + 0.002) {
      float hl = 0.00105;
      if (kind > 2.5) {
        // Sunburst: fine radial cuts that fade toward the centre.
        float count = 540.0;
        float d = abs(fract(u * count) - 0.5) / count * TAU * r;
        float cov = lineCover(d, 0.0007, fw) * smoothstep(0.02, 0.12, r);
        cavity = max(cavity, cov * 0.55 * revealCut);
        anisoRadial = 1.0;
      } else if (kind < 0.5) {
        vec3 gl = guilloche(r, th, rc, hw, uPat, uPat2);
        float cov = lineCover(gl.x, hl, fw);
        float keep = 1.0 - uMoire * (1.0 - uRecordMix);
        cavity = max(cavity, cov * revealCut * keep);
        tilt += -gl.yz * cov * 0.75 * min(1.0, hl / fw) * revealCut * keep;
        float moireAmt = uMoire * (1.0 - uRecordMix);
        if (moireAmt > 0.001) {
          float pitch = 0.0085;
          float d1 = abs(fract((r - gr0) / pitch) - 0.5) * pitch;
          vec2 p2 = vec2(cos(th), sin(th)) * r - uMoireShift;
          float d2 = abs(fract((length(p2) - gr0) / pitch) - 0.5) * pitch;
          float c1 = lineCover(d1, pitch * 0.3, fw);
          float c2 = lineCover(d2, pitch * 0.3, fw);
          float grating = 1.0 - (1.0 - c1) * (1.0 - c2);
          cavity = max(cavity, grating * moireAmt);
        }
      } else {
        // Radial hatching (components, credits, the latent image): fine cuts across the band.
        float pitch = inLatent ? 0.0036 : (kind > 1.5 ? 0.0032 : 0.0042);
        float dist;
        if (kind > 1.5) {
          dist = abs(fract((r - gr0) / pitch) - 0.5) * pitch;
        } else {
          float count = floor(TAU * rc / pitch);
          dist = abs(fract(u * count) - 0.5) / count * TAU * r;
          // In the latent letters the cut runs radially, but the light only finds it when it comes in low.
          anisoRadial = latentWeight;
        }
        float cov = lineCover(dist, pitch * 0.28, fw);
        cavity = max(cavity, cov * revealCut * (inLatent ? 0.3 : 0.7));
        if (kind > 1.5) anisoRadial = 0.0;
      }
    }

    // 2. Microtext: the record itself, engraved as a line that reads only from close by.
    if (uMicroOn > 0.5 && r > microR0 && r < microR0 + microH) {
      float v = (r - microR0) / microH;
      float row = uMicroInfo.x;
      float rows = uMicroInfo.y;
      vec2 muv = vec2(u * uMicroInfo.z, 1.0 - (row + v) / rows);
      float a = texture2D(uMicro, muv).a;
      cavity = max(cavity, a * 0.9 * revealCut);
    }

    // 3. Divisions: the record's own amounts, cut as radial lines.
    if (uKind < 0.5) {
      float dd = divisionDist(u, r);
      float dc = lineCover(dd, 0.0016, fw) * step(gr0 - 0.004, r) * step(r, rTop1);
      cavity = max(cavity, dc);
    }

    // 4. Graduations: one per settlement line in a payout, one of them this payment's.
    if (uGrad.x > 0.5 && r < gr0 + 0.026 && r > rTop0) {
      float count = uGrad.x;
      float tick = abs(fract(u * count + 0.5) - 0.5) / count * TAU * r;
      float idx = floor(u * count + 0.5);
      if (idx >= count) idx = 0.0;
      bool marked = abs(idx - uGrad.y) < 0.5;
      float len = marked ? 0.034 : 0.016;
      float tc = lineCover(tick, marked ? 0.0021 : 0.0013, fw) * step(r, rTop0 + len);
      cavity = max(cavity, tc);
      if (marked) emissive += tc * uGradLit * 1.6;
    }

    // 5. The registration notch at turn 0: a deep radial cut; lit when every ring is in register.
    if (uKind < 0.5) {
      float nd = abs(fract(u + 0.5) - 0.5) * TAU * r;
      float notch = lineCover(nd, 0.0042, fw);
      cavity = max(cavity, notch);
      float core = exp(-pow(nd / 0.0015, 2.0));
      float halo = exp(-pow(nd / 0.0075, 2.0));
      float travel = 0.55 + 0.45 * sin(r * 34.0 - uTime * 4.2);
      emissive += (core * (1.6 + travel) + halo * 0.35) * uLit;
      openNotch = (core * 1.4 + halo * 0.5) * uOpenGlow;
    }

    // 6. The medallion's raised numerals, in colour-shifting ink.
    if (uKind > 0.5 && uNumeralsOn > 0.5) {
      vec2 nuv = vLocal.xy / (2.0 * uR1) + 0.5;
      float e = 1.6 / 1024.0;
      float h = texture2D(uNumerals, nuv).a;
      float hx = texture2D(uNumerals, nuv + vec2(e, 0.0)).a - texture2D(uNumerals, nuv - vec2(e, 0.0)).a;
      float hy = texture2D(uNumerals, nuv + vec2(0.0, e)).a - texture2D(uNumerals, nuv - vec2(0.0, e)).a;
      vec3 gx = vec3(1.0, 0.0, 0.0);
      vec3 gy = vec3(0.0, 1.0, 0.0);
      N = normalize(N - (gx * hx + gy * hy) * 3.2);
      ink = smoothstep(0.35, 0.75, h);
      cavity *= 1.0 - ink;
    }
  }

  // Strips in the evidence view show the record engraved in plain type.
  if (top && uRecordMix > 0.001) {
    float v = (r - rTop0) / (rTop1 - rTop0);
    float a = texture2D(uRecord, vec2(u, 1.0 - v)).a;
    cavity = mix(cavity * (1.0 - uRecordMix * 0.85), max(cavity * 0.15, a), uRecordMix);
    tilt *= 1.0 - uRecordMix * 0.8;
  }

  // Groove walls tilt the normal; the tilt fades with the line coverage, so distant engraving does not sparkle.
  vec3 tangential = T;
  vec3 radial = O;
  if (top) N = normalize(N + radial * tilt.x + tangential * tilt.y);

  vec3 L = normalize(uLampPos - vWorld);
  vec3 H = normalize(L + V);
  float NoL = max(dot(N, L), 0.0);
  float NoV = max(dot(N, V), 1e-3);
  float NoH = max(dot(N, H), 0.0);
  float VoH = max(dot(V, H), 0.0);

  // Turned steel: grooves run around the ring, so highlights streak across them, radially.
  vec3 grooveDir = normalize(mix(tangential, radial, anisoRadial));
  if (!top) grooveDir = vec3(0.0, 0.0, 1.0);
  vec3 Tg = normalize(grooveDir - N * dot(grooveDir, N));
  vec3 Bg = cross(N, Tg);
  float baseRough = top ? 0.2 : 0.34;
  float at = top ? 0.05 : 0.18;
  float ab = top ? 0.42 : 0.3;
  at = mix(at, 0.5, cavity);
  ab = mix(ab, 0.6, cavity);

  vec3 F0 = uSteel;
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - VoH, 5.0);
  float D = ggxAniso(NoH, dot(Tg, H), dot(Bg, H), at, ab);
  float Vis = visSmith(NoV, NoL, sqrt(at * ab));
  float dist = length(uLampPos - vWorld);
  float falloff = 9.0 / (1.0 + dist * dist * 0.35);
  float sh = ringShadow(vWorld, L, uIndex);
  vec3 lampSpec = D * Vis * F * NoL * falloff * uLamp * sh;
  vec3 lampDiff = vec3(0.012) * NoL * falloff * uLamp * sh;

  // Reflections, bent toward the groove direction as brushed metal does.
  vec3 anisoDir = Bg;
  vec3 anisoT = cross(anisoDir, V);
  vec3 anisoN = cross(anisoT, anisoDir);
  vec3 bent = normalize(mix(N, anisoN, top ? 0.55 : 0.2));
  vec3 R = reflect(-V, bent);
  vec3 Fv = F0 + (1.0 - F0) * pow(1.0 - NoV, 5.0);
  vec3 env = studio(R, baseRough + cavity * 0.5) * Fv;

  // Ambient occlusion where a ring meets the step to its higher neighbour, and inside every groove.
  float ao = 1.0;
  if (top) ao *= 1.0 - 0.32 * exp(-(r - uR0) / 0.012) * step(0.5, 1.0 - uStripView);
  if (!top) ao *= 0.55 + 0.45 * smoothstep(-0.03, 0.03, vLocal.z);

  vec3 steelCol = lampSpec + env * ao + lampDiff + vec3(0.16, 0.17, 0.18) * uRecordMix;
  vec3 grooveCol = vec3(0.006, 0.007, 0.008) + lampSpec * 0.08 + env * 0.06;
  vec3 col = mix(steelCol, grooveCol, cavity * 0.92);

  // The medallion's ink: green face-on, turning to blue as the angle grows; lit by the lamp like a metallic ink.
  if (ink > 0.001) {
    float shift = smoothstep(0.25, 0.9, 1.0 - NoV + 0.35 * (1.0 - dot(R, L)));
    vec3 inkCol = mix(uInkA, uInkB, shift);
    vec3 inkLit = inkCol * (0.22 + 0.55 * NoL * falloff * 0.25 * uLamp) + inkCol * D * Vis * NoL * falloff * 0.9 * uLamp + studio(R, 0.25) * inkCol * 1.4;
    col = mix(col, inkLit, ink);
  }

  // The registration line, and the marked graduation, glow from within the cut.
  col += uBeam * emissive * (0.6 + 0.4 * uLamp);
  col += uOpen * openNotch * 2.2;

  // Selection: a fine bright edge on the chamfers and a lift in the steel.
  if (vFace > 0.5 && vFace < 1.5) col += vec3(0.85, 0.9, 0.95) * 0.35 * max(uSel, uHover * 0.6);
  col *= 1.0 + 0.18 * uSel;

  // An open difference: the out-of-register ring carries a faint warm cast in its cuts.
  col += uOpen * uOpenGlow * cavity * 0.1;

  // Rings that a difference does not involve sink back and grey out.
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, vec3(lum) * 0.45, uDim * 0.7) * (1.0 - 0.9 * uDim);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <dithering_fragment>
}
`;

export const PLATE_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vN;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vLocal = position;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const PLATE_FRAGMENT = /* glsl */ `
uniform vec3 uSteel;
uniform float uWell;          // radius of the well the seal sits in
uniform float uUnderprint;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vN;


void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float r = length(vLocal.xy);
  float th = atan(vLocal.y, vLocal.x);
  bool floorFace = vLocal.z < -0.001 && N.z > 0.5;
  bool wall = N.z < 0.5;
  float fw = max(length(fwidth(vWorld)) * 0.62, 1e-5);

  // Lathe-turned plate: fine circular tool marks, slightly irregular.
  float marks = sin(r * 2400.0 + hash12(vec2(floor(r * 700.0), 1.0)) * 6.0);
  float markAmp = min(1.0, 0.0006 / fw);
  vec3 tang = normalize(vec3(-sin(th), cos(th), 0.0));
  vec3 rad = normalize(vec3(cos(th), sin(th), 0.0));
  if (!wall) N = normalize(N + rad * marks * 0.03 * markAmp);

  // A faint rose-engine underprint in the plate around the seal, fading outward.
  float under = 0.0;
  if (!wall && !floorFace && uUnderprint > 0.0) {
    float band = smoothstep(uWell + 0.02, uWell + 0.08, r) * (1.0 - smoothstep(uWell + 0.9, uWell + 2.6, r));
    float wave = r + 0.018 * sin(th * 72.0 + r * 9.0) + 0.012 * sin(th * 30.0 - r * 5.0);
    float d = abs(fract(wave / 0.016) - 0.5) * 0.016;
    under = (1.0 - smoothstep(0.0011 - fw, 0.0011 + fw, d)) * min(1.0, 0.0011 / fw) * band * uUnderprint;
  }

  vec3 L = normalize(uLampPos - vWorld);
  vec3 H = normalize(L + V);
  float NoL = max(dot(N, L), 0.0);
  float NoV = max(dot(N, V), 1e-3);
  float NoH = max(dot(N, H), 0.0);
  float VoH = max(dot(V, H), 0.0);
  vec3 Tg = normalize(tang - N * dot(tang, N));
  vec3 Bg = cross(N, Tg);
  float at = wall ? 0.2 : 0.07;
  float ab = wall ? 0.3 : 0.5;
  vec3 F = uSteel + (1.0 - uSteel) * pow(1.0 - VoH, 5.0);
  float D = ggxAniso(NoH, dot(Tg, H), dot(Bg, H), at, ab);
  float Vis = visSmith(NoV, NoL, sqrt(at * ab));
  float dist = length(uLampPos - vWorld);
  float falloff = 9.0 / (1.0 + dist * dist * 0.35);
  float sh = ringShadow(vWorld, L, -1.0);
  vec3 spec = D * Vis * F * NoL * falloff * uLamp * sh;

  vec3 anisoT = cross(Bg, V);
  vec3 anisoN = cross(anisoT, Bg);
  vec3 R = reflect(-V, normalize(mix(N, anisoN, 0.45)));
  vec3 Fv = uSteel + (1.0 - uSteel) * pow(1.0 - NoV, 5.0);
  vec3 env = studio(R, 0.3) * Fv;

  vec3 col = spec * 0.9 + env * 0.7;
  col = mix(col, vec3(0.006, 0.007, 0.008) + spec * 0.05, under * 0.8);

  // The well under the seal is dark; its wall catches a little light.
  if (floorFace) col *= 0.25 * sh;
  if (wall) col *= 0.6;

  // Fall away from the seal, so the plate reads as one object in a dark room.
  col *= 1.0 - smoothstep(1.6, 5.5, r) * 0.88;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <dithering_fragment>
}
`;

export const SHADER_COMMON = COMMON;

export const LOUPE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const LOUPE_FRAGMENT = /* glsl */ `
uniform sampler2D uView;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec2 c = vUv - 0.5;
  float d = length(c) * 2.0;
  if (d > 1.0) discard;
  // A slight barrel at the edge of the glass, and a little dispersion where the lens is thickest.
  vec2 uv = 0.5 + c * (1.0 - 0.18 * d * d);
  vec3 col;
  col.r = texture2D(uView, 0.5 + (uv - 0.5) * 1.004).r;
  col.g = texture2D(uView, uv).g;
  col.b = texture2D(uView, 0.5 + (uv - 0.5) * 0.996).b;
  col *= 1.0 - 0.55 * smoothstep(0.78, 1.0, d);
  // The brass rim and a highlight on the glass.
  float rim = smoothstep(0.93, 0.965, d) * (1.0 - smoothstep(0.985, 1.0, d));
  col = mix(col, vec3(0.62, 0.52, 0.32) * (0.6 + 0.4 * (0.5 - c.y)), rim);
  float glint = exp(-pow(length(c - vec2(-0.2, 0.24)) / 0.12, 2.0)) * 0.08;
  col += glint;
  gl_FragColor = vec4(col, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
