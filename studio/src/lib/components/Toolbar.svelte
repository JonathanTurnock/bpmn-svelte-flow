<script lang="ts">
  import {
    Download,
    FilePlus,
    FolderOpen,
    Moon,
    Plus,
    Redo2,
    Save,
    Undo2,
    Upload
  } from '@lucide/svelte';
  import { studio } from '../studio.svelte.js';
  import { download } from '../utils.js';
  import Button from './ui/button.svelte';
  import Input from './ui/input.svelte';
  import Select from './ui/select.svelte';
  import Separator from './ui/separator.svelte';

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

<header class="flex items-center gap-2 border-b bg-card px-3 py-2">
  <Moon class="size-5" />
  <span class="text-sm font-semibold tracking-tight">Lunatic Studio</span>
  <Separator class="mx-1 h-5 w-px" />

  <Input class="w-44" bind:value={studio.docName} aria-label="document name" />
  <Button size="sm" variant="outline" onclick={() => studio.saveDocument()} title="Save to browser workspace">
    <Save /> Save
  </Button>
  <Select
    class="w-40"
    bind:value={openSelect}
    aria-label="open document"
    onchange={async () => {
      if (openSelect) await studio.openDocument(openSelect);
      openSelect = '';
    }}
  >
    <option value="">Open…</option>
    {#each documents as d (d.name)}
      <option value={d.name}>{d.name}</option>
    {/each}
  </Select>
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
    <Select class="w-40" bind:value={addType} aria-label="element type">
      {#each ADD_TYPES as [value, label] (value)}
        <option {value}>{label}</option>
      {/each}
    </Select>
    <Button size="sm" variant="secondary" onclick={addElement} title="Add after the selected element" data-testid="add-element">
      <Plus /> Add
    </Button>
    <Separator class="mx-1 h-5 w-px" />
    <Button size="icon" variant="ghost" onclick={() => studio.undo()} disabled={!studio.canUndo} title="Undo">
      <Undo2 />
    </Button>
    <Button size="icon" variant="ghost" onclick={() => studio.redo()} disabled={!studio.canRedo} title="Redo">
      <Redo2 />
    </Button>
  </div>
</header>
