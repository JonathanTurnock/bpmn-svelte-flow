<script lang="ts">
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';
  import type { BpmnEdgeData, Point } from '../../types.js';
  import {
    arrowheadPoints,
    direction,
    pointAlong,
    polylineMidpoint,
    segmentAngle,
    waypointsToPath
  } from '../../utils/geometry.js';

  // Renders every BPMN connecting object from its DI waypoints:
  //   sequence flow      solid line, filled arrowhead
  //   default flow       + slash tick near the source
  //   conditional flow   + hollow diamond at the source
  //   message flow       dashed line, hollow circle at source, hollow arrow at target
  //   conversation link  double line, no decorations
  //   association        dotted line, 0/1/2 thin "V" arrowheads
  //   data association   dotted line, thin "V" arrowhead at the target
  let { id, data, selected }: EdgeProps = $props();

  const edgeData = $derived(data as unknown as BpmnEdgeData);
  const waypoints = $derived(edgeData?.waypoints ?? []);
  const kind = $derived(edgeData?.kind ?? 'sequence-flow');

  const first = $derived(waypoints[0]);
  const second = $derived(waypoints[1] ?? waypoints[0]);
  const last = $derived(waypoints[waypoints.length - 1]);
  const secondLast = $derived(waypoints[waypoints.length - 2] ?? waypoints[waypoints.length - 1]);

  const isMessage = $derived(kind === 'message-flow');
  const isLink = $derived(kind === 'conversation-link');
  const isDotted = $derived(kind === 'association' || kind === 'data-association');

  const strokeDasharray = $derived(isMessage ? '9,5' : isDotted ? '0.5,5' : undefined);
  const strokeWidth = $derived(isDotted ? 1.6 : isLink ? 5 : 2);

  // filled arrowhead: sequence flows (incl. default/conditional variants)
  const filledArrow = $derived(
    kind === 'sequence-flow' || kind === 'default-flow' || kind === 'conditional-flow'
  );
  // thin "V" arrowhead: data associations and directional associations
  const vArrowEnd = $derived(
    kind === 'data-association' ||
      (kind === 'association' &&
        (edgeData?.associationDirection === 'One' || edgeData?.associationDirection === 'Both'))
  );
  const vArrowStart = $derived(kind === 'association' && edgeData?.associationDirection === 'Both');

  const ARROW_LEN = 11;
  const ARROW_WIDTH = 9;
  const MSG_ARROW_LEN = 13;
  const MSG_ARROW_WIDTH = 11;
  const MSG_DOT_R = 4.5;

  /**
   * Shortens a polyline by `startTrim`/`endTrim` measured along the line, so
   * the stroke never pokes out of an arrowhead or through the message-flow
   * circle. Walks whole segments, so it stays correct for bent edges whose
   * final segment is vertical, diagonal, or shorter than the trim distance.
   */
  function trimPolyline(points: Point[], startTrim: number, endTrim: number): Point[] {
    let pts = points.map((p) => ({ x: p.x, y: p.y }));
    if (startTrim > 0) {
      let remaining = startTrim;
      while (pts.length >= 2) {
        const len = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        if (len > remaining) {
          pts[0] = pointAlong(pts[0], pts[1], remaining);
          break;
        }
        remaining -= len;
        pts.shift();
      }
    }
    if (endTrim > 0) {
      let remaining = endTrim;
      while (pts.length >= 2) {
        const n = pts.length;
        const len = Math.hypot(pts[n - 1].x - pts[n - 2].x, pts[n - 1].y - pts[n - 2].y);
        if (len > remaining) {
          pts[n - 1] = pointAlong(pts[n - 1], pts[n - 2], remaining);
          break;
        }
        remaining -= len;
        pts.pop();
      }
    }
    return pts;
  }

  /** Open "V" arrowhead (two strokes meeting at the tip) — not a closed polygon. */
  function vArrowPoints(from: Point, tip: Point, length = 10, width = 10): string {
    const dir = direction(from, tip);
    const bx = tip.x - dir.x * length;
    const by = tip.y - dir.y * length;
    const nx = -dir.y * (width / 2);
    const ny = dir.x * (width / 2);
    return `${bx + nx},${by + ny} ${tip.x},${tip.y} ${bx - nx},${by - ny}`;
  }

  const startTrim = $derived(isMessage ? MSG_DOT_R * 2 + 1.5 : 0);
  const endTrim = $derived(isMessage ? MSG_ARROW_LEN - 1.5 : filledArrow ? ARROW_LEN - 2 : 0);

  const path = $derived(waypointsToPath(waypoints));
  const trimmedPath = $derived(
    startTrim || endTrim ? waypointsToPath(trimPolyline(waypoints, startTrim, endTrim)) : path
  );

  const messageDot = $derived.by(() => {
    if (!isMessage || waypoints.length < 2) return undefined;
    return pointAlong(first, second, MSG_DOT_R + 1);
  });

  const labelText = $derived(edgeData?.label);
  const labelLines = $derived(labelText ? String(labelText).split(/\r?\n/) : []);
  const labelPos = $derived.by(() => {
    const lb = edgeData?.labelBounds;
    if (lb) return { x: lb.x + lb.width / 2, y: lb.y + lb.height / 2 };
    const mid = polylineMidpoint(waypoints);
    return { x: mid.x, y: mid.y - 9 };
  });

  // default flow: slash tick across the line near the source
  const slash = $derived.by(() => {
    if (kind !== 'default-flow' || waypoints.length < 2) return undefined;
    const segLen = Math.hypot(second.x - first.x, second.y - first.y);
    const at = pointAlong(first, second, Math.min(14, Math.max(6, segLen * 0.25)));
    return { at, angle: segmentAngle(first, second) };
  });

  // conditional flow: hollow diamond at the source end
  const diamond = $derived.by(() => {
    if (kind !== 'conditional-flow' || waypoints.length < 2) return undefined;
    const l = 18;
    const w = 10;
    const tip = first;
    const mid = pointAlong(first, second, l / 2);
    const end = pointAlong(first, second, l);
    const rad = (segmentAngle(first, second) * Math.PI) / 180;
    const nx = -Math.sin(rad) * (w / 2);
    const ny = Math.cos(rad) * (w / 2);
    return `${tip.x},${tip.y} ${mid.x + nx},${mid.y + ny} ${end.x},${end.y} ${mid.x - nx},${mid.y - ny}`;
  });
</script>

{#if waypoints.length >= 2}
  <g class="bpmn-edge bpmn-edge-{kind}" class:selected>
    <BaseEdge
      {id}
      path={trimmedPath}
      style={`stroke: ${selected ? 'var(--bpmn-selected, #1a70ef)' : 'var(--bpmn-stroke, #22242a)'}; stroke-width: ${strokeWidth}px; fill: none; stroke-linecap: ${isDotted ? 'round' : 'butt'};${strokeDasharray ? ` stroke-dasharray: ${strokeDasharray};` : ''}`}
      interactionWidth={16}
    />

    {#if isLink}
      <!-- Conversation link: knock the middle out of the thick stroke so it
           reads as the spec's double line. -->
      <path
        d={trimmedPath}
        fill="none"
        style="stroke: var(--bpmn-canvas-bg, #ffffff); stroke-width: 2px;"
      />
    {/if}

    {#if filledArrow}
      <polygon
        points={arrowheadPoints(secondLast, last, ARROW_LEN, ARROW_WIDTH)}
        style={`fill: ${selected ? 'var(--bpmn-selected, #1a70ef)' : 'var(--bpmn-stroke, #22242a)'}; stroke: none;`}
      />
    {/if}

    {#if isMessage}
      <polygon
        points={arrowheadPoints(secondLast, last, MSG_ARROW_LEN, MSG_ARROW_WIDTH)}
        style={`fill: var(--bpmn-fill, #ffffff); stroke: ${selected ? 'var(--bpmn-selected, #1a70ef)' : 'var(--bpmn-stroke, #22242a)'}; stroke-width: 1.6px; stroke-linejoin: round;`}
      />
      {#if messageDot}
        <circle
          cx={messageDot.x}
          cy={messageDot.y}
          r={MSG_DOT_R}
          style={`fill: var(--bpmn-fill, #ffffff); stroke: ${selected ? 'var(--bpmn-selected, #1a70ef)' : 'var(--bpmn-stroke, #22242a)'}; stroke-width: 1.6px;`}
        />
      {/if}
    {/if}

    {#if vArrowEnd}
      <polyline
        points={vArrowPoints(secondLast, last, 10, 11)}
        style="fill: none; stroke: var(--bpmn-stroke, #22242a); stroke-width: 1.6px; stroke-linecap: round; stroke-linejoin: round;"
      />
    {/if}
    {#if vArrowStart}
      <polyline
        points={vArrowPoints(second, first, 10, 11)}
        style="fill: none; stroke: var(--bpmn-stroke, #22242a); stroke-width: 1.6px; stroke-linecap: round; stroke-linejoin: round;"
      />
    {/if}

    {#if slash}
      <line
        x1="-6"
        y1="6"
        x2="6"
        y2="-6"
        transform={`translate(${slash.at.x}, ${slash.at.y}) rotate(${slash.angle})`}
        style="stroke: var(--bpmn-stroke, #22242a); stroke-width: 2px;"
      />
    {/if}

    {#if diamond}
      <polygon
        points={diamond}
        style="fill: var(--bpmn-fill, #ffffff); stroke: var(--bpmn-stroke, #22242a); stroke-width: 1.6px; stroke-linejoin: round;"
      />
    {/if}

    {#if labelLines.length > 0}
      <text
        class="bpmn-edge-label"
        x={labelPos.x}
        y={labelPos.y - ((labelLines.length - 1) * 13) / 2}
        text-anchor="middle"
        dominant-baseline="middle"
      >
        {#each labelLines as line, i}
          <tspan x={labelPos.x} dy={i === 0 ? 0 : 13}>{line}</tspan>
        {/each}
      </text>
    {/if}
  </g>
{/if}

<style>
  .bpmn-edge :global(.svelte-flow__edge-path) {
    stroke-linejoin: round;
  }
  .bpmn-edge-label {
    fill: var(--bpmn-label-color, #22242a);
    font-size: 11px;
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    paint-order: stroke;
    stroke: var(--bpmn-canvas-bg, #ffffff);
    stroke-width: 3.5px;
    stroke-linejoin: round;
    pointer-events: none;
    user-select: none;
  }
  .bpmn-edge.selected .bpmn-edge-label {
    fill: var(--bpmn-selected, #1a70ef);
  }
</style>
