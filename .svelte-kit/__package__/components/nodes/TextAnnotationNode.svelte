<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { BpmnNodeData } from '../../types.js';
  import NodeHandles from './NodeHandles.svelte';

  let { data, selected }: NodeProps = $props();
  const d = $derived(data as unknown as BpmnNodeData);
</script>

<div class="bpmn-annotation" class:selected style={`width: ${d.width}px; height: ${d.height}px;`}>
  <div class="bpmn-annotation-bracket"></div>
  <div class="bpmn-annotation-text">{d.label ?? ''}</div>
  <NodeHandles />
</div>

<style>
  .bpmn-annotation {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
  }
  .bpmn-annotation-bracket {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 12px;
    border-top: 1.6px solid var(--bpmn-stroke, #22242a);
    border-left: 1.6px solid var(--bpmn-stroke, #22242a);
    border-bottom: 1.6px solid var(--bpmn-stroke, #22242a);
  }
  .bpmn-annotation.selected .bpmn-annotation-bracket {
    border-color: var(--bpmn-selected, #1a70ef);
  }
  .bpmn-annotation-text {
    padding: 3px 4px 3px 8px;
    font-family: var(--bpmn-font-family, Arial, sans-serif);
    font-size: 11px;
    line-height: 1.25;
    color: var(--bpmn-label-color, #22242a);
    white-space: pre-line;
  }
</style>
