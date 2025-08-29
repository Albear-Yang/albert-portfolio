// src/hero/colonizer.ts
// Further-patched version: adds robust expanding-cell nearest search, periodic grid rebuild,
// stronger debug instrumentation, and other safeguards to make sure attractors are
// assigned and reached when possible.

import type { Pt } from "./utils";
import { good_letters } from "./utils";

export type Node = { x: number; y: number; parent: number | null; ax?: number; ay?: number; aCount?: number };
export type SavedTree = { id: number; seed: Pt; nodes: Node[]; killedAttractors: Pt[]; visible: boolean };

export type ColonizerConfig = {
  pointsRef: { current: Pt[] };
  inProgressRef: { current: Node[] };
  savedTreesRef: { current: SavedTree[] };
  onDone?: (tree: SavedTree) => void;
  ATTRACT_DIST?: number;
  KILL_DIST?: number;
  SEGMENT_LEN?: number;
  MAX_ITER?: number;
};

export function createColonizer(cfg: ColonizerConfig) {
  const ATTRACT_DIST = cfg.ATTRACT_DIST ?? 180;
  const KILL_DIST = cfg.KILL_DIST ?? 4;
  const SEGMENT_LEN = cfg.SEGMENT_LEN ?? 5;
  const MAX_ITER = cfg.MAX_ITER ?? 100;

  // Use a cell size smaller than ATTRACT_DIST to reduce cross-cell misses.
  const cellSize = Math.max(1, Math.floor(ATTRACT_DIST / 3));
  const grid = new Map<string, number[]>(); // key "gx,gy" -> array of node indices

  function cellKey(gx: number, gy: number) {
    return `${gx},${gy}`;
  }

  function addNodeToGrid(idx: number, nodes: Node[]) {
    const n = nodes[idx];
    if (!n) return;
    const gx = Math.floor(n.x / cellSize);
    const gy = Math.floor(n.y / cellSize);
    const k = cellKey(gx, gy);
    const arr = grid.get(k);
    if (arr) {
      if (!arr.includes(idx)) arr.push(idx);
    } else {
      grid.set(k, [idx]);
    }
  }

  // Rebuilds the whole grid from scratch. Useful as a periodic sanity check.
  function rebuildGrid(nodes: Node[]) {
    grid.clear();
    for (let i = 0; i < nodes.length; i++) addNodeToGrid(i, nodes);
  }

  // Collect node indices from cells in radius [-radiusCells..radiusCells]
  // Deduplicated.
  function nodesNearPos(pos: Pt, radiusCells: number) {
    const gx = Math.floor(pos.x / cellSize);
    const gy = Math.floor(pos.y / cellSize);
    const out: number[] = [];
    const seen = new Set<number>();
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      for (let dy = -radiusCells; dy <= radiusCells; dy++) {
        const k = cellKey(gx + dx, gy + dy);
        const a = grid.get(k);
        if (a) {
          for (const id of a) {
            if (!seen.has(id)) {
              seen.add(id);
              out.push(id);
            }
          }
        }
      }
    }
    return out;
  }

  // Find the nearest node index for an attractor 'a'. This expands the search radius
  // over grid cells up to a maximum determined by ATTRACT_DIST, and finally falls
  // back to a full scan if nothing useful is found. This is the most robust part
  // to guarantee we don't miss attractors due to grid partitioning.
  function findNearestNodeIndex(a: Pt, nodes: Node[]) {
    if (nodes.length === 0) return -1;
    const maxCells = Math.max(1, Math.ceil(ATTRACT_DIST / cellSize) + 1);

    let bestIdx = -1;
    let bestD2 = Infinity;

    for (let radius = 1; radius <= maxCells; radius++) {
      const candidates = nodesNearPos(a, radius);
      if (candidates.length === 0) continue; // try larger radius

      // find nearest among candidates
      for (const ni of candidates) {
        const n = nodes[ni];
        if (!n) continue;
        const dx = n.x - a.x;
        const dy = n.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestIdx = ni;
        }
      }

      // If the nearest candidate is within ATTRACT_DIST, we can stop early.
      if (bestD2 <= ATTRACT_DIST * ATTRACT_DIST) break;
      // otherwise continue expanding radius until maxCells
    }

    // Final fallback: full scan if we haven't found anyone within ATTRACT_DIST
    // or we never found any candidates.
    if (bestIdx === -1 || bestD2 > ATTRACT_DIST * ATTRACT_DIST) {
      bestIdx = -1;
      bestD2 = Infinity;
      for (let ni = 0; ni < nodes.length; ni++) {
        const n = nodes[ni];
        if (!n) continue;
        const dx = n.x - a.x;
        const dy = n.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestIdx = ni;
        }
      }
    }

    return { idx: bestIdx, d2: bestD2 } as any;
  }

  let raf: number | null = null;
  let running = false;
  const DEBUG = false; // set true for verbose logs

  function stepIteration(killedThisTree: Pt[], seed: Pt) {
    const attractors = cfg.pointsRef.current;
    const inProgress = cfg.inProgressRef.current;

    if (!running) return;

    // reset accumulators
    for (const n of inProgress) {
      n.ax = 0;
      n.ay = 0;
      n.aCount = 0;
    }

    let iter = 0;

    function step() {
      if (!running) return;
      iter++;

      // periodic sanity rebuild of the grid in case of missed inserts
      if (iter % 60 === 0) rebuildGrid(inProgress);

      const killDist2 = KILL_DIST * KILL_DIST;
      // iterate attractors backwards because we may splice
      for (let aI = attractors.length - 1; aI >= 0; aI--) {
        const a = attractors[aI];

        const nearest = findNearestNodeIndex(a, inProgress);
        if (!nearest || nearest.idx === -1) continue;
        const nearestIdx = nearest.idx;
        const nearestDist2 = nearest.d2;

        if (nearestDist2 <= killDist2) {
          const removed = attractors.splice(aI, 1)[0];
          if (removed) killedThisTree.push(removed);
          continue;
        }

        // attract if within ATTRACT_DIST
        if (nearestDist2 <= ATTRACT_DIST * ATTRACT_DIST) {
          const n = inProgress[nearestIdx];
          const dx = a.x - n.x;
          const dy = a.y - n.y;
          if (!n.aCount) {
            n.ax = dx;
            n.ay = dy;
            n.aCount = 1;
          } else {
            n.ax! += dx;
            n.ay! += dy;
            n.aCount! += 1;
          }
        }
      }

      // spawn new nodes
      const baseLen = inProgress.length;
      const newNodes: Node[] = [];
      for (let ni = 0; ni < baseLen; ni++) {
        const n = inProgress[ni];
        if (n.aCount && n.aCount > 0) {
          const ax = n.ax! / n.aCount!;
          const ay = n.ay! / n.aCount!;
          const len = Math.hypot(ax, ay);
          if (len === 0) continue;
          const nx = n.x + (ax / len) * SEGMENT_LEN;
          const ny = n.y + (ay / len) * SEGMENT_LEN;

          // check too-close using grid neighbors (against existing nodes)
          let tooClose = false;
          const neighbors = nodesNearPos({ x: nx, y: ny }, 1);
          for (const idx of neighbors) {
            const ex = inProgress[idx];
            if (!ex) continue;
            const dx = ex.x - nx;
            const dy = ex.y - ny;
            if (dx * dx + dy * dy < (SEGMENT_LEN * 0.5) * (SEGMENT_LEN * 0.5)) {
              tooClose = true;
              break;
            }
          }

          // also check against nodes generated this frame
          if (!tooClose) {
            for (const ex of newNodes) {
              const dx = ex.x - nx;
              const dy = ex.y - ny;
              if (dx * dx + dy * dy < (SEGMENT_LEN * 0.5) * (SEGMENT_LEN * 0.5)) {
                tooClose = true;
                break;
              }
            }
          }

          if (!tooClose) {
            newNodes.push({ x: nx, y: ny, parent: ni });
          }
        }
      }

      if (newNodes.length > 0) {
        const startIndex = inProgress.length;
        inProgress.push(...newNodes);
        // add new nodes to grid
        for (let k = 0; k < newNodes.length; k++) {
          addNodeToGrid(startIndex + k, inProgress);
        }
      }

      // finish conditions
      if (attractors.length === 0 || iter > MAX_ITER || inProgress.length > 20000) {
        running = false;
        const tree: SavedTree = {
          id: Date.now(),
          seed,
          nodes: inProgress.map((n) => ({ x: n.x, y: n.y, parent: n.parent })),
          killedAttractors: killedThisTree.slice(),
          visible: true,
        };
        cfg.inProgressRef.current = [];
        cfg.savedTreesRef.current.push(tree);
        cfg.onDone?.(tree);
        if (DEBUG) {
          console.log('colonizer finished', { iter, remainingAttractors: attractors.length, killed: killedThisTree.length, nodes: tree.nodes.length });
        }
        return;
      }

      raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
  }

  return {
    start(seed: Pt) {
      if (running) return;
      running = true;

      // reset inProgress to initial nodes (using good_letters)
      cfg.inProgressRef.current = [];
      for (const letter of good_letters) {
        cfg.inProgressRef.current.push({ x: letter[0][0], y: letter[0][1], parent: null });
      }

      // If you prefer starting from the provided seed only, uncomment:
      // cfg.inProgressRef.current = [{ x: seed.x, y: seed.y, parent: null }];

      const killedThisTree: Pt[] = [];
      grid.clear();

      // Add all initial nodes to the grid (IMPORTANT)
      for (let i = 0; i < cfg.inProgressRef.current.length; i++) {
        addNodeToGrid(i, cfg.inProgressRef.current);
      }

      if (DEBUG) {
        console.log('colonizer.start', { initialNodes: cfg.inProgressRef.current.length, cellSize, gridCells: grid.size });
      }

      stepIteration(killedThisTree, seed);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    },
    isRunning() {
      return running;
    },
    // utility to force a grid rebuild from outside (handy for debugging)
    _rebuildGrid() {
      rebuildGrid(cfg.inProgressRef.current);
    }
  };
}
