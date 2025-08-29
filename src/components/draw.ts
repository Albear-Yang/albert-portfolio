import type { Pt } from "./utils";
import type { Node, SavedTree } from "./colonizer";

export function clear(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, w, h);
}

export function drawAttractors(ctx: CanvasRenderingContext2D, points: Pt[], hoverIndex: number | null, running: boolean) {
  ctx.fillStyle = "#fff";
  const showHover = !running && hoverIndex !== null;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    ctx.beginPath();
    const r = showHover && hoverIndex === i ? 4.5 : 2;
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawTreeLines(ctx: CanvasRenderingContext2D, nodes: Node[]) {
  if (!nodes || nodes.length === 0) return;
  ctx.strokeStyle = "#ffffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.parent !== null && n.parent >= 0 && n.parent < nodes.length) {
      const p = nodes[n.parent];
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(n.x, n.y);
    }
  }
  ctx.stroke();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shift: number,
  points: Pt[],
  hoverIndex: number | null,
  running: boolean,
  inProgress: Node[],
  savedTrees: SavedTree[],
  shrunk: boolean
) {
  clear(ctx, width, height);
  ctx.save();
  ctx.translate(0, shift);
  drawAttractors(ctx, points, hoverIndex, running);
  ctx.restore();

  if (inProgress.length > 0) {
    ctx.save();
    ctx.translate(0, shift);
    drawTreeLines(ctx, inProgress);
    ctx.restore();
  } else if (shrunk) {
    const last = savedTrees[savedTrees.length - 1];
    if (last && last.nodes.length > 0) {
      ctx.save();
      ctx.translate(0, shift);
      drawTreeLines(ctx, last.nodes);
      ctx.restore();
    }
  } else {
    ctx.save();
    for (const t of savedTrees) {
      if (t.visible) drawTreeLines(ctx, t.nodes);
    }
    ctx.restore();
  }
}
