import axios from 'axios';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string };

export interface ChatCompletionChoice {
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: 'stop' | 'tool_calls' | 'length' | string;
}

export interface ChatCompletionResponse {
  choices: ChatCompletionChoice[];
}

export async function chatCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
  temperature?: number
): Promise<ChatCompletionChoice> {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const body: Record<string, any> = {
    model,
    messages,
    stream: false,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }
  if (temperature !== undefined) {
    body.temperature = temperature;
  }
  const response = await axios.post<ChatCompletionResponse>(url, body, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 120000,
  });
  return response.data.choices[0];
}
