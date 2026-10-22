// Decides whether to load the WebGL scene at all, before any three.js code is downloaded. The scene needs
// WebGL 2 drawn by a GPU: software rendering would be slow enough to make the page worse than the still.

// Integrated laptop GPUs start the scene at one drawing pixel per CSS pixel instead of adapting down to it.
const INTEGRATED = /intel|uhd graphics|iris|hd graphics|radeon\(tm\) graphics|vega \d+ graphics|mali|adreno|powervr/i;

/** { tier: "gl" | "still", integrated } */
export function webglTier() {
  const still = { tier: "still", integrated: false };
  if (typeof window === "undefined") return still;
  if (navigator.connection?.saveData) return still;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return still;
    // Some browsers hand out a software renderer even when asked to fail on one; the seal would crawl on it.
    // Firefox reports the renderer directly (and deprecates the extension); Chromium and Safari need the extension.
    let renderer = String(gl.getParameter(gl.RENDERER));
    if (/^webkit webgl$/i.test(renderer)) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    }
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return still;
    return { tier: "gl", integrated: INTEGRATED.test(renderer) };
  } catch {
    return still;
  }
}
