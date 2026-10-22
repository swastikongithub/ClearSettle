"use client";

// The interactive part of /welcome/ (D-UI-15): the seal behind the page, the hero, "the seal" (explore the rings)
// and "a difference" (investigate a case, then read its evidence). The page's state lives here and drives both the
// WebGL scene and the 2D still; every action in the artwork also exists as an ordinary control.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CASES, caseDifference, inr } from "../../lib/landingExample.mjs";
import { RINGS, RING_NOTES, caseSeal } from "../../lib/intaglioSeal.mjs";
import { webglTier } from "./gl/probe";
import { stillFrame } from "./poses";
import { RecordView } from "./records";
import { drawSeal } from "./still";
import s from "./intaglio.module.css";

const CHAPTERS = ["hero", "seal", "difference", "print"];
const STATUS = {
  explained: { label: "Explained", glyph: "M4 8.5l2.6 2.6L12 5.6" },
  agrees: { label: "Agrees", glyph: "M3.5 6.5h9M3.5 9.5h9" },
  open: { label: "Open", glyph: "M8 4v5M8 11.6v.4" },
};

function Status({ status }) {
  const st = STATUS[status];
  return (
    <span className={s.status} data-status={status}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d={st.glyph} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {st.label}
    </span>
  );
}

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const dpr = (narrow) => Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 1.6);
const stageBox = (el) => {
  const r = el?.getBoundingClientRect();
  return r && r.width > 0 ? { w: r.width, h: r.height } : { w: window.innerWidth, h: window.innerHeight };
};
// The stage covers the whole window on wide screens and only its top on narrow ones (see the CSS).
const pinnedTop = (el) => {
  const { h } = stageBox(el);
  return h < window.innerHeight - 1 ? h : 0;
};
// Leader lines run from the ring list to the rings and end at least this far right, clear of the text. (On narrow
// screens there are none: the list is below the stage.)
const leaderEdge = (stage, row) => (stage && row && !pinnedTop(stage) ? row.getBoundingClientRect().right + 34 - stage.getBoundingClientRect().left : 0);

/** Scroll position → a continuous chapter value (0 hero, 1 seal, 2 difference, 3 print), with holds while reading. */
function chapterValue(vh, stageTop) {
  // On narrow screens the stage covers the top of the window, so reading happens below it.
  const y = window.scrollY + stageTop;
  const at = (id) => {
    const el = document.getElementById(id);
    return el ? el.getBoundingClientRect().top + y : Infinity;
  };
  const seal = at("seal");
  const diff = at("difference");
  const print = at("today");
  const keys = [
    [0, 0],
    [seal - vh * 0.42, 1],
    [diff - vh * 0.8, 1],
    [diff - vh * 0.32, 2],
    [print - vh * 1.0, 2],
    [print - vh * 0.1, 3],
  ];
  if (y <= keys[0][0]) return 0;
  for (let i = 1; i < keys.length; i++) {
    const [y1, v1] = keys[i];
    const [y0, v0] = keys[i - 1];
    if (y <= y1) return y1 === y0 ? v1 : v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
  }
  return 3;
}

export default function SealExperience() {
  const stageRef = useRef(null);
  const glRef = useRef(null);
  const stillRef = useRef(null);
  const sceneRef = useRef(null);
  const leaderRefs = useRef([]);
  const rowRefs = useRef([]);
  const scrollRef = useRef(0);
  const evidenceRef = useRef(null);
  const [tier, setTier] = useState("pending");
  const [glVisible, setGlVisible] = useState(false);
  const [chapter, setChapter] = useState("hero");
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [caseId, setCaseId] = useState("short");
  const [applied, setApplied] = useState(false);
  const [evidence, setEvidence] = useState(false);
  const [message, setMessage] = useState("");
  const [lampAngle, setLampAngle] = useState(212);
  const [lampHeight, setLampHeight] = useState(0.45);
  const stateRef = useRef({});
  stateRef.current = { chapter, selected, caseId, applied, evidence };

  const current = CASES.find((c) => c.id === caseId);
  const seal = caseSeal(caseId);

  // ------------------------------------------------------------------ the still (first frame and fallback)
  const tierRef = useRef({ tier, live: false });
  tierRef.current = { tier, live: tier === "gl" && glVisible };
  const drawnRef = useRef("");
  const drawStill = useCallback(() => {
    const canvas = stillRef.current;
    if (!canvas || tierRef.current.live) return;
    const { chapter: ch, selected: sel, caseId: id, applied: ap, evidence: ev } = stateRef.current;
    const pose = ch === "difference" ? "difference" : ch === "seal" ? "seal" : ch === "print" ? "print" : "hero";
    const { w, h } = stageBox(stageRef.current);
    const state = {
      caseId: ch === "difference" ? id : null,
      applied: ap,
      evidence: ch === "difference" && ev,
      selected: ch === "seal" ? sel : null,
    };
    // As the fallback the still is the whole experience, so it is drawn at full resolution. As the first frame it is
    // on screen for about a second before the scene replaces it, so it is drawn at 1x: at 2x an integrated GPU takes
    // 0.3 to 1.5 s to rasterize its engraving (measured), which holds up the scene behind it.
    const res = tierRef.current.tier === "still" ? 2 : 1;
    const key = JSON.stringify([pose, w, h, res, state, document.fonts?.status]);
    if (key === drawnRef.current) return;
    drawnRef.current = key;
    drawSeal(canvas, stillFrame(pose === "seal" ? "difference" : pose, w, h), state, "steel", res);
  }, []);

  useEffect(() => {
    drawStill();
  }, [tier, glVisible, chapter, selected, caseId, applied, evidence, drawStill]);

  useEffect(() => {
    document.fonts?.ready.then(drawStill);
  }, [drawStill]);

  // ------------------------------------------------------------------ the WebGL scene, loaded once the page is idle
  useEffect(() => {
    let cancelled = false;
    let scene = null;
    let handle = 0;
    const start = async () => {
      performance.mark("seal:start");
      const gpu = webglTier();
      if (gpu.tier !== "gl") {
        setTier("still");
        return;
      }
      try {
        await Promise.all([
          document.fonts.load('600 100px "Bodoni Moda"'),
          document.fonts.load('500 40px "IBM Plex Sans Condensed"'),
          document.fonts.load('600 40px "IBM Plex Sans"'),
        ]);
      } catch {
        // The textures fall back to system fonts; nothing else depends on this.
      }
      performance.mark("seal:fonts");
      let mod;
      try {
        mod = await import("./gl/sealScene");
        performance.mark("seal:module");
      } catch {
        if (!cancelled) setTier("still");
        return;
      }
      if (cancelled || !glRef.current) return;
      try {
        scene = mod.createSealScene(glRef.current, {
          reducedMotion: prefersReduced(),
          integrated: gpu.integrated,
          onFirstFrame: () => {
            performance.mark("seal:first-frame");
            setGlVisible(true);
          },
          onHover: (i) => setHovered(i),
          onPick: (i, how) => {
            const st = stateRef.current;
            if (st.chapter === "seal" || st.chapter === "hero") {
              if (how === "tap") setSelected((cur) => (cur === i ? null : i));
              return;
            }
            if (st.chapter === "difference") {
              const sl = caseSeal(st.caseId);
              if (how === "drag" && sl.rings[1] === i) setMessage(refusal(st.caseId, st.applied));
              if (how === "tap" && sl.rings.includes(i)) setEvidence(true);
            }
          },
          onProject: (points, ev) => {
            const tag = evidenceRef.current;
            if (tag) {
              if (ev && ev.settled > 0.96) {
                // Under the strips, aligned to their right-hand ends where the amounts are.
                tag.style.transform = `translate(${Math.round(Math.max(ev.a.x, ev.b.x))}px, ${Math.round(Math.max(ev.a.y, ev.b.y) + 54)}px) translateX(-100%)`;
                tag.dataset.on = "true";
              } else {
                tag.dataset.on = "false";
              }
            }
            points.forEach((p, i) => {
              const line = leaderRefs.current[i];
              const row = rowRefs.current[i];
              if (!line || !row) return;
              const r = row.getBoundingClientRect();
              line.setAttribute("x1", String(r.right + 10));
              line.setAttribute("y1", String(r.top + r.height / 2));
              line.setAttribute("x2", String(p.x));
              line.setAttribute("y2", String(p.y));
            });
          },
          onLost: () => {
            setGlVisible(false);
            setTier("still");
          },
          onSlow: () => {
            setGlVisible(false);
            setTier("still");
            sceneRef.current?.dispose();
            sceneRef.current = null;
          },
        });
      } catch {
        if (!cancelled) setTier("still");
        return;
      }
      performance.mark("seal:created");
      sceneRef.current = scene;
      setTier("gl");
      const box = stageBox(stageRef.current);
      scene.resize(box.w, box.h, dpr(box.w / box.h < 0.95));
      scene.setLeaderMinX(leaderEdge(stageRef.current, rowRefs.current[0]));
      scene.setState(stateRef.current);
      scene.setScroll(scrollRef.current);
      setTimeout(() => sceneRef.current?.drift(24000), 2600);
    };
    // Right after the first paint: the still is already on screen, and the shaders compile without blocking.
    handle = window.requestAnimationFrame(() => { handle = window.setTimeout(start, 0); });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(handle);
      window.clearTimeout(handle);
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // ------------------------------------------------------------------ page state → scene
  useEffect(() => {
    sceneRef.current?.setState({ chapter, selected, caseId, applied, evidence });
  }, [chapter, selected, caseId, applied, evidence, tier]);

  // ------------------------------------------------------------------ scroll and resize
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const value = chapterValue(window.innerHeight, pinnedTop(stageRef.current));
      scrollRef.current = value;
      sceneRef.current?.setScroll(value);
      const next = CHAPTERS[Math.min(3, Math.round(value))];
      setChapter((cur) => (cur === next ? cur : next));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      const box = stageBox(stageRef.current);
      sceneRef.current?.resize(box.w, box.h, dpr(box.w / box.h < 0.95));
      sceneRef.current?.setLeaderMinX(leaderEdge(stageRef.current, rowRefs.current[0]));
      drawStill();
      onScroll();
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [drawStill]);

  // Leaving a chapter clears what was chosen in it.
  useEffect(() => {
    if (chapter !== "seal") setSelected(null);
    if (chapter !== "difference") setEvidence(false);
    if (chapter === "hero") sceneRef.current?.drift(16000);
  }, [chapter]);

  const chooseCase = (id) => {
    setCaseId(id);
    setApplied(false);
    setEvidence(false);
    setMessage("");
  };

  const tryClose = () => {
    sceneRef.current?.nudge(seal.offset > 0 ? -1 : 1);
    setMessage(refusal(caseId, applied));
  };

  const applyEvidence = () => {
    setApplied(true);
    setMessage(`Closed by the report’s own lines: ${current.parts.map((p) => `${p.label.toLowerCase()} ${inr(p.paise)}`).join(" and ") || "the payout’s lines and the UTR"}.`);
  };

  const onLamp = (angle, height) => {
    setLampAngle(angle);
    setLampHeight(height);
    sceneRef.current?.setLamp(angle, height);
  };

  return (
    <>
      <div ref={stageRef} className={s.stage} aria-hidden="true">
        <canvas ref={stillRef} className={s.still} data-hidden={tier === "gl" && glVisible ? "true" : "false"} />
        <canvas ref={glRef} className={s.gl} data-live={glVisible ? "true" : "false"} />
        <svg className={s.leaders} data-on={chapter === "seal" && tier === "gl" && glVisible ? "true" : "false"}>
          {RINGS.map((r, i) => (
            <line
              key={r.id}
              ref={(el) => { leaderRefs.current[i] = el; }}
              data-active={selected === i || hovered === i ? "true" : "false"}
            />
          ))}
        </svg>
        <div className={s.vignette} />
        <div ref={evidenceRef} className={s.evidenceTag} data-on="false">
          <span className={s.evidenceAmount}>{inr(caseDifference(current))}</span>
          <span className={s.evidenceStatus}>
            {current.status === "open" ? "Open: nothing in the source explains it" : current.status === "agrees" ? "Agrees" : applied ? "Explained by the report" : "Explained once its evidence is applied"}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------ hero */}
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroText}>
          <h1 id="hero-title" className={s.display}>
            <span>Six records.</span>
            <span>One seal.</span>
          </h1>
          <p className={s.lead}>
            Every payment leaves an order, a payment, a settlement line, a payout, a bank credit and a journal entry.
            ClearSettle is being built to bring them into register, and to keep any difference in sight until evidence
            explains it.
          </p>
          <div className={s.actions}>
            <a className={s.primary} href="#seal">Inspect the seal</a>
            <Link className={s.secondary} href="/" prefetch={false}>Sign in</Link>
          </div>
          <p className={s.note}>The seal is cut from one illustrative payment. It is not live data.</p>
        </div>
      </section>

      {/* ------------------------------------------------------------ the seal */}
      <section id="seal" className={s.chapter} aria-labelledby="seal-title">
        <div className={s.panel}>
          <h2 id="seal-title" className={s.heading}>Each ring is one record, cut from its own figures.</h2>
          <p className={s.body}>
            The six records of one payment, from the order at the centre to the journal entry at the rim. A ring is
            divided by its record’s own amounts, and its notch lines up with the others only where the records agree.
            Choose a ring to read the record it was cut from.
          </p>
          <ul className={s.rings}>
            {RINGS.map((r, i) => (
              <li key={r.id} ref={(el) => { rowRefs.current[i] = el; }}>
                <button
                  type="button"
                  className={s.ring}
                  aria-pressed={selected === i}
                  data-hover={hovered === i ? "true" : "false"}
                  onClick={() => setSelected((cur) => (cur === i ? null : i))}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className={s.ringName}>{r.name}</span>
                  <span className={s.ringRef}>{r.ref}</span>
                  <span className={s.ringAmount}>{inr(r.amountPaise)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className={s.record} aria-live="polite">
            {selected === null ? (
              <p className={s.hint}>Hidden in the steel: the settlement ring’s fee and GST, the payout’s 42 graduations, and a reference that appears only under a low light.</p>
            ) : (
              <>
                <p className={s.recordSource}>{RINGS[selected].source}</p>
                <RecordView id={RINGS[selected].id} />
                <p className={s.recordNote}>{RING_NOTES[RINGS[selected].id]}</p>
                <button type="button" className={s.textButton} onClick={() => setSelected(null)}>Back to the whole seal</button>
              </>
            )}
          </div>
          <fieldset className={s.lamp}>
            <legend>Lamp</legend>
            <label>
              <span>Around the seal</span>
              <input type="range" min="0" max="359" step="1" value={lampAngle} onChange={(e) => onLamp(Number(e.target.value), lampHeight)} />
            </label>
            <label>
              <span>Height</span>
              <input type="range" min="0" max="1" step="0.01" value={lampHeight} onChange={(e) => onLamp(lampAngle, Number(e.target.value))} />
            </label>
          </fieldset>
        </div>
      </section>

      {/* ------------------------------------------------------------ a difference */}
      <section id="difference" className={s.chapter} aria-labelledby="difference-title">
        <div className={s.panel}>
          <h2 id="difference-title" className={s.heading}>When a record doesn’t agree, its ring won’t close.</h2>
          <p className={s.body}>
            Choose a case. A difference closes only when the source data explains it: fees, taxes, refunds or reported
            adjustments. The planned matching rules have no blanket tolerance, so anything unexplained stays open,
            however small.
          </p>
          <ul className={s.cases}>
            {CASES.map((c) => (
              <li key={c.id}>
                <button type="button" className={s.case} aria-pressed={caseId === c.id} onClick={() => chooseCase(c.id)}>
                  <span>{c.title}</span>
                  <Status status={c.status} />
                </button>
              </li>
            ))}
          </ul>
          <div className={s.detail} aria-live="polite">
            <dl className={s.compare}>
              <div>
                <dt>{current.a.record}</dt>
                <dd className={s.meta}>{current.a.source}, {current.a.ref}</dd>
                <dd className={s.amount}>{inr(current.a.paise)}</dd>
              </div>
              <div>
                <dt>{current.b.record}</dt>
                <dd className={s.meta}>{current.b.source}{current.b.ref ? `, ${current.b.ref}` : ", no credit with this UTR"}</dd>
                <dd className={s.amount}>{current.b.paise === null ? "Not found" : inr(current.b.paise)}</dd>
              </div>
              {current.parts.map((p) => (
                <div key={p.label} className={s.part} data-applied={applied ? "true" : "false"}>
                  <dt>{p.label}</dt>
                  <dd className={s.amount}>{inr(p.paise)}</dd>
                </div>
              ))}
              <div className={s.difference}>
                <dt>Difference</dt>
                <dd className={s.amount}>{inr(caseDifference(current))}</dd>
              </div>
            </dl>
            <p className={s.why}>
              <Status status={current.status} /> {current.why}
            </p>
            <div className={s.caseActions}>
              {current.status === "open" && (
                <button type="button" className={s.secondaryButton} onClick={tryClose}>Try to close it</button>
              )}
              {seal.closable && seal.offset !== 0 && !applied && (
                <button type="button" className={s.secondaryButton} onClick={applyEvidence}>Apply the evidence</button>
              )}
              <button type="button" className={s.primaryButton} aria-pressed={evidence} onClick={() => setEvidence((e) => !e)}>
                {evidence ? "Back to the seal" : "Read the evidence"}
              </button>
            </div>
            <p className={s.message} role="status">{message}</p>
          </div>
        </div>
      </section>
    </>
  );
}

function refusal(caseId, applied) {
  const sl = caseSeal(caseId);
  const c = sl.case;
  if (c.status === "open") {
    return sl.missing
      ? `It won’t close. The statement has no credit for this payout, so ${inr(c.a.paise)} stays open.`
      : `It turns back. Nothing in the source explains ${inr(Math.abs(sl.differencePaise))}, so the difference stays open.`;
  }
  return applied ? "It is already closed by its evidence." : "It won’t close by hand. Apply the evidence from the report.";
}
