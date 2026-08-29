<script lang="ts">
  // The inner border that distinguishes a bpmn:Transaction (double outline).
  // Shared by collapsed (TaskNode) and expanded (SubProcessNode) renderings.
</script>

<div class="bpmn-transaction-inner"></div>

<style>
  .bpmn-transaction-inner {
    position: absolute;
    inset: 2.5px;
    border: 1.3px solid var(--bpmn-stroke, #334155);
    border-radius: 7px;
    pointer-events: none;
  }
</style>
