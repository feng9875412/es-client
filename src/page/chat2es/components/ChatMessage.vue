<template>
  <div class="chat-message" :class="[`chat-message--${role}`]" ref="messageEl">
    <div class="chat-message__bubble">
      <div class="chat-message__content" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, ref} from 'vue';
import MessageUtil from "@/utils/model/MessageUtil";

const props = defineProps<{
  role: 'user' | 'assistant' | 'system';
  content: string;
}>();

const messageEl = ref<HTMLElement>();

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

const renderedContent = computed(() => renderMarkdown(props.content));

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
