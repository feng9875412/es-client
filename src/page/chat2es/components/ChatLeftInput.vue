<template>
  <div class="chat-left-input">
    <t-textarea
      v-model="inputValue"
      :autosize="{ minRows: 1, maxRows: 8 }"
      placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
      @keydown="handleKeydown"
    ></t-textarea>
    <div class="input-controls">
      <div class="left-controls">
        <t-popup trigger="click" placement="top" :visible="showIndexPopup">
          <t-button variant="text" theme="primary" shape="square" size="small" @click="showIndexPopup = !showIndexPopup">
            @
          </t-button>
          <template #content>
            <div class="index-popup">
              <div
                v-for="idx in indices"
                :key="idx.name"
                class="index-popup__item"
                @click="insertIndex(idx.name)"
              >
                @{{ idx.name }}
              </div>
              <div v-if="indices.length === 0" class="index-popup__empty">暂无索引</div>
            </div>
          </template>
        </t-popup>
      </div>
      <div class="right-controls">
        <t-button
          variant="text"
          theme="primary"
          shape="square"
          size="small"
          class="shrink-0"
          :disabled="!canSend"
          :loading="loading"
          @click="handleSend"
        >
          <send-icon/>
        </t-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed} from 'vue';
import {SendIcon} from 'tdesign-icons-vue-next';
import {useIndexStore} from "@/store";
import {useChat2esStore} from "@/store/components/Chat2esStore";

const chat2esStore = useChat2esStore();
const inputValue = ref('');
const showIndexPopup = ref(false);

const indices = computed(() => useIndexStore().list);
const loading = computed(() => chat2esStore.loading);
const canSend = computed(() => inputValue.value.trim().length > 0 && !loading.value);

const emit = defineEmits<{
  send: [message: string];
}>();

function handleKeydown(_value: string | number, ctx: { e: KeyboardEvent }) {
  if (ctx.e.key === 'Enter' && !ctx.e.shiftKey) {
    ctx.e.preventDefault();
    handleSend();
  }
}

function handleSend() {
  const msg = inputValue.value.trim();
  if (!msg || loading.value) return;
  emit('send', msg);
  inputValue.value = '';
}

function insertIndex(name: string) {
  inputValue.value += `@${name} `;
  showIndexPopup.value = false;
}
</script>

<style scoped lang="less">
.chat-left-input {
  position: relative;

  .t-textarea {
    flex: 1;
    min-height: 60px;
    resize: vertical;

    :deep(.t-textarea__inner) {
      overflow-y: auto;
      padding-bottom: 2rem;
    }
  }

  .input-controls {
    position: absolute;
    left: 4px;
    right: 4px;
    bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 8px;

    .left-controls, .right-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.index-popup {
  max-height: 200px;
  overflow-y: auto;
  min-width: 160px;

  &__item {
    padding: 6px 12px;
    cursor: pointer;
    font-size: 13px;
    border-radius: 4px;

    &:hover {
      background: var(--td-bg-color-container-hover);
    }
  }

  &__empty {
    padding: 8px 12px;
    color: var(--td-text-color-placeholder);
    font-size: 13px;
  }
}
</style>
