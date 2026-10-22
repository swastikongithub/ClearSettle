"use client";

// The seal printed: the same engraving, in ink on the security tint, as if the die had been pressed onto the page.

import { useEffect, useRef } from "react";
import { drawSeal } from "./still";

export default function PrintImpression({ className }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    let frame = 0;
    // Drawn only as it comes near the window: it is below the fold, and rasterizing it while the page loads would
    // compete with the scene above.
    let near = typeof IntersectionObserver === "undefined";
    let drawn = "";
    const draw = () => {
      frame = 0;
      const size = canvas.clientWidth;
      const key = `${size}/${document.fonts?.status}`;
      if (!near || !size || key === drawn) return;
      drawn = key;
      drawSeal(canvas, { cx: size / 2, cy: size / 2, radius: size * 0.485, squash: 1, tilt: 0 }, {}, "ink");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const io = near
      ? null
      : new IntersectionObserver(
          ([entry]) => {
            near = entry.isIntersecting;
            schedule();
          },
          { rootMargin: "50% 0px" },
        );
    io?.observe(canvas);
    document.fonts?.ready.then(schedule);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    ro?.observe(canvas);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      io?.disconnect();
      ro?.disconnect();
    };
  }, []);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
