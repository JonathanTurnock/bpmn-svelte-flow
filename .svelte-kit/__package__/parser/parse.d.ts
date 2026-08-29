export interface ParseResult {
    /** The bpmn:Definitions moddle element. */
    definitions: any;
    /** Import warnings reported by bpmn-moddle. */
    warnings: string[];
}
/**
 * Parses a BPMN 2.0 XML document into a bpmn-moddle definitions tree.
 * Supports the full BPMN 2.0 schema (semantic + DI).
 */
export declare function parseBpmn(xml: string): Promise<ParseResult>;
