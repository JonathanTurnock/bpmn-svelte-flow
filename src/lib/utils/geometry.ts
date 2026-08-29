import type { Point } from '../types.js';

/**
 * Builds an SVG path through the given waypoints, rounding interior corners.
 * BPMN DI waypoints are typically orthogonal polylines; the small corner
 * radius matches the bpmn.io rendering style.
 */
export function waypointsToPath(points: Point[], cornerRadius = 5): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const inLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const outLen = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(cornerRadius, inLen / 2, outLen / 2);

    if (r < 0.5) {
      d += ` L ${curr.x},${curr.y}`;
      continue;
    }

    const inX = (curr.x - prev.x) / inLen;
    const inY = (curr.y - prev.y) / inLen;
    const outX = (next.x - curr.x) / outLen;
    const outY = (next.y - curr.y) / outLen;

    const p1 = { x: curr.x - inX * r, y: curr.y - inY * r };
    const p2 = { x: curr.x + outX * r, y: curr.y + outY * r };

    d += ` L ${p1.x},${p1.y} Q ${curr.x},${curr.y} ${p2.x},${p2.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x},${last.y}`;
  return d;
}

/** Unit direction vector between two points. */
export function direction(from: Point, to: Point): Point {
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
}

/**
 * Points of an arrowhead polygon whose tip sits at `tip`, pointing along the
 * segment `from` → `tip`.
 */
export function arrowheadPoints(from: Point, tip: Point, length = 10, width = 7): string {
  const dir = direction(from, tip);
  const bx = tip.x - dir.x * length;
  const by = tip.y - dir.y * length;
  const nx = -dir.y * (width / 2);
  const ny = dir.x * (width / 2);
  return `${tip.x},${tip.y} ${bx + nx},${by + ny} ${bx - nx},${by - ny}`;
}

/** A point `dist` along the first segment, measured from the first waypoint. */
export function pointAlong(from: Point, to: Point, dist: number): Point {
  const dir = direction(from, to);
  return { x: from.x + dir.x * dist, y: from.y + dir.y * dist };
}

/** Rotation angle (degrees) of the segment from → to. */
export function segmentAngle(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

/** Point at `fraction` (0–1) along a polyline, measured by cumulative length. */
export function pointAlongPolyline(points: Point[], fraction: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1 || fraction <= 0) return points[0];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const l = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    lengths.push(l);
    total += l;
  }
  let remaining = Math.min(fraction, 1) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] && lengths[i] > 0) {
      const t = remaining / lengths[i];
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t
      };
    }
    remaining -= lengths[i];
  }
  return points[points.length - 1];
}

/** Midpoint of a polyline (by cumulative length). */
export function polylineMidpoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const l = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    lengths.push(l);
    total += l;
  }
  let remaining = total / 2;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      return pointAlong(points[i], points[i + 1], remaining);
    }
    remaining -= lengths[i];
  }
  return points[points.length - 1];
}
