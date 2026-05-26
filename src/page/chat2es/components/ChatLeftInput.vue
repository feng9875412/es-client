<template>
  <div class="chat-left-input" ref="inputContainer">
    <div class="input-area" @click="focusInput">
      <t-tag
        v-for="(tag, i) in mentionTags"
        :key="i"
        theme="primary"
        variant="light"
        size="small"
        closable
        class="mention-tag"
        @close="removeMention(i)"
      >
        <template #icon>
          <layers-icon size="12px"/>
        </template>
        {{ tag }}
      </t-tag>
      <t-textarea
        ref="textareaRef"
        v-model="inputValue"
        :autosize="{ minRows: 1, maxRows: 6 }"
        :placeholder="mentionTags.length > 0 ? '继续输入...' : '发消息给 AI，输入 @ 引用索引，Enter 发送'"
        @keydown="handleKeydown"
        class="inline-textarea"
      />
    </div>
    <div class="input-actions">
      <div class="input-actions__left">
        <t-tooltip content="清空对话" :show-arrow="false">
          <t-button variant="text" theme="default" shape="square" size="small" @click="$emit('clear')">
            <delete-icon size="16px"/>
          </t-button>
        </t-tooltip>
      </div>
      <t-button
        theme="primary"
        size="small"
        :disabled="!canSend"
        :loading="loading"
        @click="handleSend"
      >
        <template #icon>
          <send-icon size="16px"/>
        </template>
        发送
      </t-button>
    </div>

    <!-- @索引弹出层 -->
    <div
      v-if="showMentionPopup"
      class="mention-popup"
      :style="mentionPopupStyle"
      @keydown="handleMentionNativeKeydown"
    >
      <div class="mention-popup__header">选择索引</div>
      <t-input
        ref="mentionSearchRef"
        v-model="mentionFilter"
        placeholder="搜索索引..."
        size="small"
        clearable
        class="mention-popup__search"
      />
      <div class="mention-popup__list" ref="mentionListRef">
        <div
          v-for="(idx, i) in filteredMentionIndices"
          :key="idx.name"
          class="mention-popup__item"
          :class="{'mention-popup__item--active': i === mentionActiveIdx}"
          @click="selectMention(idx.name)"
          @mouseenter="mentionActiveIdx = i"
        >
          <layers-icon size="14px" class="mention-popup__icon"/>
          <span>{{ idx.name }}</span>
        </div>
        <div v-if="filteredMentionIndices.length === 0" class="mention-popup__empty">
          无匹配索引
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed, watch, nextTick, onMounted, onUnmounted} from 'vue';
import {SendIcon, DeleteIcon, LayersIcon} from 'tdesign-icons-vue-next';
import {useIndexStore} from "@/store";
import {useChat2esStore} from "@/store/components/Chat2esStore";

const chat2esStore = useChat2esStore();
const inputValue = ref('');
const mentionTags = ref<string[]>([]);
const textareaRef = ref();
const inputContainer = ref<HTMLElement>();
const mentionSearchRef = ref();
const mentionListRef = ref<HTMLElement>();

const showMentionPopup = ref(false);
const mentionFilter = ref('');
const mentionActiveIdx = ref(0);
const mentionPopupStyle = ref<Record<string, string>>({});

const indices = computed(() => useIndexStore().list);
const filteredMentionIndices = computed(() => {
  const keyword = mentionFilter.value.toLowerCase();
  if (!keyword) return indices.value.slice(0, 50);
  return indices.value.filter(idx => idx.name.toLowerCase().includes(keyword)).slice(0, 50);
});
const loading = computed(() => chat2esStore.loading);
const canSend = computed(() => (inputValue.value.trim().length > 0 || mentionTags.value.length > 0) && !loading.value);

const emit = defineEmits<{
  send: [message: string];
  clear: [];
}>();

watch(mentionFilter, () => {
  mentionActiveIdx.value = 0;
});

watch(() => inputValue.value, (val, oldVal) => {
  if (!oldVal && val === '@') {
    openMentionPopup();
    inputValue.value = '';
    return;
  }
  const lastChar = val.charAt(val.length - 1);
  if (lastChar === '@' && (val.length === 1 || val.charAt(val.length - 2) === ' ' || val.charAt(val.length - 2) === '\n')) {
    openMentionPopup();
    inputValue.value = val.slice(0, -1);
  }
});

function openMentionPopup() {
  mentionFilter.value = '';
  mentionActiveIdx.value = 0;
  showMentionPopup.value = true;
  nextTick(() => {
    const searchInput = mentionSearchRef.value?.$el?.querySelector?.('input') || mentionSearchRef.value;
    searchInput?.focus?.();
  });
}

function closeMentionPopup() {
  showMentionPopup.value = false;
  mentionFilter.value = '';
  nextTick(() => focusInput());
}

function selectMention(name: string) {
  if (!mentionTags.value.includes(name)) {
    mentionTags.value.push(name);
  }
  closeMentionPopup();
}

function handleMentionNativeKeydown(e: KeyboardEvent) {
  const list = filteredMentionIndices.value;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    mentionActiveIdx.value = Math.min(mentionActiveIdx.value + 1, list.length - 1);
    scrollToActive();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    mentionActiveIdx.value = Math.max(mentionActiveIdx.value - 1, 0);
    scrollToActive();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (list.length > 0) {
      selectMention(list[mentionActiveIdx.value].name);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeMentionPopup();
  }
}

function scrollToActive() {
  nextTick(() => {
    const active = mentionListRef.value?.querySelector('.mention-popup__item--active');
    active?.scrollIntoView({block: 'nearest'});
  });
}

function handleKeydown(_value: string | number, ctx: { e: KeyboardEvent }) {
  if (ctx.e.key === 'Enter' && !ctx.e.shiftKey) {
    ctx.e.preventDefault();
    handleSend();
  }
}

function handleSend() {
  const text = inputValue.value.trim();
  if ((!text && mentionTags.value.length === 0) || loading.value) return;
  const mentionPrefix = mentionTags.value.map(t => `@${t}`).join(' ');
  const fullMsg = mentionPrefix ? (text ? `${mentionPrefix} ${text}` : mentionPrefix) : text;
  emit('send', fullMsg);
  inputValue.value = '';
  mentionTags.value = [];
}

function removeMention(index: number) {
  mentionTags.value.splice(index, 1);
}

function focusInput() {
  const el = textareaRef.value?.$el?.querySelector?.('textarea');
  el?.focus?.();
}

function handleClickOutside(e: MouseEvent) {
  if (showMentionPopup.value && inputContainer.value && !inputContainer.value.contains(e.target as Node)) {
    closeMentionPopup();
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>

<style scoped lang="less">
.chat-left-input {
  position: relative;

  .input-area {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 4px;
    padding: 8px 10px 4px;
    border: 1.5px solid var(--td-component-border);
    border-radius: 10px;
    background: var(--td-bg-color-container);
    cursor: text;
    transition: border-color 0.2s, box-shadow 0.2s;

    &:focus-within {
      border-color: var(--td-brand-color);
      box-shadow: 0 0 0 2px var(--td-brand-color-focus);
    }
  }

  .mention-tag {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .inline-textarea {
    flex: 1;
    min-width: 120px;

    :deep(.t-textarea__inner) {
      border: none !important;
      box-shadow: none !important;
      padding: 2px 0 4px 0;
      background: transparent;
      min-height: 28px;
      font-size: 14px;
    }
  }

  .input-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;

    &__left {
      display: flex;
      align-items: center;
      gap: 2px;
    }
  }
}

.mention-popup {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: 6px;
  background: var(--td-bg-color-container);
  border: 1px solid var(--td-component-border);
  border-radius: 10px;
  box-shadow: var(--td-shadow-3);
  z-index: 1000;
  overflow: hidden;

  &__header {
    padding: 8px 12px 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--td-text-color-secondary);
  }

  &__search {
    margin: 0 8px 4px;
    width: calc(100% - 16px);
  }

  &__list {
    max-height: 240px;
    overflow-y: auto;
    padding: 0 4px 4px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    cursor: pointer;
    font-size: 13px;
    border-radius: 6px;
    transition: background 0.15s;

    &:hover, &--active {
      background: var(--td-brand-color-light);
      color: var(--td-brand-color);
    }
  }

  &__icon {
    color: var(--td-text-color-placeholder);
    flex-shrink: 0;
  }

  &__empty {
    padding: 12px;
    color: var(--td-text-color-placeholder);
    font-size: 13px;
    text-align: center;
  }
}
</style>
