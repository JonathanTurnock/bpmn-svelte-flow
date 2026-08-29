<script lang="ts">
  import {
    Download,
    FilePlus,
    PanelBottom,
    PanelLeft,
    PanelRight,
    Redo2,
    Save,
    Undo2,
    Upload,
    Workflow
  } from '@lucide/svelte';
  import { studio } from '../studio.svelte.js';
  import { download } from '../utils.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';

  let {
    leftOpen = $bindable(true),
    rightOpen = $bindable(true),
    bottomOpen = $bindable(true)
  }: { leftOpen?: boolean; rightOpen?: boolean; bottomOpen?: boolean } = $props();

  let fileInput: HTMLInputElement;

  async function importFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    await studio.importXml(await file.text(), file.name.replace(/\.(bpmn|xml)$/i, ''));
    fileInput.value = '';
  }
</script>

<header class="flex items-center gap-2 border-b px-4 py-2">
  <div class="flex items-center gap-2">
    <Workflow class="size-4" />
    <span class="text-sm font-semibold tracking-tight">BSF Studio</span>
  </div>
  <Separator orientation="vertical" class="mx-1 data-[orientation=vertical]:h-4" />

  <Input class="w-44" bind:value={studio.docName} aria-label="document name" />
  <Button size="sm" variant="outline" onclick={() => studio.saveDocument()} title="Save to browser workspace">
    <Save /> Save
  </Button>
  <Button size="sm" variant="ghost" onclick={() => studio.newDocument()} title="New document">
    <FilePlus /> New
  </Button>
  <Button size="sm" variant="ghost" onclick={() => fileInput.click()} title="Import a .bpmn file">
    <Upload /> Import
  </Button>
  <input type="file" accept=".bpmn,.xml" class="hidden" bind:this={fileInput} onchange={importFile} />
  <Button
    size="sm"
    variant="ghost"
    onclick={() => download(`${studio.docName || 'process'}.bpmn`, studio.xml)}
    title="Download the BPMN 2.0 artifact"
  >
    <Download /> Export
  </Button>

  <div class="ml-auto flex items-center gap-1">
    <Button size="icon-sm" variant="ghost" onclick={() => studio.undo()} disabled={!studio.canUndo} title="Undo">
      <Undo2 />
    </Button>
    <Button size="icon-sm" variant="ghost" onclick={() => studio.redo()} disabled={!studio.canRedo} title="Redo">
      <Redo2 />
    </Button>
    <Separator orientation="vertical" class="mx-1 data-[orientation=vertical]:h-4" />
    <Button
      size="icon-sm"
      variant={leftOpen ? 'secondary' : 'ghost'}
      onclick={() => (leftOpen = !leftOpen)}
      title="Toggle workspace panel"
      aria-label="Toggle workspace panel"
    >
      <PanelLeft />
    </Button>
    <Button
      size="icon-sm"
      variant={bottomOpen ? 'secondary' : 'ghost'}
      onclick={() => (bottomOpen = !bottomOpen)}
      title="Toggle run console"
      aria-label="Toggle run console"
      data-testid="toggle-bottom"
    >
      <PanelBottom />
    </Button>
    <Button
      size="icon-sm"
      variant={rightOpen ? 'secondary' : 'ghost'}
      onclick={() => (rightOpen = !rightOpen)}
      title="Toggle inspector panel"
      aria-label="Toggle inspector panel"
    >
      <PanelRight />
    </Button>
  </div>
</header>
