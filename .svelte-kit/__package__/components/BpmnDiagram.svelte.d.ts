import '@xyflow/svelte/dist/style.css';
import type { BpmnFlowEdge, BpmnFlowNode } from '../types.js';
type $$ComponentProps = {
    /** BPMN 2.0 XML document to render. */
    xml: string;
    /** Optional id of the BPMNDiagram to render (defaults to the first). */
    diagramId?: string;
    /** CSS height of the canvas container. */
    height?: string;
    /** CSS width of the canvas container. */
    width?: string;
    /** Show the dotted canvas background. */
    background?: boolean;
    /** Show zoom/fit controls. */
    controls?: boolean;
    /** Show a minimap. */
    minimap?: boolean;
    /** Allow panning/zooming/selection. */
    interactive?: boolean;
    /** Padding passed to fitView. */
    fitViewPadding?: number;
    /** Called after a document is parsed and rendered. */
    onload?: (info: {
        nodes: BpmnFlowNode[];
        edges: BpmnFlowEdge[];
        warnings: string[];
    }) => void;
    /** Called when parsing fails. */
    onerror?: (error: Error) => void;
};
declare const BpmnDiagram: import("svelte").Component<$$ComponentProps, {}, "">;
type BpmnDiagram = ReturnType<typeof BpmnDiagram>;
export default BpmnDiagram;
