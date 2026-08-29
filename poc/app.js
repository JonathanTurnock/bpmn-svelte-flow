/**
 * Messaging Platform flow PoC — plain-JS app.
 * Loads flow.bpmn into the vendored bpmn-js viewer and drives the scripted
 * walkthrough defined in scenarios.js. No build step: deploy this folder to
 * any static host.
 */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const viewer = new BpmnJS({ container: $('#canvas') });
  const scenarios = window.SCENARIOS;

  let scenario = scenarios[0];
  let stepIndex = -1; // -1 = not started
  let payload = {};
  let previousPayload = {};
  let playTimer;

  const canvas = () => viewer.get('canvas');
  const overlays = () => viewer.get('overlays');

  /** Flat list of dotted paths whose values differ between two objects. */
  function changedPaths(prev, next, prefix, out) {
    prefix = prefix || '';
    out = out || [];
    const keys = new Set(
      Object.keys(prev || {}).concat(Object.keys(next || {}))
    );
    for (const key of keys) {
      const path = prefix ? prefix + '.' + key : key;
      const a = prev ? prev[key] : undefined;
      const b = next ? next[key] : undefined;
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      const bothObjects =
        a && b && typeof a === 'object' && typeof b === 'object' &&
        !Array.isArray(a) && !Array.isArray(b);
      if (bothObjects) changedPaths(a, b, path, out);
      else out.push(b === undefined ? '- ' + path : a === undefined ? '+ ' + path : '~ ' + path);
    }
    return out;
  }

  function clearMarkers() {
    viewer.get('elementRegistry').forEach((element) => {
      canvas().removeMarker(element.id, 'step-active');
      canvas().removeMarker(element.id, 'step-visited');
    });
    overlays().remove({ type: 'token' });
  }

  function render() {
    const steps = scenario.steps;
    const started = stepIndex >= 0;
    const step = started ? steps[stepIndex] : undefined;

    // markers: everything up to stepIndex is visited, current is active
    clearMarkers();
    for (let i = 0; i <= stepIndex; i++) {
      const s = steps[i];
      const isCurrent = i === stepIndex;
      for (const id of s.elements) {
        canvas().addMarker(id, isCurrent ? 'step-active' : 'step-visited');
      }
      for (const id of s.edges || []) {
        canvas().addMarker(id, 'step-visited');
      }
    }

    // token dots on the current step's elements
    if (step) {
      step.elements
        .filter((id) => id !== 'Sub_Deliver')
        .forEach((id, i) => {
          overlays().add(id, 'token', {
            position: { top: -9, right: 9 },
            html: '<div class="token-dot">' + (i + 1) + '</div>'
          });
        });
    }

    // side panel
    $('#step-title').textContent = step ? step.title : 'Press Step to begin';
    $('#step-note').textContent = step ? step.note : 'Scenario: ' + scenario.name;
    $('#logic-label').textContent = step
      ? 'Business logic — ' + step.logicLabel
      : 'Business logic';
    $('#logic').textContent = step ? step.logic : '—';
    $('#payload').textContent = JSON.stringify(payload, null, 2);

    const changes = started ? changedPaths(previousPayload, payload) : [];
    $('#changes-badge').textContent = changes.length
      ? '· ' + changes.length + ' change' + (changes.length > 1 ? 's' : '') + ' this step'
      : '';
    const list = $('#changes');
    list.innerHTML = '';
    for (const change of changes.slice(0, 12)) {
      const li = document.createElement('li');
      li.textContent = change;
      if (change.startsWith('-')) li.className = 'removed';
      list.appendChild(li);
    }

    $('#progress').textContent = started
      ? 'step ' + (stepIndex + 1) + ' / ' + steps.length
      : steps.length + ' steps';
    $('#step').disabled = stepIndex >= steps.length - 1;
    $('#play').disabled = stepIndex >= steps.length - 1;
  }

  function doStep() {
    if (stepIndex >= scenario.steps.length - 1) return;
    stepIndex += 1;
    const step = scenario.steps[stepIndex];
    previousPayload = payload;
    if (step.apply) payload = step.apply(payload);
    render();
  }

  function reset(next) {
    if (playTimer) window.clearInterval(playTimer);
    playTimer = undefined;
    if (next) scenario = next;
    stepIndex = -1;
    payload = JSON.parse(JSON.stringify(scenario.payload));
    previousPayload = payload;
    render();
  }

  function play() {
    if (playTimer) return;
    doStep();
    playTimer = window.setInterval(() => {
      doStep();
      if (stepIndex >= scenario.steps.length - 1 && playTimer) {
        window.clearInterval(playTimer);
        playTimer = undefined;
      }
    }, 1600);
  }

  async function init() {
    const response = await fetch('flow.bpmn');
    if (!response.ok) throw new Error('Could not load flow.bpmn (' + response.status + ')');
    await viewer.importXML(await response.text());
    canvas().zoom('fit-viewport', 'auto');

    const select = $('#scenario');
    for (const s of scenarios) {
      const option = document.createElement('option');
      option.value = s.id;
      option.textContent = s.name;
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      reset(scenarios.find((s) => s.id === select.value));
    });
    $('#step').addEventListener('click', doStep);
    $('#play').addEventListener('click', play);
    $('#reset').addEventListener('click', () => reset());

    reset();
  }

  init().catch((err) => {
    document.body.innerHTML =
      '<pre style="color:#b3261e;padding:20px">' + ((err && err.message) || err) + '</pre>';
  });
})();
