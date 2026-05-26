<template>
  <div class="chat-left abs-8 !right-0 flex flex-col">
    <!-- 标题栏 -->
    <div class="chat-left__header">
      <div class="chat-left__title">
        <chat-icon size="18px"/>
        <span>Chat2ES</span>
      </div>
      <div class="flex items-center gap-2px">
        <t-tag v-if="!configured" theme="warning" variant="light" size="small">未配置模型</t-tag>
        <t-tag v-else-if="urlEmpty" theme="warning" variant="light" size="small">ES 未连接</t-tag>
        <t-tag v-else theme="success" variant="outline" size="small">{{ indexCount }} 索引</t-tag>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="chat-left__messages" ref="messagesContainer">
      <div v-if="displayMessages.length === 0" class="empty-state">
        <div class="empty-state__icon">
          <chat-icon size="52px"/>
        </div>
        <div class="empty-state__title">Chat2ES 助手</div>
        <div class="empty-state__desc">我可以直接查询和操作你的 Elasticsearch 集群</div>
        <div class="empty-state__hints">
          <div class="hint-item" v-for="hint in hints" :key="hint" @click="quickSend(hint)">
            {{ hint }}
          </div>
        </div>
      </div>
      <template v-for="(msg, index) in displayMessages" :key="index">
        <chat-message
          v-if="msg.role === 'user' || msg.role === 'assistant'"
          :role="msg.role"
          :content="msg.content"
        />
        <chat-tool-status
          v-else-if="msg.role === 'tool-calling'"
          :tool-calls="msg.toolCalls || []"
        />
      </template>
      <div v-if="loading" class="chat-loading">
        <t-loading size="small"/>
        <span>{{ toolStatus || 'AI 思考中...' }}</span>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="chat-left__input">
      <chat-left-input @send="handleSend" @clear="handleNewChat"/>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, nextTick, ref, watch} from 'vue';
import {ChatIcon} from "tdesign-icons-vue-next";
import ChatLeftInput from "@/page/chat2es/components/ChatLeftInput.vue";
import ChatMessage from "@/page/chat2es/components/ChatMessage.vue";
import ChatToolStatus from "@/page/chat2es/components/ChatToolStatus.vue";
import {useChat2esStore} from "@/store/components/Chat2esStore";
import {useModelSettingStore} from "@/store/components/ModelSettingStore";
import {useUrlStore, useIndexStore} from "@/store";

const chat2esStore = useChat2esStore();
const messagesContainer = ref<HTMLElement>();

const displayMessages = computed(() => chat2esStore.displayMessages);
const loading = computed(() => chat2esStore.loading);
const toolStatus = computed(() => chat2esStore.toolStatus);
const configured = computed(() => useModelSettingStore().configured);
const urlEmpty = computed(() => useUrlStore().empty);
const indexCount = computed(() => useIndexStore().list.length);

const hints = [
  '查看集群健康状态',
  '列出所有索引',
  '查询当前索引的 mapping',
  '搜索最近 10 条数据',
];

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

watch(() => chat2esStore.displayMessages.length, scrollToBottom);

async function handleSend(message: string) {
  scrollToBottom();
  await chat2esStore.send(message);
  scrollToBottom();
}

function quickSend(hint: string) {
  handleSend(hint);
}

function handleNewChat() {
  chat2esStore.clear();
}
</script>

<style scoped lang="less">
.chat-left {
  background: var(--td-bg-color-container);
  border-radius: 8px;
  overflow: hidden;
}

.chat-left__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--td-component-border);
  flex-shrink: 0;
}

.chat-left__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 15px;
  color: var(--td-text-color-primary);
}

.chat-left__messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 4px;
  scroll-behavior: smooth;
}

.chat-left__input {
  padding: 8px 12px 12px;
  border-top: 1px solid var(--td-component-border);
  flex-shrink: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  padding: 20px;

  &__icon {
    opacity: 0.15;
    margin-bottom: 4px;
  }

  &__title {
    font-size: 18px;
    font-weight: 700;
    color: var(--td-text-color-primary);
  }

  &__desc {
    font-size: 13px;
    color: var(--td-text-color-secondary);
    margin-bottom: 16px;
  }

  &__hints {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    max-width: 280px;
  }
}

.hint-item {
  padding: 10px 14px;
  border: 1px solid var(--td-component-border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--td-text-color-secondary);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--td-brand-color);
    color: var(--td-brand-color);
    background: var(--td-brand-color-light);
  }
}

.chat-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: var(--td-text-color-secondary);
  font-size: 13px;
}
</style>
