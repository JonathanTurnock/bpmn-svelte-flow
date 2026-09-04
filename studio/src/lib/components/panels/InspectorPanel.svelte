<script lang="ts">
  import { MousePointerClick } from '@lucide/svelte';
  import { studio } from '../../studio.svelte.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import CodeEditor from '../CodeEditor.svelte';

  const SCRIPTABLE = new Set(['ScriptTask']);
  const MOCKABLE = new Set([
    'Task',
    'ServiceTask',
    'SendTask',
    'ReceiveTask',
    'UserTask',
    'ManualTask',
    'BusinessRuleTask',
    'CallActivity'
  ]);

  let detail = $state<Record<string, any> | null>(null);
  let name = $state('');
  let documentation = $state('');
  let code = $state('');
  let condition = $state('');
  let bindingType = $state('');
  let bindingProps = $state('');
  let instructions = $state('');
  let dirty = $state(false);

  $effect(() => {
    void studio.modelVersion;
    const id = studio.selectedId;
    if (!id) {
      detail = null;
      return;
    }
    try {
      const d = studio.elementDetail(id) as Record<string, any>;
      detail = d;
      name = String(d.name ?? '');
      documentation = String(d.documentation ?? '');
      code = String(d.script ?? d.mock ?? '');
      condition = String(d.condition ?? '');
      bindingType = d.binding?.type ?? '';
      bindingProps = d.binding?.properties?.length ? JSON.stringify(d.binding.properties, null, 2) : '';
      instructions = String(d.instructions ?? '');
      dirty = false;
    } catch {
      detail = null;
    }
  });

  const isFlow = $derived(detail?.type === 'SequenceFlow');
  const hasScript = $derived(detail ? SCRIPTABLE.has(detail.type) : false);
  const hasMock = $derived(detail ? MOCKABLE.has(detail.type) : false);
  const hasInstructions = $derived(detail ? MOCKABLE.has(detail.type) || SCRIPTABLE.has(detail.type) : false);

  async function save() {
    if (!detail) return;
    const id = detail.id as string;
    await studio.mutate(() => {
      if (!isFlow) studio.updateElement({ id, name });
      else if (name !== (detail!.name ?? '')) studio.updateElement({ id, name });
      studio.setDocumentation({ id, text: documentation });
      if (hasScript) studio.setScript({ scriptTaskId: id, code });
      if (hasInstructions) studio.setInstructions({ taskId: id, text: instructions.trim() || undefined });
      if (hasMock) studio.setMock({ taskId: id, code: code || undefined });
      if (hasMock) {
        studio.setBinding({
          taskId: id,
          type: bindingType || undefined,
          properties: bindingProps ? JSON.parse(bindingProps) : []
        });
      }
      if (isFlow) studio.setCondition({ flowId: id, expression: condition || undefined });
    });
    dirty = false;
  }

  async function makeDefault() {
    if (!detail) return;
    const flowId = detail.id as string;
    const summary = studio.modelSummary() as any;
    const flow = summary.flows.find((f: any) => f.id === flowId);
    if (!flow) return;
    await studio.mutate(() => studio.setDefaultFlow({ gatewayId: flow.source, flowId }));
  }

  async function remove() {
    if (!detail) return;
    await studio.mutate(() => studio.deleteElement({ id: detail!.id }));
  }
</script>

{#if !detail}
  <div class="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
    <MousePointerClick class="size-8 text-muted-foreground/50" />
    <p class="text-sm font-medium">Nothing selected</p>
    <p class="text-sm text-muted-foreground">
      Select an element on the canvas, or drive the studio from the chat — every panel has a WebMCP
      tool equivalent.
    </p>
  </div>
{:else}
  <div class="flex h-full flex-col gap-4 overflow-y-auto p-4 *:shrink-0" data-testid="inspector">
    <div class="flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary">{detail.type}</Badge>
      {#if detail.eventDefinition}<Badge variant="outline">{detail.eventDefinition}</Badge>{/if}
      {#if detail.multiInstance}<Badge variant="outline">multi-instance</Badge>{/if}
      {#if detail.default}<Badge variant="outline">default</Badge>{/if}
      <span class="truncate font-mono text-xs text-muted-foreground">{detail.id}</span>
    </div>

    <div class="grid gap-2">
      <Label for="inspector-name">Name</Label>
      <Input id="inspector-name" bind:value={name} oninput={() => (dirty = true)} placeholder="name" />
    </div>

    <div class="grid gap-2">
      <Label for="inspector-doc">Documentation</Label>
      <Textarea id="inspector-doc" bind:value={documentation} oninput={() => (dirty = true)} rows={3} />
      <p class="text-xs text-muted-foreground">bpmn:documentation — the business logic in prose.</p>
    </div>

    {#if isFlow}
      <div class="grid min-h-[90px] gap-2">
        <Label>Condition</Label>
        <CodeEditor bind:value={condition} label="Condition" onchange={() => (dirty = true)} />
        <p class="text-xs text-muted-foreground">JavaScript over <code>payload</code>, e.g. payload.amount &gt; 1000.</p>
      </div>
      <Button variant="outline" size="sm" onclick={makeDefault}>Mark as default flow</Button>
    {/if}

    {#if hasScript}
      <div class="grid gap-2">
        <Label>Script</Label>
        <CodeEditor bind:value={code} label="Script" onchange={() => (dirty = true)} minHeight="120px" maxHeight="240px" />
        <p class="text-xs text-muted-foreground">bpmn:script, text/javascript — mutates <code>payload</code>.</p>
      </div>
    {:else if hasMock}
      <div class="grid gap-2">
        <Label>Mock</Label>
        <CodeEditor bind:value={code} label="Mock" onchange={() => (dirty = true)} minHeight="120px" maxHeight="240px" />
        <p class="text-xs text-muted-foreground">bsf:mock — the browser stand-in for this task.</p>
      </div>
      <div class="grid gap-2">
        <Label for="inspector-binding">Binding type</Label>
        <Input
          id="inspector-binding"
          bind:value={bindingType}
          oninput={() => (dirty = true)}
          placeholder="http · kafka-producer · decision · …"
        />
        <p class="text-xs text-muted-foreground">bsf:binding — real-world implementation intent.</p>
      </div>
      {#if bindingType}
        <div class="grid min-h-[70px] gap-2">
          <Label>Binding properties</Label>
          <CodeEditor bind:value={bindingProps} language="json" label="Binding properties" onchange={() => (dirty = true)} minHeight="60px" />
        </div>
      {/if}
    {/if}

    {#if hasInstructions}
      <div class="grid gap-2">
        <Label for="inspector-instructions">Agent instructions</Label>
        <Textarea
          id="inspector-instructions"
          bind:value={instructions}
          oninput={() => (dirty = true)}
          rows={4}
          placeholder="What should an LLM agent do at this task, and which payload fields should it set?"
        />
        <p class="text-xs text-muted-foreground">
          bsf:instructions — the work item an LLM agent performs via the <code>bsf-agent</code> CLI.
          The mock stands in for the agent during simulation.
        </p>
      </div>
      {#if detail.code}
        <div class="grid gap-2">
          <div class="flex items-center gap-2">
            <Label>Agent code</Label>
            <Badge variant="outline">{detail.code.language}</Badge>
          </div>
          <pre class="max-h-48 overflow-auto rounded-lg border bg-muted/30 p-2.5 font-mono text-xs leading-snug">{detail.code.body}</pre>
          <p class="text-xs text-muted-foreground">
            bsf:code — executed by the agent in its own runtime, never by the engine (ADR-0003).
            Edit it in the XML view.
          </p>
        </div>
      {/if}
    {/if}

    <Separator />
    <div class="flex gap-2">
      <Button size="sm" onclick={save} disabled={!dirty} data-testid="inspector-save">Apply</Button>
      <Button size="sm" variant="destructive" onclick={remove}>Delete</Button>
    </div>
  </div>
{/if}
