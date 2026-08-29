import type { Point } from '../types.js';
/**
 * Builds an SVG path through the given waypoints, rounding interior corners.
 * BPMN DI waypoints are typically orthogonal polylines; the small corner
 * radius matches the bpmn.io rendering style.
 */
export declare function waypointsToPath(points: Point[], cornerRadius?: number): string;
/** Unit direction vector between two points. */
export declare function direction(from: Point, to: Point): Point;
/**
 * Points of an arrowhead polygon whose tip sits at `tip`, pointing along the
 * segment `from` → `tip`.
 */
export declare function arrowheadPoints(from: Point, tip: Point, length?: number, width?: number): string;
/** A point `dist` along the first segment, measured from the first waypoint. */
export declare function pointAlong(from: Point, to: Point, dist: number): Point;
/** Rotation angle (degrees) of the segment from → to. */
export declare function segmentAngle(from: Point, to: Point): number;
/** Midpoint of a polyline (by cumulative length). */
export declare function polylineMidpoint(points: Point[]): Point;
