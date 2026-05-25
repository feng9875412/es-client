<template>
  <div class="abs-8 !right-0 material-card p-8px flex flex-col">
    <div class="chat-header flex justify-between items-center mb-8px">
      <div class="font-bold text-base">Chat2ES</div>
      <div class="flex gap-4px">
        <t-tooltip content="新建对话">
          <t-button size="small" theme="primary" variant="text" shape="square" @click="handleNewChat">
            <template #icon>
              <chat-bubble-add-icon/>
            </template>
          </t-button>
        </t-tooltip>
      </div>
    </div>

    <div class="chat-messages flex-1 overflow-y-auto" ref="messagesContainer">
      <div v-if="displayMessages.length === 0" class="empty-state">
        <div class="empty-icon">
          <chat-icon size="48px"/>
        </div>
        <div class="empty-text">发送消息开始对话</div>
        <div class="empty-hint">我可以直接操作 ES：查询 mapping、执行搜索、管理索引等</div>
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

    <div class="chat-input-area mt-8px">
      <chat-left-input @send="handleSend"/>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {computed, nextTick, ref, watch} from 'vue';
import {ChatBubbleAddIcon, ChatIcon} from "tdesign-icons-vue-next";
import ChatLeftInput from "@/page/chat2es/components/ChatLeftInput.vue";
import ChatMessage from "@/page/chat2es/components/ChatMessage.vue";
import ChatToolStatus from "@/page/chat2es/components/ChatToolStatus.vue";
import {useChat2esStore} from "@/store/components/Chat2esStore";

const chat2esStore = useChat2esStore();
const messagesContainer = ref<HTMLElement>();

const displayMessages = computed(() => chat2esStore.displayMessages);
const loading = computed(() => chat2esStore.loading);
const toolStatus = computed(() => chat2esStore.toolStatus);

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

function handleNewChat() {
  chat2esStore.clear();
}
</script>

<style scoped lang="less">
.chat-messages {
  scroll-behavior: smooth;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--td-text-color-placeholder);
  gap: 12px;

  .empty-icon {
    opacity: 0.3;
  }

  .empty-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--td-text-color-secondary);
  }

  .empty-hint {
    font-size: 13px;
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
