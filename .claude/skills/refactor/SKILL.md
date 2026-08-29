---
name: refactor
description: Pick highest-scored clean-code TODO, fix it, stop. Loop handles repetition.
---

One pass = one fix.

1. Scan for `// TODO: clean-code -` markers.
2. Pick highest-scored.
3. Fix. Remove marker.
4. Verify: `npx svelte-check --tsconfig ./tsconfig.json` (0 errors), `npm test`
   (all PASS), and `npm run build-storybook` when the fix touches components
   or stories.
5. Report: what, where, score.
6. Stop.

All markers ≤ 0.5 → report "clean", stop.
No markers → report "clean", stop.
