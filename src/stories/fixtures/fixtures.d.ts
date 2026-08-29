/**
 * Ambient declaration for the Vite raw imports used by the BPMN file
 * fixtures: `import quickstart from './fixtures/quickstart.bpmn?raw';`
 */
declare module '*.bpmn?raw' {
  const src: string;
  export default src;
}
