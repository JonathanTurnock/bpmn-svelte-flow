/// <reference types="vite/client" />

declare module '*.bpmn?raw' {
  const src: string;
  export default src;
}

declare module 'bpmn-js/lib/NavigatedViewer' {
  const NavigatedViewer: any;
  export default NavigatedViewer;
}
