<template>
  <div class="chat-tool-status">
    <div class="tool-summary" @click="expanded = !expanded">
      <tools-icon size="14px"/>
      <span>调用了 {{ toolCalls.length }} 个工具：{{ toolNames }}</span>
      <chevron-up-icon v-if="expanded" size="14px"/>
      <chevron-down-icon v-else size="14px"/>
    </div>
    <div v-if="expanded" class="tool-details">
      <div v-for="(tc, idx) in toolCalls" :key="idx" class="tool-item">
        <div class="tool-item__header">
          <t-tag size="small" theme="primary" variant="light">{{ tc.name }}</t-tag>
          <span v-if="tc.args && tc.args !== '{}'" class="tool-item__args">{{ formatArgs(tc.args) }}</span>
        </div>
        <div v-if="tc.result" class="tool-item__result">
          <pre><code>{{ truncate(tc.result, 500) }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue';
import {ToolsIcon, ChevronUpIcon, ChevronDownIcon} from 'tdesign-icons-vue-next';

const props = defineProps<{
  toolCalls: Array<{ name: string; args: string; result?: string }>;
}>();

const expanded = ref(false);

const toolNames = computed(() => props.toolCalls.map(t => t.name).join(', '));

function formatArgs(argsStr: string): string {
  try {
    const obj = JSON.parse(argsStr);
    return Object.entries(obj).map(([k, v]) => `${k}=${v}`).join(', ');
  } catch {
    return argsStr;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.substring(0, max) + '\n...(已截断)';
}
</script>

<style scoped lang="less">
.chat-tool-status {
  margin: 8px;
  border-radius: 8px;
  border: 1px dashed var(--td-component-border);
  overflow: hidden;
}

.tool-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
  cursor: pointer;
  background: var(--td-bg-color-secondarycontainer);

  &:hover {
    opacity: 0.8;
  }
}

.tool-details {
  padding: 8px 12px;
}

.tool-item {
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  &__args {
    font-size: 12px;
    color: var(--td-text-color-placeholder);
    font-family: Consolas, Monaco, 'Courier New', monospace;
  }

  &__result {
    pre {
      margin: 0;
      padding: 8px;
      background: var(--td-bg-color-page);
      border-radius: 6px;
      overflow-x: auto;
      max-height: 200px;
      overflow-y: auto;

      code {
        font-family: Consolas, Monaco, 'Courier New', monospace;
        font-size: 11px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }
  }
}
</style>
