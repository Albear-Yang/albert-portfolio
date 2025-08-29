// src/hero/HeroCanvas.tsx
import React, { useEffect, useRef } from "react";
import { poissonDisk, easeInOutCubic, dist2 } from "./utils";
import type { Pt } from "./utils";
import pointInPolygon from "point-in-polygon";
import { good_letters } from "./utils"; // Make sure good_letters is exported

import { drawFrame } from "./draw";
import { createColonizer, type Node, type SavedTree } from "./colonizer";

interface Props {
  show: boolean;
  onFinish: () => void;
  shrunk?: boolean;
}

export default function HeroCanvas({ show, onFinish, shrunk }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const dprRef = useRef<number>(1);
  const fullHeightRef = useRef<number>(window.innerHeight);
  const pointsRef = useRef<Pt[]>([]); // attractors (Poisson)
  const inProgressNodesRef = useRef<Node[]>([]); // current building tree
  const savedTreesRef = useRef<SavedTree[]>([]);
  const hoverIndexRef = useRef<number | null>(null);

  const renderRafRef = useRef<number | null>(null);
  const visualShiftAnimRef = useRef<number | null>(null);

  const visualShiftRef = useRef<number>(0);

  const colonizerRef = useRef<ReturnType<typeof createColonizer> | null>(null);

  var W = window.innerWidth;
  var H = window.innerHeight;
  var POISSON_RADIUS = Math.floor(H/150);
  var POISSON_K = 140;
  var ATTRACT_DIST = Math.floor(H/80);
  var KILL_DIST = Math.floor(H/300);
  var SEGMENT_LEN = Math.floor(H/280);
  var MAX_ITER = 1000;
  var CLICK_TOL = 12;
  var SHRINK_DURATION = 800; // ms, should match CSS transition duration


  // ---------- helpers ----------
  function setupCanvasSize(canvas: HTMLCanvasElement) {
    const cssW = window.innerWidth;
    const fullH = window.innerHeight;
    fullHeightRef.current = fullH;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    // Keep canvas bitmap at full size; canvas CSS set to 100vh (no transition)
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `100vh`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(fullH * dpr);

    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: cssW, fullHeight: fullH };
  }

  function animateVisualShiftTo(target: number) {
    if (visualShiftAnimRef.current) cancelAnimationFrame(visualShiftAnimRef.current);
    const start = performance.now();
    const from = visualShiftRef.current;
    function step(ts: number) {
      const dt = ts - start;
      const t = Math.min(1, dt / SHRINK_DURATION);
      const eased = easeInOutCubic(t);
      visualShiftRef.current = from + (target - from) * eased;
      if (t < 1) {
        visualShiftAnimRef.current = requestAnimationFrame(step);
      } else {
        visualShiftAnimRef.current = null;
      }
    }
    visualShiftAnimRef.current = requestAnimationFrame(step);
  }

  // ---------- persistent render loop ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas ? canvas.getBoundingClientRect() : { width: 0, height: 0 };
    const width = rect.width;
    const height = rect.height;

    function loop() {
      const running = colonizerRef.current?.isRunning() ?? false;
      drawFrame(
        ctx,
        width,
        height,
        visualShiftRef.current,
        pointsRef.current,
        hoverIndexRef.current,
        running,
        inProgressNodesRef.current,
        savedTreesRef.current,
        !!shrunk
      );
      renderRafRef.current = requestAnimationFrame(loop);
    }

    if (show) {
      if (renderRafRef.current == null) renderRafRef.current = requestAnimationFrame(loop);
    } else {
      if (renderRafRef.current) {
        cancelAnimationFrame(renderRafRef.current);
        renderRafRef.current = null;
      }
    }

    return () => {
      if (renderRafRef.current) {
        cancelAnimationFrame(renderRafRef.current);
        renderRafRef.current = null;
      }
    };
  }, [show, shrunk]);

  // ---------- init and event handlers (only depend on `show`) ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!show) return;

    const { width, fullHeight } = setupCanvasSize(canvas);
    const ctx = canvas.getContext("2d")!;

    // generate Poisson across full viewport height once
    pointsRef.current = poissonDisk(width, fullHeight, POISSON_RADIUS, POISSON_K);

    // create colonizer instance wired to our refs
    colonizerRef.current = createColonizer({
      pointsRef,
      inProgressRef: inProgressNodesRef,
      savedTreesRef,
      onDone: (tree) => {
        // keep onFinish behavior (you can expand this later)
        onFinish();
      },
      ATTRACT_DIST,
      KILL_DIST,
      SEGMENT_LEN,
      MAX_ITER,
    });

    // --- NEW: Automatically seed when shown ---
    // Use center of canvas as seed, or pick a random attractor if you prefer
    const seed = { x: width / 2, y: fullHeight / 2 };
    const colonizer = colonizerRef.current;
    if (colonizer && !colonizer.isRunning()) {
      colonizer.start(seed);
    }

    // --- NEW: After 2 seconds, trigger shrink and delete missed attractors ---
    const shrinkTimeout = setTimeout(() => {
      colonizerRef.current?.stop();
      if (canvasRef.current) canvasRef.current.style.cursor = "pointer";
      pointsRef.current = [];
      onFinish();
    }, 4000);

    // handle resize: reset canvas bitmap and regenerate Poisson (keeps saved trees)
    function onResize() {
      if (!canvas) return; 
      setupCanvasSize(canvas);
      const full = fullHeightRef.current;
      const shrunkHeight = Math.round(window.innerHeight * 0.35);
      const targetShift = shrunk ? shrunkHeight / 1.5 - full / 2 : 0;
      animateVisualShiftTo(targetShift);
      var W = window.innerWidth;
      var H = window.innerHeight;
      var POISSON_RADIUS = Math.min(Math.floor(W/75), Math.floor(H/150));
      var ATTRACT_DIST = Math.min(Math.floor(W/40), Math.floor(H/80));
      var KILL_DIST = Math.min(Math.floor(W/150), Math.floor(H/300));
      var SEGMENT_LEN = Math.min(Math.floor(W/180), Math.floor(H/360));
      pointsRef.current = poissonDisk(window.innerWidth, shrunkHeight, POISSON_RADIUS, POISSON_K);

      colonizerRef.current?.stop();
      const seed = { x: window.innerWidth / 2, y: fullHeightRef.current / 2 };
      colonizerRef.current?.start(seed);
      
    }

    window.addEventListener("resize", onResize);

    // initial immediate draw handled by render loop; call once for safety
    drawFrame(
      ctx,
      width,
      fullHeight,
      visualShiftRef.current,
      pointsRef.current,
      hoverIndexRef.current,
      false,
      inProgressNodesRef.current,
      savedTreesRef.current,
      !!shrunk
    );

    return () => {
      window.removeEventListener("resize", onResize);
      colonizerRef.current?.stop();
      colonizerRef.current = null;
      clearTimeout(shrinkTimeout);
    };
  }, [show]); 

  useEffect(() => {
    const full = fullHeightRef.current;
    const shrunkHeight = Math.round(window.innerHeight * 0.35);
    const targetShift = shrunk ? shrunkHeight / 1.5 - full / 2 : 0;
    animateVisualShiftTo(targetShift);
    return () => {
      if (visualShiftAnimRef.current) cancelAnimationFrame(visualShiftAnimRef.current);
    };
  }, [shrunk]);
  // ---------- render (wrapper clips the canvas) ----------
  return (
    <div
      style={{
        position: shrunk ? "relative" : "fixed",
        top: shrunk ? undefined : 0,
        left: 0,
        width: "100%",
        height: shrunk ? "40vh" : "100vh",
        overflow: "hidden",
        zIndex: 5,
        transition: `height ${SHRINK_DURATION}ms cubic-bezier(.77,0,.18,1)`,
        margin: 0,
        padding: 0,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 50,
          left: 100,
          zIndex: 10,
          pointerEvents: "none", 
          opacity: shrunk ? 1 : 0,
          transform: shrunk ? "translateY(0px)" : "translateY(-6px)",
          transition: "opacity 300ms ease, transform 300ms ease",
          color: "white",
          fontSize: '3vh',
          fontWeight: 600,
          lineHeight: 1.1,
          textShadow: "0 1px 6px rgba(0,0,0,0.7)",
        }}
      >
        <div>portfolio:</div>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100vh", 
          display: "block",
          transition: "none",
          margin: 0,
          padding: 0,
          cursor: colonizerRef.current?.isRunning() ? "progress" : "pointer",
        }}
      />
    </div>
  );
}
