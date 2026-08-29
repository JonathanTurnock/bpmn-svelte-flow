<script lang="ts">
  // Invisible handles: BPMN edges are drawn from DI waypoints, but Svelte Flow
  // requires nodes to expose handles for edges to be considered valid.
  import { Handle, Position } from '@xyflow/svelte';
</script>

<Handle type="target" position={Position.Left} class="bpmn-hidden-handle" isConnectable={false} />
<Handle type="source" position={Position.Right} class="bpmn-hidden-handle" isConnectable={false} />

<style>
  /* The class lands on Svelte Flow's own handle element, so target it
     globally from here — every consumer gets the hiding for free. */
  :global(.svelte-flow__handle.bpmn-hidden-handle) {
    opacity: 0;
    pointer-events: none;
    width: 1px;
    height: 1px;
    min-width: 0;
    min-height: 0;
    border: none;
  }
</style>
