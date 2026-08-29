<script lang="ts">
  // Invisible handles: BPMN edges are drawn from DI waypoints, but Svelte Flow
  // requires nodes to expose handles for edges to be considered valid.
  import { Handle, Position } from '@xyflow/svelte';
</script>

<Handle type="target" position={Position.Left} class="bpmn-hidden-handle" isConnectable={false} />
<Handle type="source" position={Position.Right} class="bpmn-hidden-handle" isConnectable={false} />
