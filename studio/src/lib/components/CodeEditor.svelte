<script lang="ts">
  import { onMount } from 'svelte';
  import { EditorView, keymap, lineNumbers } from '@codemirror/view';
  import { EditorState, Compartment } from '@codemirror/state';
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
  import { javascript } from '@codemirror/lang-javascript';
  import { xml } from '@codemirror/lang-xml';
  import { json } from '@codemirror/lang-json';
  import { Maximize2 } from '@lucide/svelte';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { bsfHighlight } from '../codemirror.js';
  import Self from './CodeEditor.svelte';

  let {
    value = $bindable(''),
    language = 'javascript',
    readonly = false,
    minHeight = '80px',
    label = 'Code',
    expandable = true,
    onchange
  }: {
    value?: string;
    language?: 'javascript' | 'xml' | 'json';
    readonly?: boolean;
    minHeight?: string;
    /** Title of the expanded editor dialog. */
    label?: string;
    expandable?: boolean;
    onchange?: (value: string) => void;
  } = $props();

  let container: HTMLDivElement;
  let view: EditorView | undefined;
  let expandedOpen = $state(false);
  const readonlyCompartment = new Compartment();

  function lang() {
    if (language === 'xml') return xml();
    if (language === 'json') return json();
    return javascript();
  }

  // Mount-only: recreating the view on reactive changes would reset the
  // cursor on every keystroke (value is a dependency via `doc`). External
  // value changes are applied by the sync effect below instead.
  onMount(() => {
    view = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          lang(),
          bsfHighlight,
          readonlyCompartment.of(EditorState.readOnly.of(readonly)),
          EditorView.lineWrapping,
          EditorView.theme({ '&': { minHeight } }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              value = update.state.doc.toString();
              onchange?.(value);
            }
          })
        ]
      })
    });
    return () => view?.destroy();
  });

  // External value changes (e.g. a fresh XML export) replace the doc.
  $effect(() => {
    const next = value;
    if (view && view.state.doc.toString() !== next) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
    }
  });

  $effect(() => {
    view?.dispatch({ effects: readonlyCompartment.reconfigure(EditorState.readOnly.of(readonly)) });
  });
</script>

<!-- Chrome mirrors the stock shadcn input: border-input + ring on focus. -->
<div class="group/editor relative min-h-0">
  <div
    bind:this={container}
    class="min-h-0 w-full overflow-hidden rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30"
  ></div>
  {#if expandable}
    <Button
      size="sm"
      variant="ghost"
      class="absolute top-1 right-1 size-6 p-0 opacity-0 transition-opacity group-hover/editor:opacity-100 focus-visible:opacity-100"
      aria-label="Expand editor"
      data-testid="expand-editor"
      onclick={() => (expandedOpen = true)}
    >
      <Maximize2 class="size-3.5" />
    </Button>
    <Dialog.Root bind:open={expandedOpen}>
      <Dialog.Content class="flex h-[78vh] flex-col gap-3 sm:max-w-[min(92vw,64rem)]">
        <Dialog.Header>
          <Dialog.Title>{label}</Dialog.Title>
        </Dialog.Header>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <Self bind:value {language} {readonly} {onchange} minHeight="100%" expandable={false} />
        </div>
      </Dialog.Content>
    </Dialog.Root>
  {/if}
</div>
