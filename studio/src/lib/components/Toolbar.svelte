<script lang="ts">
  import {
    Download,
    FilePlus,
    FolderOpen,
    Plus,
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
  import * as Select from '$lib/components/ui/select/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';

  let addType = $state('task');
  let openSelect = $state('');
  let fileInput: HTMLInputElement;

  const documents = $derived.by(() => {
    void studio.workspaceVersion;
    return studio.listDocuments();
  });

  const ADD_TYPES = [
    ['task', 'Task'],
    ['userTask', 'User task'],
    ['serviceTask', 'Service task'],
    ['scriptTask', 'Script task'],
    ['sendTask', 'Send task'],
    ['receiveTask', 'Receive task'],
    ['businessRuleTask', 'Business rule task'],
    ['callActivity', 'Call activity'],
    ['subProcess', 'Sub-process'],
    ['exclusiveGateway', 'Exclusive gateway'],
    ['parallelGateway', 'Parallel gateway'],
    ['inclusiveGateway', 'Inclusive gateway'],
    ['eventBasedGateway', 'Event gateway'],
    ['startEvent', 'Start event'],
    ['endEvent', 'End event'],
    ['intermediateCatchEvent', 'Catch event'],
    ['intermediateThrowEvent', 'Throw event'],
    ['textAnnotation', 'Annotation']
  ] as const;

  async function addElement() {
    const after = studio.selectedId ?? undefined;
    const { id } = await studio.mutate(() =>
      studio.addElement({ type: addType, afterElementId: after })
    );
    studio.selectedId = id;
  }

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
  <Select.Root
    type="single"
    bind:value={openSelect}
    onValueChange={async (name) => {
      if (name) await studio.openDocument(name);
      openSelect = '';
    }}
  >
    <Select.Trigger size="sm" aria-label="open document">Open…</Select.Trigger>
    <Select.Content>
      {#each documents as d (d.name)}
        <Select.Item value={d.name} label={d.name} />
      {:else}
        <Select.Item value="" label="no saved documents" disabled />
      {/each}
    </Select.Content>
  </Select.Root>
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
  <Button
    size="sm"
    variant="ghost"
    onclick={async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}samples/messaging-flow.bpmn`);
      await studio.importXml(await res.text(), 'messaging-flow');
    }}
    title="Load the messaging platform sample"
  >
    <FolderOpen /> Sample
  </Button>

  <div class="ml-auto flex items-center gap-2">
    <Select.Root type="single" bind:value={addType}>
      <Select.Trigger size="sm" class="w-44" aria-label="element type">
        {ADD_TYPES.find(([value]) => value === addType)?.[1] ?? 'Element type'}
      </Select.Trigger>
      <Select.Content>
        {#each ADD_TYPES as [value, label] (value)}
          <Select.Item {value} {label} />
        {/each}
      </Select.Content>
    </Select.Root>
    <Button size="sm" variant="secondary" onclick={addElement} title="Add after the selected element" data-testid="add-element">
      <Plus /> Add
    </Button>
    <Separator orientation="vertical" class="mx-1 data-[orientation=vertical]:h-4" />
    <Button size="icon-sm" variant="ghost" onclick={() => studio.undo()} disabled={!studio.canUndo} title="Undo">
      <Undo2 />
    </Button>
    <Button size="icon-sm" variant="ghost" onclick={() => studio.redo()} disabled={!studio.canRedo} title="Redo">
      <Redo2 />
    </Button>
  </div>
</header>
