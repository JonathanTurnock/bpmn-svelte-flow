# Reference workflows

Third-party BPMN 2.0 diagrams used to check this renderer against the wider
ecosystem (bpmn-js is the rendering oracle; see `tests/reference.test.mjs`
and the side-by-side comparison in the repo history). Files are unmodified.

| File | Source | What it exercises |
|---|---|---|
| `starter.bpmn` | [bpmn-io/bpmn-js-examples · starter/diagram.bpmn](https://github.com/bpmn-io/bpmn-js-examples/blob/main/starter/diagram.bpmn) | The bpmn.io hello-world starter diagram |
| `invoice.bpmn` | [camunda/camunda-bpm-platform · examples/invoice/invoice.v2.bpmn](https://github.com/camunda/camunda-bpm-platform/blob/master/examples/invoice/src/main/resources/invoice.v2.bpmn) | The classic HR-style invoice approval: lanes, user tasks, boundary timer, call activity, XOR gateways |
| `pizza-collaboration.bpmn` | [bpmn-io/bpmn-js-examples · colors/resources/pizza-collaboration.bpmn](https://github.com/bpmn-io/bpmn-js-examples/blob/main/colors/resources/pizza-collaboration.bpmn) | Two pools, message flows, event-based gateway, timer/message events |
| `miwg-A.1.0.bpmn` | [bpmn-miwg/bpmn-miwg-test-suite · Reference/A.1.0.bpmn](https://github.com/bpmn-miwg/bpmn-miwg-test-suite/blob/master/Reference/A.1.0.bpmn) | OMG BPMN Model Interchange Working Group reference — simple sequence |
| `miwg-B.2.0.bpmn` | [bpmn-miwg/bpmn-miwg-test-suite · Reference/B.2.0.bpmn](https://github.com/bpmn-miwg/bpmn-miwg-test-suite/blob/master/Reference/B.2.0.bpmn) | OMG MIWG reference — the demanding one: pools, nested lanes, sub-processes, boundary events, data objects/stores, groups, annotations |

Licences: bpmn-js-examples (MIT), camunda-bpm-platform examples (Apache-2.0),
bpmn-miwg-test-suite (MIT-style interchange references). Files are used here
as test fixtures only.
