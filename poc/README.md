# Messaging Platform — flow PoC

A visual PoC of the messaging platform's end-to-end flow, built on
[bpmn-js](https://bpmn.io). It lets a dev jump in, simulate a payload, watch
every transformation applied to it, and read the business logic behind each
step — then go build the real thing informed.

**Plain HTML/JS/CSS — no build step, no dependencies.** Deploying to Pages
(or any static host) is copying this folder:

```
poc/
  index.html      the app shell
  app.js          walkthrough driver (viewer, highlighting, payload diffs)
  scenarios.js    the scripted scenarios: steps, business logic, transforms
  style.css       layout + diagram highlighting
  flow.bpmn       the diagram (edit in any BPMN modeler, e.g. bpmn.io)
  vendor/         bpmn-js pre-built viewer + its stylesheets (vendored)
```

Local preview (any static server works):

```sh
npx serve poc        # or: python3 -m http.server -d poc 8000
```

## The flow (`flow.bpmn`)

One pool, three lanes:

1. **Ingress API** — message received → regex security filters (PAN/CVV/IBAN
   redaction) → Cedar policy evaluation → allow/deny gateway → save via the
   Messages API (deny → `403 rejected`).
2. **Stream Processor** — waits for the Messages API to propagate to Kinesis
   (async boundary: the payload visibly collapses to the stream record), joins
   the record with the cached original request context, fetches chat
   participants.
3. **Delivery** — a multi-instance sub-process per participant: delivery
   method routes to a keyed Kafka message or a signed webhook call.

## The walkthrough (`scenarios.js`)

Two scripted scenarios — *Happy path* and *Policy denied (muted sender)*.
Each step declares: the diagram elements it activates, the business logic
shown verbatim (the actual redaction regexes, the Cedar policy source, join
semantics, producer config, webhook signing/retry), and a pure
payload-transformation function. The side panel renders the logic, the
payload, and a per-step change list (`+ added`, `~ changed`, `- removed`).

Edit `scenarios.js` to change payloads or logic; edit `flow.bpmn` to change
the diagram — element ids are the link between the two.
