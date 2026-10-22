// Geometry for the seal: each ring is a machined annulus (inner wall, chamfer, top face, chamfer, outer wall)
// revolved around the seal's axis. Positions are recomputed in the vertex shader from aPolar, so a ring can turn,
// lift and unroll without new geometry.

import { BufferAttribute, BufferGeometry, Sphere, Vector3 } from "three";

const face = (ra, za, rb, zb, nr, nz, kind, steps = 1) => ({ ra, za, rb, zb, nr, nz, kind, steps });

/** A ring's profile from its inner wall to its outer wall. */
export function ringProfile(r0, r1, z, base, bevel) {
  const k = Math.SQRT1_2;
  return [
    face(r0, base, r0, z - bevel, -1, 0, 2),
    face(r0, z - bevel, r0 + bevel, z, -k, k, 1),
    face(r0 + bevel, z, r1 - bevel, z, 0, 1, 0, 6),
    face(r1 - bevel, z, r1, z - bevel, k, k, 1),
    face(r1, z - bevel, r1, base, 1, 0, 2),
  ];
}

/** The medallion: a domed disc with a chamfered edge. */
export function medallionProfile(r1, z, base, bevel) {
  const k = Math.SQRT1_2;
  return [
    face(0.0005, z, r1 - bevel, z, 0, 1, 0, 24),
    face(r1 - bevel, z, r1, z - bevel, k, k, 1),
    face(r1, z - bevel, r1, base, 1, 0, 2),
  ];
}

/**
 * Revolves a profile around the z axis. Each face gets its own vertices, so edges stay crisp. The seam column is
 * duplicated (turn 0 and turn 1) so a ring can be cut there and unrolled.
 */
export function revolve(profile, segments) {
  const positions = [];
  const polar = [];
  const profN = [];
  const faces = [];
  const index = [];
  let base = 0;
  for (const f of profile) {
    const rows = f.steps + 1;
    for (let i = 0; i < rows; i++) {
      const t = i / f.steps;
      const r = f.ra + (f.rb - f.ra) * t;
      const z = f.za + (f.zb - f.za) * t;
      for (let j = 0; j <= segments; j++) {
        const u = j / segments;
        const a = u * Math.PI * 2;
        positions.push(r * Math.cos(a), r * Math.sin(a), z);
        polar.push(r, u);
        profN.push(f.nr, f.nz);
        faces.push(f.kind);
      }
    }
    for (let i = 0; i < f.steps; i++) {
      for (let j = 0; j < segments; j++) {
        const a = base + i * (segments + 1) + j;
        const b = a + segments + 1;
        index.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    base += rows * (segments + 1);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute("aPolar", new BufferAttribute(new Float32Array(polar), 2));
  g.setAttribute("aProfN", new BufferAttribute(new Float32Array(profN), 2));
  g.setAttribute("aFace", new BufferAttribute(new Float32Array(faces), 1));
  g.setIndex(base > 65535 ? new BufferAttribute(new Uint32Array(index), 1) : new BufferAttribute(new Uint16Array(index), 1));
  // The shader moves vertices (lift, unroll), so the bounds are set wide rather than computed.
  g.boundingSphere = new Sphere(new Vector3(0, 0, 0), 4);
  return g;
}

/** The plate the seal is set into: a wide turned disc with a well, the well's wall and its floor. */
export function plateGeometry(well, depth, outer, segments) {
  const positions = [];
  const normals = [];
  const index = [];
  let base = 0;
  const ring = (ra, rb, za, zb, nx, nz, rows) => {
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      const r = ra + (rb - ra) * Math.pow(t, 1.6);
      const z = za + (zb - za) * t;
      for (let j = 0; j <= segments; j++) {
        const a = (j / segments) * Math.PI * 2;
        positions.push(r * Math.cos(a), r * Math.sin(a), z);
        normals.push(nx * Math.cos(a), nx * Math.sin(a), nz);
      }
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < segments; j++) {
        const a = base + i * (segments + 1) + j;
        const b = a + segments + 1;
        index.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    base += (rows + 1) * (segments + 1);
  };
  ring(0.001, well, -depth, -depth, 0, 1, 2);
  ring(well, well, -depth, 0, -1, 0, 1);
  ring(well, outer, 0, 0, 0, 1, 12);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  g.setIndex(new BufferAttribute(base > 65535 ? new Uint32Array(index) : new Uint16Array(index), 1));
  g.computeBoundingSphere();
  return g;
}
