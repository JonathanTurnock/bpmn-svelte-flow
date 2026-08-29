<script lang="ts">
  import { studio } from '../studio.svelte.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import CodeEditor from './CodeEditor.svelte';

  let draft = $state('');
  let dirty = $state(false);
  let error = $state('');

  $effect(() => {
    void studio.modelVersion;
    if (!dirty) draft = studio.xml;
  });

  async function apply() {
    try {
      await studio.applyXml(draft);
      dirty = false;
      error = '';
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }
</script>

<div class="flex h-full flex-col gap-2 p-3" data-testid="xml-panel">
  <div class="flex items-center gap-2">
    <Button size="sm" onclick={apply} disabled={!dirty}>Apply XML</Button>
    <Button
      size="sm"
      variant="ghost"
      onclick={() => {
        draft = studio.xml;
        dirty = false;
        error = '';
      }}
      disabled={!dirty}>Revert</Button
    >
    <span class="text-xs text-muted-foreground">the artifact — standards-compliant BPMN 2.0</span>
  </div>
  {#if error}
    <p class="text-xs text-destructive">{error}</p>
  {/if}
  <div class="min-h-0 flex-1 overflow-auto">
    <CodeEditor
      bind:value={draft}
      language="xml"
      minHeight="200px"
      onchange={() => (dirty = true)}
    />
  </div>
</div>
