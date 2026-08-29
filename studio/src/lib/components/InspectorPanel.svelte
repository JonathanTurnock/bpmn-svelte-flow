<script lang="ts">
  import { studio } from '../studio.svelte.js';
  import Button from './ui/button.svelte';
  import Badge from './ui/badge.svelte';
  import Input from './ui/input.svelte';
  import Label from './ui/label.svelte';
  import Separator from './ui/separator.svelte';
  import Textarea from './ui/textarea.svelte';
  import CodeEditor from './CodeEditor.svelte';

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
      dirty = false;
    } catch {
      detail = null;
    }
  });

  const isFlow = $derived(detail?.type === 'SequenceFlow');
  const hasScript = $derived(detail ? SCRIPTABLE.has(detail.type) : false);
  const hasMock = $derived(detail ? MOCKABLE.has(detail.type) : false);

  async function save() {
    if (!detail) return;
    const id = detail.id as string;
    await studio.mutate(() => {
      if (!isFlow) studio.updateElement({ id, name });
      else if (name !== (detail!.name ?? '')) studio.updateElement({ id, name });
      studio.setDocumentation({ id, text: documentation });
      if (hasScript) studio.setScript({ scriptTaskId: id, code });
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
  <div class="p-4 text-sm text-muted-foreground">
    Select an element on the canvas — or drive the studio from the chat: every panel here has a
    WebMCP tool equivalent.
  </div>
{:else}
  <div class="flex h-full flex-col gap-3 overflow-y-auto p-3" data-testid="inspector">
    <div class="flex items-center gap-2">
      <Badge variant="secondary">{detail.type}</Badge>
      <span class="truncate font-mono text-xs text-muted-foreground">{detail.id}</span>
      {#if detail.eventDefinition}<Badge variant="outline">{detail.eventDefinition}</Badge>{/if}
      {#if detail.multiInstance}<Badge variant="outline">multi-instance</Badge>{/if}
      {#if detail.default}<Badge variant="outline">default</Badge>{/if}
    </div>

    <div class="grid gap-1">
      <Label>Name</Label>
      <Input bind:value={name} oninput={() => (dirty = true)} placeholder="name" />
    </div>

    <div class="grid gap-1">
      <Label>Documentation (bpmn:documentation)</Label>
      <Textarea bind:value={documentation} oninput={() => (dirty = true)} rows={3} />
    </div>

    {#if isFlow}
      <div class="grid min-h-[90px] gap-1">
        <Label>Condition (JavaScript over payload)</Label>
        <CodeEditor bind:value={condition} onchange={() => (dirty = true)} />
      </div>
      <Button variant="outline" size="sm" onclick={makeDefault}>Mark as default flow</Button>
    {/if}

    {#if hasScript}
      <div class="grid min-h-[140px] flex-1 gap-1">
        <Label>Script (bpmn:script, text/javascript)</Label>
        <CodeEditor bind:value={code} onchange={() => (dirty = true)} minHeight="120px" />
      </div>
    {:else if hasMock}
      <div class="grid min-h-[140px] flex-1 gap-1">
        <Label>Mock (lunatic:mock — browser stand-in)</Label>
        <CodeEditor bind:value={code} onchange={() => (dirty = true)} minHeight="120px" />
      </div>
      <div class="grid gap-1">
        <Label>Binding type (lunatic:binding)</Label>
        <Input
          bind:value={bindingType}
          oninput={() => (dirty = true)}
          placeholder="http · kafka-producer · decision · …"
        />
      </div>
      {#if bindingType}
        <div class="grid min-h-[70px] gap-1">
          <Label>Binding properties (JSON name/value list)</Label>
          <CodeEditor bind:value={bindingProps} language="json" onchange={() => (dirty = true)} minHeight="60px" />
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
