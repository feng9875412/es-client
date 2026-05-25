import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {getFromOneByAsync, saveOneByAsync} from "@/utils/utools/DbStorageUtil";
import LocalNameEnum from "@/enumeration/LocalNameEnum";
import {useUrlStore} from "@/store/UrlStore";
import {useIndexStore} from "@/store/IndexStore";
import {chatCompletion, type ChatMessage} from "@/page/chat2es/apis/chat";
import {agentTools, executeToolCall} from "@/page/chat2es/agent/tools";
import MessageUtil from "@/utils/model/MessageUtil";

const MAX_TOOL_ROUNDS = 5;

interface Chat2esSettings {
  apiKey: string;
  model: string;
  baseUrl: string;
}

const DEFAULT_SETTINGS: Chat2esSettings = {
  apiKey: '',
  model: 'MiniMax-M1',
  baseUrl: 'https://api.minimax.io/v1',
};

export interface DisplayMessage {
  role: 'user' | 'assistant' | 'tool-calling';
  content: string;
  toolCalls?: Array<{ name: string; args: string; result?: string }>;
}

export const useChat2esStore = defineStore('chat2es', () => {
  const displayMessages = ref<Array<DisplayMessage>>([]);
  const loading = ref(false);
  const toolStatus = ref('');
  const apiKey = ref(DEFAULT_SETTINGS.apiKey);
  const model = ref(DEFAULT_SETTINGS.model);
  const baseUrl = ref(DEFAULT_SETTINGS.baseUrl);

  const configured = computed(() => apiKey.value.length > 0 && baseUrl.value.length > 0);

  async function init() {
    const wrap = await getFromOneByAsync<Chat2esSettings>(LocalNameEnum.SETTING_CHAT2ES, {...DEFAULT_SETTINGS});
    apiKey.value = wrap.record.apiKey || DEFAULT_SETTINGS.apiKey;
    model.value = wrap.record.model || DEFAULT_SETTINGS.model;
    baseUrl.value = wrap.record.baseUrl || DEFAULT_SETTINGS.baseUrl;
  }

  async function saveSettings() {
    await saveOneByAsync(LocalNameEnum.SETTING_CHAT2ES, {
      apiKey: apiKey.value,
      model: model.value,
      baseUrl: baseUrl.value,
    });
  }

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

  async function send(content: string) {
    if (!configured.value) {
      MessageUtil.warning('请先在右侧配置 API Key 和 Base URL');
      return;
    }
    if (loading.value) return;

    displayMessages.value.push({role: 'user', content});
    loading.value = true;
    toolStatus.value = '';

    const apiMessages: ChatMessage[] = [
      {role: 'system', content: buildSystemPrompt()},
    ];
    for (const dm of displayMessages.value) {
      if (dm.role === 'user') {
        apiMessages.push({role: 'user', content: dm.content});
      } else if (dm.role === 'assistant') {
        apiMessages.push({role: 'assistant', content: dm.content});
      }
    }

    try {
      let rounds = 0;

      while (rounds < MAX_TOOL_ROUNDS) {
        rounds++;
        const choice = await chatCompletion(baseUrl.value, apiKey.value, model.value, apiMessages, agentTools);
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

  function clear() {
    displayMessages.value = [];
  }

  return {
    displayMessages,
    loading,
    toolStatus,
    apiKey,
    model,
    baseUrl,
    configured,
    init,
    saveSettings,
    send,
    clear,
  };
});
