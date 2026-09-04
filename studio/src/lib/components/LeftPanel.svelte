<script lang="ts">
  import { FileText, FolderOpen, Plus, Trash2 } from '@lucide/svelte';
  import { studio } from '../studio.svelte.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';

  const documents = $derived.by(() => {
    void studio.workspaceVersion;
    return studio.listDocuments();
  });

  const PALETTE: ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, string]>]> = [
    [
      'Tasks',
      [
        ['task', 'Task'],
        ['userTask', 'User task'],
        ['serviceTask', 'Service task'],
        ['scriptTask', 'Script task'],
        ['sendTask', 'Send task'],
        ['receiveTask', 'Receive task'],
        ['businessRuleTask', 'Business rule task'],
        ['callActivity', 'Call activity'],
        ['subProcess', 'Sub-process']
      ]
    ],
    [
      'Gateways',
      [
        ['exclusiveGateway', 'Exclusive'],
        ['parallelGateway', 'Parallel'],
        ['inclusiveGateway', 'Inclusive'],
        ['eventBasedGateway', 'Event-based']
      ]
    ],
    [
      'Events',
      [
        ['startEvent', 'Start'],
        ['endEvent', 'End'],
        ['intermediateCatchEvent', 'Catch'],
        ['intermediateThrowEvent', 'Throw']
      ]
    ],
    ['Other', [['textAnnotation', 'Annotation']]]
  ];

  async function addElement(type: string) {
    const after = studio.selectedId ?? undefined;
    const { id } = await studio.mutate(() => studio.addElement({ type, afterElementId: after }));
    studio.selectedId = id;
  }

  async function loadSample(name: string) {
    const res = await fetch(`${import.meta.env.BASE_URL}samples/${name}.bpmn`);
    await studio.importXml(await res.text(), name);
  }
</script>

<div class="flex h-full flex-col gap-4 overflow-y-auto p-3" data-testid="left-panel">
  <div class="grid gap-1.5">
    <Label class="px-1 text-xs text-muted-foreground">Workspace</Label>
    {#each documents as d (d.name)}
      <div class="group/doc flex items-center rounded-md hover:bg-accent">
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-[13px]"
          class:font-semibold={d.name === studio.docName}
          onclick={() => studio.openDocument(d.name)}
          title={`saved ${d.savedAt}`}
        >
          <FileText class="size-3.5 shrink-0 text-muted-foreground" />
          <span class="truncate">{d.name}</span>
        </button>
        <Button
          size="sm"
          variant="ghost"
          class="mr-1 size-6 shrink-0 p-0 opacity-0 group-hover/doc:opacity-100"
          aria-label={`Delete ${d.name}`}
          onclick={() => studio.deleteDocument(d.name)}
        >
          <Trash2 class="size-3" />
        </Button>
      </div>
    {:else}
      <p class="px-2 py-1 text-xs text-muted-foreground">No saved documents yet.</p>
    {/each}
    <Button size="sm" variant="ghost" class="justify-start" onclick={() => loadSample('messaging-flow')}>
      <FolderOpen /> messaging-flow sample
    </Button>
    <Button
      size="sm"
      variant="ghost"
      class="justify-start"
      title="Ticket triage driven by an LLM agent via the bsf-agent CLI"
      onclick={() => loadSample('agent-triage')}
    >
      <FolderOpen /> agent-triage sample
    </Button>
  </div>

  <Separator />

  <div class="grid gap-3">
    <Label class="px-1 text-xs text-muted-foreground">Palette</Label>
    {#each PALETTE as [group, items] (group)}
      <div class="grid gap-1">
        <span class="px-1 text-[10px] font-semibold tracking-wide text-muted-foreground/70 uppercase"
          >{group}</span
        >
        <div class="grid grid-cols-2 gap-1">
          {#each items as [type, label] (type)}
            <Button
              size="sm"
              variant="outline"
              class="h-7 justify-start px-2 text-xs font-normal"
              onclick={() => addElement(type)}
              title="Add after the selected element"
              data-testid={`palette-${type}`}
            >
              <Plus class="size-3 text-muted-foreground" />
              <span class="truncate">{label}</span>
            </Button>
          {/each}
        </div>
      </div>
    {/each}
    <p class="px-1 text-xs text-muted-foreground">
      New elements connect after the selected element.
    </p>
  </div>
</div>
