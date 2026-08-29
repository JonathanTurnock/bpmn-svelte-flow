<script lang="ts">
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';
  import type { BpmnEdgeData, Point } from '../../types.js';
  import {
    arrowheadPoints,
    pointAlong,
    polylineMidpoint,
    segmentAngle,
    waypointsToPath
  } from '../../utils/geometry.js';

  let { id, data, selected }: EdgeProps = $props();

  const edgeData = $derived(data as unknown as BpmnEdgeData);
  const waypoints = $derived(edgeData?.waypoints ?? []);
  const kind = $derived(edgeData?.kind ?? 'sequence-flow');
  const path = $derived(waypointsToPath(waypoints));

  const first = $derived(waypoints[0]);
  const second = $derived(waypoints[1] ?? waypoints[0]);
  const last = $derived(waypoints[waypoints.length - 1]);
  const secondLast = $derived(waypoints[waypoints.length - 2] ?? waypoints[waypoints.length - 1]);

  const isDashed = $derived(kind === 'message-flow' || kind === 'conversation-link');
  const isDotted = $derived(kind === 'association' || kind === 'data-association');

  const strokeDasharray = $derived(isDashed ? '8,5' : isDotted ? '1,4' : undefined);

  // filled arrowhead: sequence flows (incl. default/conditional variants)
  const filledArrow = $derived(
    kind === 'sequence-flow' || kind === 'default-flow' || kind === 'conditional-flow'
  );
  // open (white-filled) arrowhead: message flows
  const openArrow = $derived(kind === 'message-flow');
  // thin V arrowhead: data associations, directional associations
  const vArrowEnd = $derived(
    kind === 'data-association' ||
      (kind === 'association' &&
        (edgeData?.associationDirection === 'One' || edgeData?.associationDirection === 'Both'))
  );
  const vArrowStart = $derived(kind === 'association' && edgeData?.associationDirection === 'Both');

  // Shorten the visible path slightly so it doesn't poke through arrowheads.
  const trimmedPath = $derived.by(() => {
    if (!filledArrow && !openArrow) return path;
    if (waypoints.length < 2) return path;
    const trimmed: Point[] = waypoints.slice(0, -1);
    const backed = pointAlong(last, secondLast, 5);
    trimmed.push(backed);
    return waypointsToPath(trimmed);
  });

  const labelText = $derived(edgeData?.label);
  const labelPos = $derived.by(() => {
    const lb = edgeData?.labelBounds;
    if (lb) return { x: lb.x + lb.width / 2, y: lb.y + lb.height / 2 };
    const mid = polylineMidpoint(waypoints);
    return { x: mid.x, y: mid.y - 8 };
  });

  // default flow: slash marker across the line near the source
  const slash = $derived.by(() => {
    if (kind !== 'default-flow' || waypoints.length < 2) return undefined;
    const at = pointAlong(first, second, 12);
    return { at, angle: segmentAngle(first, second) };
  });

  // conditional flow: open diamond at the source end
  const diamond = $derived.by(() => {
    if (kind !== 'conditional-flow' || waypoints.length < 2) return undefined;
    const l = 16;
    const w = 8;
    const tip = first;
    const mid = pointAlong(first, second, l / 2);
    const end = pointAlong(first, second, l);
    const angle = segmentAngle(first, second);
    const rad = (angle * Math.PI) / 180;
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
      style={`stroke: var(--bpmn-stroke, #22242a); stroke-width: ${kind === 'data-association' || kind === 'association' ? 1.5 : 2}px; fill: none;${strokeDasharray ? ` stroke-dasharray: ${strokeDasharray};` : ''}`}
      interactionWidth={16}
    />

    {#if filledArrow}
      <polygon
        points={arrowheadPoints(secondLast, last)}
        style="fill: var(--bpmn-stroke, #22242a); stroke: none;"
      />
    {/if}

    {#if openArrow}
      <polygon
        points={arrowheadPoints(secondLast, last, 11, 8)}
        style="fill: var(--bpmn-fill, #ffffff); stroke: var(--bpmn-stroke, #22242a); stroke-width: 1.5px;"
      />
      <circle
        cx={pointAlong(first, second, 5).x}
        cy={pointAlong(first, second, 5).y}
        r="4.5"
        style="fill: var(--bpmn-fill, #ffffff); stroke: var(--bpmn-stroke, #22242a); stroke-width: 1.5px;"
      />
    {/if}

    {#if vArrowEnd}
      <polyline
        points={arrowheadPoints(secondLast, last, 9, 9)}
        style="fill: none; stroke: var(--bpmn-stroke, #22242a); stroke-width: 1.5px;"
      />
    {/if}
    {#if vArrowStart}
      <polyline
        points={arrowheadPoints(second, first, 9, 9)}
        style="fill: none; stroke: var(--bpmn-stroke, #22242a); stroke-width: 1.5px;"
      />
    {/if}

    {#if slash}
      <line
        x1="-5"
        y1="5"
        x2="5"
        y2="-5"
        transform={`translate(${slash.at.x}, ${slash.at.y}) rotate(${slash.angle})`}
        style="stroke: var(--bpmn-stroke, #22242a); stroke-width: 2px;"
      />
    {/if}

    {#if diamond}
      <polygon
        points={diamond}
        style="fill: var(--bpmn-fill, #ffffff); stroke: var(--bpmn-stroke, #22242a); stroke-width: 1.5px;"
      />
    {/if}

    {#if labelText}
      <text
        class="bpmn-edge-label"
        x={labelPos.x}
        y={labelPos.y}
        text-anchor="middle"
        dominant-baseline="middle"
        style="fill: var(--bpmn-label-color, #22242a); font-size: 11px; font-family: var(--bpmn-font-family, Arial, sans-serif); paint-order: stroke; stroke: var(--bpmn-canvas-bg, #ffffff); stroke-width: 3px; stroke-linejoin: round;"
      >
        {labelText}
      </text>
    {/if}
  </g>
{/if}
