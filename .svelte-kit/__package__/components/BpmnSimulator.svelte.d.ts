import '@xyflow/svelte/dist/style.css';
type $$ComponentProps = {
    /** BPMN 2.0 XML document to simulate. */
    xml: string;
    /** Initial JavaScript attachments, keyed by element id. */
    scripts?: Record<string, string>;
    /** Initial payload injected at start events. */
    payload?: Record<string, unknown>;
    height?: string;
    width?: string;
    /** Milliseconds between steps while playing. */
    stepDelay?: number;
};
declare const BpmnSimulator: import("svelte").Component<$$ComponentProps, {}, "">;
type BpmnSimulator = ReturnType<typeof BpmnSimulator>;
export default BpmnSimulator;
