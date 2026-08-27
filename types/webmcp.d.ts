type WebMCPResult = { content: Array<{ type: "text"; text: string }> };
type WebMCPTool = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => WebMCPResult | Promise<WebMCPResult>;
};
interface Document {
  modelContext?: {
    registerTool(tool: WebMCPTool, options?: { signal?: AbortSignal }): void | Promise<void>;
  };
}
