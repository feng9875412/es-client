export type MCP = {
  name: string;
  description: string;
  parameters: Record<string, any>;
  platform?: 'browser' | 'tauri' | 'all';
  isQuery: boolean;
};
