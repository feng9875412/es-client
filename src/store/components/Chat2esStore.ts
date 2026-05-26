import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {useUrlStore} from "@/store/UrlStore";
import {useIndexStore} from "@/store/IndexStore";
import {chatCompletion, type ChatMessage} from "@/page/chat2es/apis/chat";
import {agentTools, executeToolCall} from "@/page/chat2es/agent/tools";
import {useModelSettingStore} from "@/store/components/ModelSettingStore";
import MessageUtil from "@/utils/model/MessageUtil";

const MAX_TOOL_ROUNDS = 5;
const CHARS_PER_TOKEN = 2.5;

export interface DisplayMessage {
  role: 'user' | 'assistant' | 'tool-calling';
  content: string;
  toolCalls?: Array<{ name: string; args: string; result?: string }>;
}

export interface VizPanel {
  id: string;
  title: string;
  type: 'json' | 'table' | 'text';
  data: any;
  timestamp: number;
}

export const useChat2esStore = defineStore('chat2es', () => {
  const displayMessages = ref<Array<DisplayMessage>>([]);
  const loading = ref(false);
  const toolStatus = ref('');
  const vizPanels = ref<VizPanel[]>([]);
  const activeVizId = ref<string>('');

  const modelStore = useModelSettingStore();

  const configured = computed(() => modelStore.configured);

  function buildSystemPrompt(): string {
    const urlStore = useUrlStore();
    const indexStore = useIndexStore();
    const esUrl = urlStore.current || '未连接';
    const indexNames = indexStore.list.map(i => i.name).slice(0, 50).join(', ') || '无';
    const selectedIndex = indexStore.currentIndex || '未选择';

    return `你是一个 Elasticsearch 操作助手（es-client chat2es）。
当前连接的 ES 地址：${esUrl}
用户当前选中的索引：${selectedIndex}
可用的索引列表（最多显示50个）：${indexNames}

你拥有以下能力，可以通过工具直接操作 Elasticsearch：
- 查询索引列表、mapping、settings
- 执行搜索查询（_search）
- 查看集群健康状态和信息
- 执行任意 ES REST API 请求（创建/删除索引、文档 CRUD、聚合分析等）

规则：
1. 当用户询问 ES 相关问题时，优先使用工具获取真实数据后再回答
2. 对于危险操作（删除索引、删除文档、修改 mapping 等），先向用户确认后再执行
3. 将工具返回的 JSON 数据整理为易读的格式回复用户
4. 回答使用中文
5. 如果用户的问题不涉及 ES 操作，正常回答即可`;
  }

  function estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  function buildContextMessages(systemPrompt: string): { messages: ChatMessage[]; truncated: boolean } {
    const maxTokens = modelStore.activeModel?.maxContextTokens || 32768;
    const systemMsg: ChatMessage = {role: 'system', content: systemPrompt};
    const systemTokens = estimateTokens(systemPrompt);

    const candidateMessages: ChatMessage[] = [];
    for (const dm of displayMessages.value) {
      if (dm.role === 'user') {
        candidateMessages.push({role: 'user', content: dm.content});
      } else if (dm.role === 'assistant') {
        candidateMessages.push({role: 'assistant', content: dm.content});
      }
    }

    // 预留给模型输出的 token 空间
    const reservedForOutput = Math.min(4096, Math.floor(maxTokens * 0.2));
    const budget = maxTokens - systemTokens - reservedForOutput;

    if (budget <= 0) {
      return {messages: [systemMsg, candidateMessages[candidateMessages.length - 1]], truncated: candidateMessages.length > 1};
    }

    // 从最新消息向前累计，保留尽量多的近期对话
    let usedTokens = 0;
    let startIdx = candidateMessages.length;
    for (let i = candidateMessages.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(candidateMessages[i].content || '');
      if (usedTokens + msgTokens > budget) break;
      usedTokens += msgTokens;
      startIdx = i;
    }

    const truncated = startIdx > 0;
    const kept = candidateMessages.slice(startIdx);
    return {messages: [systemMsg, ...kept], truncated};
  }

  async function send(content: string) {
    const activeModel = modelStore.activeModel;
    if (!activeModel) {
      MessageUtil.warning('请先在 设置 > 模型设置 中配置模型');
      return;
    }
    if (loading.value) return;

    displayMessages.value.push({role: 'user', content});
    loading.value = true;
    toolStatus.value = '';

    const systemPrompt = buildSystemPrompt();
    const {messages: apiMessages, truncated} = buildContextMessages(systemPrompt);

    if (truncated) {
      MessageUtil.warning('上下文过长，已自动截断早期对话以适应模型窗口限制');
    }

    try {
      let rounds = 0;

      while (rounds < MAX_TOOL_ROUNDS) {
        rounds++;
        const choice = await chatCompletion(
          activeModel.baseUrl,
          activeModel.apiKey,
          activeModel.model,
          apiMessages,
          agentTools,
          modelStore.temperatureValue
        );
        const msg = choice.message;

        if (msg.tool_calls && msg.tool_calls.length > 0) {
          apiMessages.push({
            role: 'assistant',
            content: msg.content || '',
            tool_calls: msg.tool_calls,
          });

          const toolCallInfos: DisplayMessage['toolCalls'] = [];

          for (const tc of msg.tool_calls) {
            toolStatus.value = `正在调用 ${tc.function.name}...`;

            const result = await executeToolCall(tc.function.name, tc.function.arguments);

            apiMessages.push({
              role: 'tool',
              content: result,
              tool_call_id: tc.id,
            });

            toolCallInfos.push({
              name: tc.function.name,
              args: tc.function.arguments,
              result,
            });

            pushVizPanel(tc.function.name, tc.function.arguments, result);
          }

          displayMessages.value.push({
            role: 'tool-calling',
            content: toolCallInfos.map(t => `${t.name}`).join(', '),
            toolCalls: toolCallInfos,
          });
        } else {
          displayMessages.value.push({
            role: 'assistant',
            content: msg.content || '',
          });
          break;
        }
      }

      if (toolStatus.value) {
        toolStatus.value = '';
      }
    } catch (e: any) {
      const errMsg = e?.response?.data?.error?.message || e?.message || '请求失败';
      MessageUtil.error(`AI 请求失败：${errMsg}`);
      displayMessages.value.pop();
    } finally {
      loading.value = false;
      toolStatus.value = '';
    }
  }

  function pushVizPanel(toolName: string, argsStr: string, result: string) {
    try {
      const parsed = JSON.parse(result);
      let title = toolName;
      let type: VizPanel['type'] = 'json';
      let data = parsed;

      try {
        const args = JSON.parse(argsStr);
        if (toolName === 'execute_rest' && args.path) {
          title = `${(args.method || 'GET').toUpperCase()} ${args.path}`;
        } else if (toolName === 'get_mapping' && args.index) {
          title = `Mapping: ${args.index}`;
        } else if (toolName === 'get_index_settings' && args.index) {
          title = `Settings: ${args.index}`;
        } else if (toolName === 'get_index_list') {
          title = '索引列表';
        } else if (toolName === 'get_cluster_health') {
          title = '集群健康';
        } else if (toolName === 'get_cluster_info') {
          title = '集群信息';
        }
      } catch { /* ignore args parse failure */ }

      if (parsed?.hits?.hits && Array.isArray(parsed.hits.hits)) {
        type = 'table';
        data = parsed.hits.hits.map((h: any) => ({
          _index: h._index,
          _id: h._id,
          ...h._source,
          _source: JSON.stringify(h._source || {}, null, 2),
        }));
      }

      const panel: VizPanel = {
        id: `viz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        type,
        data,
        timestamp: Date.now(),
      };

      vizPanels.value.push(panel);
      activeVizId.value = panel.id;
    } catch {
      // result 不是 JSON，跳过可视化
    }
  }

  function clear() {
    displayMessages.value = [];
    vizPanels.value = [];
    activeVizId.value = '';
  }

  return {
    displayMessages,
    loading,
    toolStatus,
    configured,
    vizPanels,
    activeVizId,
    send,
    clear,
  };
});
