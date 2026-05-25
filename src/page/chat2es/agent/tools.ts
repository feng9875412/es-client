import type {ToolDefinition} from "@/page/chat2es/apis/chat";
import {useUrlStore} from "@/store/UrlStore";
import {useIndexStore} from "@/store/IndexStore";

export const agentTools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'execute_rest',
      description: '执行任意 Elasticsearch REST API 请求，可以完成搜索、索引管理、文档操作等所有 ES 操作',
      parameters: {
        type: 'object',
        properties: {
          method: {type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'], description: 'HTTP 方法'},
          path: {type: 'string', description: 'API 路径，如 /myindex/_search、/_cat/indices?v 等'},
          body: {type: 'string', description: '请求体 JSON 字符串（可选）'},
        },
        required: ['method', 'path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_index_list',
      description: '获取当前 ES 集群的所有索引列表，返回索引名、别名和字段数量',
      parameters: {type: 'object', properties: {}},
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_mapping',
      description: '获取指定索引的 mapping（字段结构定义）',
      parameters: {
        type: 'object',
        properties: {
          index: {type: 'string', description: '索引名称'},
        },
        required: ['index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_index_settings',
      description: '获取指定索引的 settings（分片数、副本数等配置）',
      parameters: {
        type: 'object',
        properties: {
          index: {type: 'string', description: '索引名称'},
        },
        required: ['index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cluster_health',
      description: '获取 ES 集群健康状态（green/yellow/red、节点数、分片数等）',
      parameters: {type: 'object', properties: {}},
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cluster_info',
      description: '获取 ES 集群基本信息（版本号、集群名称等）',
      parameters: {type: 'object', properties: {}},
    },
  },
];

function getClient() {
  const urlStore = useUrlStore();
  if (!urlStore.client) {
    throw new Error('未连接 ES，请先在左上角选择一个连接');
  }
  return urlStore.client;
}

function truncateResult(text: string, maxLen = 8000): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '\n...(结果过长，已截断)';
}

export async function executeToolCall(name: string, argsStr: string): Promise<string> {
  try {
    const args = argsStr ? JSON.parse(argsStr) : {};
    let result: string;

    switch (name) {
      case 'execute_rest': {
        const client = getClient();
        result = await client.request({
          method: args.method,
          url: args.path,
          data: args.body || undefined,
          headers: {'Content-Type': 'application/json; charset=utf-8'},
          responseType: 'text',
        });
        break;
      }
      case 'get_index_list': {
        const indexStore = useIndexStore();
        const list = indexStore.list.map(i => ({
          name: i.name,
          aliases: i.alias,
          fields: i.fields?.length ?? 0,
          state: i.state,
        }));
        result = JSON.stringify(list, null, 2);
        break;
      }
      case 'get_mapping': {
        const client = getClient();
        result = await client.request({
          method: 'GET',
          url: `/${args.index}/_mapping`,
          responseType: 'text',
        });
        break;
      }
      case 'get_index_settings': {
        const client = getClient();
        result = await client.request({
          method: 'GET',
          url: `/${args.index}/_settings`,
          responseType: 'text',
        });
        break;
      }
      case 'get_cluster_health': {
        const client = getClient();
        result = await client.request({
          method: 'GET',
          url: '/_cluster/health',
          responseType: 'text',
        });
        break;
      }
      case 'get_cluster_info': {
        const client = getClient();
        result = await client.request({
          method: 'GET',
          url: '/',
          responseType: 'text',
        });
        break;
      }
      default:
        result = JSON.stringify({error: `未知工具: ${name}`});
    }

    return truncateResult(result);
  } catch (e: any) {
    return JSON.stringify({error: e?.message || '执行失败'});
  }
}
