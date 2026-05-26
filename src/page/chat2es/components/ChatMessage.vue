<template>
  <div class="chat-message" :class="[`chat-message--${role}`]" ref="messageEl">
    <div class="chat-message__bubble">
      <!-- 思考区块 -->
      <div v-if="thinkContent" class="think-block" :class="{'think-block--collapsed': thinkCollapsed}">
        <div class="think-block__header" @click="thinkCollapsed = !thinkCollapsed">
          <span class="think-block__icon">
            <lightbulb-icon size="14px"/>
          </span>
          <span class="think-block__title">{{ thinkCollapsed ? '展开思考过程' : '思考过程' }}</span>
          <chevron-down-icon v-if="thinkCollapsed" size="14px" class="think-block__arrow"/>
          <chevron-up-icon v-else size="14px" class="think-block__arrow"/>
        </div>
        <div v-show="!thinkCollapsed" class="think-block__body" v-html="renderedThink"></div>
      </div>
      <div class="chat-message__content" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue';
import {LightbulbIcon, ChevronDownIcon, ChevronUpIcon} from 'tdesign-icons-vue-next';
import MessageUtil from "@/utils/model/MessageUtil";

const props = defineProps<{
  role: 'user' | 'assistant' | 'system';
  content: string;
}>();

const messageEl = ref<HTMLElement>();
const thinkCollapsed = ref(true);

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMarkdown(text: string): string {
  const codeBlocks: string[] = [];
  let processed = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, lang, code) => {
    const idx = codeBlocks.length;
    const escaped = escapeHtml(code.trimEnd());
    codeBlocks.push(
      `<div class="code-block">` +
      `<div class="code-block__header"><span>${lang || 'code'}</span><button class="code-copy-btn" data-code-idx="${idx}">复制</button></div>` +
      `<pre><code>${escaped}</code></pre>` +
      `</div>`
    );
    return `__CODE_BLOCK_${idx}__`;
  });

  processed = escapeHtml(processed);
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  processed = processed.replace(/\n/g, '<br>');
  processed = processed.replace(/__CODE_BLOCK_(\d+)__/g, (_m, idx) => codeBlocks[Number(idx)]);

  return processed;
}

const thinkContent = computed(() => {
  const match = props.content.match(/<think>([\s\S]*?)<\/think>/);
  return match ? match[1].trim() : '';
});

const mainContent = computed(() => {
  return props.content.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
});

const renderedThink = computed(() => renderMarkdown(thinkContent.value));
const renderedContent = computed(() => renderMarkdown(mainContent.value));

onMounted(() => {
  messageEl.value?.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('code-copy-btn')) {
      const codeEls = messageEl.value?.querySelectorAll('.code-block pre code');
      const idx = Number(target.dataset.codeIdx);
      if (codeEls && codeEls[idx]) {
        navigator.clipboard.writeText(codeEls[idx].textContent || '').then(() => {
          MessageUtil.success('已复制');
        });
      }
    }
  });
});
</script>

<style scoped lang="less">
.chat-message {
  display: flex;
  margin-bottom: 16px;
  padding: 0 8px;

  &--user {
    justify-content: flex-end;

    .chat-message__bubble {
      background: var(--td-brand-color-light);
      border-radius: 12px 12px 4px 12px;
      max-width: 80%;
    }
  }

  &--assistant {
    justify-content: flex-start;

    .chat-message__bubble {
      background: var(--td-bg-color-container);
      border-radius: 12px 12px 12px 4px;
      max-width: 85%;
    }
  }

  &--system {
    justify-content: center;

    .chat-message__bubble {
      background: var(--td-bg-color-secondarycontainer);
      border-radius: 8px;
      max-width: 90%;
      font-size: 12px;
      color: var(--td-text-color-placeholder);
    }
  }
}

.chat-message__bubble {
  padding: 10px 14px;
  word-break: break-word;
  line-height: 1.6;
}

.think-block {
  margin-bottom: 10px;
  border-radius: 8px;
  border: 1px solid var(--td-component-border);
  background: var(--td-bg-color-secondarycontainer);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 12px;
    color: var(--td-text-color-secondary);
    user-select: none;
    transition: background 0.2s;

    &:hover {
      background: var(--td-bg-color-container-hover);
    }
  }

  &__icon {
    display: flex;
    color: var(--td-warning-color-6);
  }

  &__title {
    flex: 1;
    font-weight: 500;
  }

  &__arrow {
    color: var(--td-text-color-placeholder);
    transition: transform 0.2s;
  }

  &__body {
    padding: 8px 12px;
    font-size: 13px;
    color: var(--td-text-color-secondary);
    line-height: 1.6;
    border-top: 1px solid var(--td-component-border);
    max-height: 300px;
    overflow-y: auto;
  }
}

.chat-message__content {
  :deep(.inline-code) {
    background: var(--td-bg-color-secondarycontainer);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: Consolas, Monaco, 'Courier New', monospace;
    font-size: 0.9em;
  }

  :deep(.code-block) {
    margin: 8px 0;
    border-radius: 8px;
    overflow: hidden;
    background: var(--td-bg-color-page);
    border: 1px solid var(--td-component-border);

    .code-block__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 12px;
      background: var(--td-bg-color-secondarycontainer);
      font-size: 12px;
      color: var(--td-text-color-secondary);
    }

    .code-copy-btn {
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--td-brand-color);
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 4px;

      &:hover {
        background: var(--td-brand-color-light);
      }
    }

    pre {
      margin: 0;
      padding: 12px;
      overflow-x: auto;

      code {
        font-family: Consolas, Monaco, 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.5;
      }
    }
  }
}
</style>
