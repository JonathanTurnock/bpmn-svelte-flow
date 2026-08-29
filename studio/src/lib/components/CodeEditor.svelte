<script lang="ts">
  import { EditorView, keymap, lineNumbers } from '@codemirror/view';
  import { EditorState, Compartment } from '@codemirror/state';
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
  import { javascript } from '@codemirror/lang-javascript';
  import { xml } from '@codemirror/lang-xml';
  import { json } from '@codemirror/lang-json';

  let {
    value = $bindable(''),
    language = 'javascript',
    readonly = false,
    minHeight = '80px',
    onchange
  }: {
    value?: string;
    language?: 'javascript' | 'xml' | 'json';
    readonly?: boolean;
    minHeight?: string;
    onchange?: (value: string) => void;
  } = $props();

  let container: HTMLDivElement;
  let view: EditorView | undefined;
  const readonlyCompartment = new Compartment();

  function lang() {
    if (language === 'xml') return xml();
    if (language === 'json') return json();
    return javascript();
  }

  $effect(() => {
    view = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          lang(),
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
<div
  bind:this={container}
  class="min-h-0 w-full overflow-hidden rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30"
></div>
