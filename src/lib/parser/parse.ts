// @ts-expect-error - bpmn-moddle ships no bundled type declarations for its entry
import { BpmnModdle } from 'bpmn-moddle';

export interface ParseResult {
  /** The bpmn:Definitions moddle element. */
  definitions: any;
  /** Import warnings reported by bpmn-moddle. */
  warnings: string[];
}

const moddle = new BpmnModdle();

/**
 * Parses a BPMN 2.0 XML document into a bpmn-moddle definitions tree.
 * Supports the full BPMN 2.0 schema (semantic + DI).
 */
export async function parseBpmn(xml: string): Promise<ParseResult> {
  const { rootElement, warnings = [] } = await moddle.fromXML(xml);
  return {
    definitions: rootElement,
    warnings: warnings.map((w: any) => (typeof w === 'string' ? w : (w?.message ?? String(w))))
  };
}
