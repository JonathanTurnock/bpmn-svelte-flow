/**
 * WebMCP adapter. Registers the studio tools with the browser's
 * `navigator.modelContext` so a WebMCP-compliant chat client can drive the
 * studio; the API surface is still settling, so both the `registerTool` and
 * `provideContext` shapes are supported. The same tools are always exposed
 * on `window.lunatic` for console use and automated testing.
 */
import { tools, type StudioTool } from './tools.js';

interface ToolRegistration {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}

function toRegistration(tool: StudioTool): ToolRegistration {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: 'object',
      properties: tool.input,
      ...(tool.required?.length ? { required: tool.required } : {})
    },
    async execute(args: Record<string, unknown>) {
      const result = await runTool(tool.name, args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  };
}

/** Run one tool by name; errors come back as { ok: false, error }. */
export async function runTool(name: string, args: Record<string, unknown> = {}) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { ok: false, error: `unknown tool "${name}"` };
  try {
    return await tool.run(args ?? {});
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function registerWebMcp(): { api: string; tools: number } {
  const registrations = tools.map(toRegistration);

  (window as any).lunatic = {
    tools: Object.fromEntries(tools.map((t) => [t.name, t])),
    list: () => tools.map((t) => ({ name: t.name, description: t.description })),
    call: runTool
  };

  const mc = (navigator as any).modelContext;
  if (mc?.registerTool) {
    for (const r of registrations) mc.registerTool(r);
    return { api: 'registerTool', tools: registrations.length };
  }
  if (mc?.provideContext) {
    mc.provideContext({ tools: registrations });
    return { api: 'provideContext', tools: registrations.length };
  }
  return { api: 'window.lunatic', tools: registrations.length };
}
