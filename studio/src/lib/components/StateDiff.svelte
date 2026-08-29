<script lang="ts">
  import { EditorView } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import { json } from '@codemirror/lang-json';
  import { unifiedMergeView } from '@codemirror/merge';
  import { bsfHighlight } from '../codemirror.js';

  // Read-only unified diff of a payload state: `after` is the document,
  // `before` (when given) renders as deleted chunks above the lines that
  // replaced them. Without `before` it is a plain highlighted state view.
  let {
    before = null,
    after = {}
  }: {
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown>;
  } = $props();

  let container: HTMLDivElement;

  const pretty = (v: unknown) => JSON.stringify(v, null, 2) ?? '';

  $effect(() => {
    const extensions = [
      json(),
      bsfHighlight,
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { fontSize: '11px', backgroundColor: 'transparent' },
        '.cm-content': { padding: '6px 0' }
      })
    ];
    if (before) {
      extensions.push(
        unifiedMergeView({
          original: pretty(before),
          mergeControls: false,
          gutter: false,
          collapseUnchanged: { margin: 1, minSize: 6 }
        })
      );
    }
    const view = new EditorView({
      parent: container,
      state: EditorState.create({ doc: pretty(after), extensions })
    });
    return () => view.destroy();
  });
</script>

<div
  bind:this={container}
  class="max-h-72 overflow-y-auto rounded-md border bg-background"
  data-testid="step-state"
></div>
