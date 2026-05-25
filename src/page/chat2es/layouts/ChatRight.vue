<template>
  <div class="abs-8 !left-0 material-card p-16px flex flex-col gap-12px overflow-y-auto">
    <!-- 折叠态：已配置时只显示摘要 -->
    <template v-if="configured && collapsed">
      <div class="summary-bar" @click="collapsed = false">
        <div class="summary-info">
          <t-tag theme="success" variant="light" size="small">已配置</t-tag>
          <span class="summary-model">{{ chat2esStore.model }}</span>
        </div>
        <t-button variant="text" size="small" shape="square">
          <setting-icon/>
        </t-button>
      </div>
      <div class="status-section-mini">
        <div class="status-item-mini">
          <span class="status-label">ES</span>
          <span :class="{'text-success': !urlEmpty, 'text-warning': urlEmpty}">
            {{ urlEmpty ? '未连接' : currentUrl }}
          </span>
        </div>
        <div class="status-item-mini">
          <span class="status-label">索引</span>
          <span>{{ indexCount }} 个</span>
        </div>
      </div>
    </template>

    <!-- 展开态：完整配置表单 -->
    <template v-else>
      <div class="flex justify-between items-center">
        <div class="font-bold text-base">模型配置</div>
        <t-button v-if="configured" variant="text" size="small" shape="square" @click="collapsed = true">
          <chevron-up-icon/>
        </t-button>
      </div>

      <t-form :label-width="0" layout="vertical">
        <t-form-item label="API Base URL">
          <t-input
            v-model="localBaseUrl"
            placeholder="https://api.minimax.io/v1"
            clearable
          />
          <template #help>
            OpenAI 兼容接口地址，如 MiniMax、OpenAI、DeepSeek 等
          </template>
        </t-form-item>

        <t-form-item label="API Key">
          <t-input
            v-model="localApiKey"
            :type="showKey ? 'text' : 'password'"
            placeholder="sk-..."
            clearable
          >
            <template #suffix>
              <t-button variant="text" shape="square" size="small" @click="showKey = !showKey">
                <browse-icon v-if="showKey"/>
                <browse-off-icon v-else/>
              </t-button>
            </template>
          </t-input>
        </t-form-item>

        <t-form-item label="模型名称">
          <t-input
            v-model="localModel"
            placeholder="MiniMax-M1"
            clearable
          />
        </t-form-item>

        <t-form-item>
          <t-button theme="primary" block @click="handleSave" :loading="saving">
            保存配置
          </t-button>
        </t-form-item>
      </t-form>

      <t-divider/>

      <div class="status-section">
        <div class="font-bold text-sm mb-8px">当前状态</div>
        <div class="status-item">
          <span class="status-label">ES 连接</span>
          <span class="status-value" :class="{'text-success': !urlEmpty, 'text-warning': urlEmpty}">
            {{ urlEmpty ? '未连接' : currentUrl }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">可用索引</span>
          <span class="status-value">{{ indexCount }} 个</span>
        </div>
        <div class="status-item">
          <span class="status-label">API 配置</span>
          <span class="status-value" :class="{'text-success': configured, 'text-warning': !configured}">
            {{ configured ? '已配置' : '未配置' }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed, onMounted} from 'vue';
import {SettingIcon, ChevronUpIcon, BrowseIcon, BrowseOffIcon} from 'tdesign-icons-vue-next';
import {useUrlStore, useIndexStore} from "@/store";
import {useChat2esStore} from "@/store/components/Chat2esStore";
import MessageUtil from "@/utils/model/MessageUtil";

const chat2esStore = useChat2esStore();

const localBaseUrl = ref('');
const localApiKey = ref('');
const localModel = ref('');
const showKey = ref(false);
const saving = ref(false);
const collapsed = ref(false);

const urlEmpty = computed(() => useUrlStore().empty);
const currentUrl = computed(() => useUrlStore().current);
const indexCount = computed(() => useIndexStore().list.length);
const configured = computed(() => chat2esStore.configured);

onMounted(async () => {
  await chat2esStore.init();
  localBaseUrl.value = chat2esStore.baseUrl;
  localApiKey.value = chat2esStore.apiKey;
  localModel.value = chat2esStore.model;
  if (configured.value) {
    collapsed.value = true;
  }
});

async function handleSave() {
  saving.value = true;
  try {
    chat2esStore.baseUrl = localBaseUrl.value;
    chat2esStore.apiKey = localApiKey.value;
    chat2esStore.model = localModel.value;
    await chat2esStore.saveSettings();
    MessageUtil.success('配置已保存');
    collapsed.value = true;
  } catch (e) {
    MessageUtil.error('保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped lang="less">
.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
  border-radius: 6px;

  &:hover {
    opacity: 0.8;
  }
}

.summary-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-model {
  font-weight: 600;
  font-size: 14px;
  color: var(--td-text-color-primary);
}

.status-section-mini {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .status-item-mini {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--td-text-color-secondary);
  }
}

.status-section {
  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    font-size: 13px;
    border-bottom: 1px solid var(--td-component-border);

    &:last-child {
      border-bottom: none;
    }
  }

  .status-label {
    color: var(--td-text-color-secondary);
  }

  .status-value {
    color: var(--td-text-color-primary);
    font-weight: 500;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.text-success {
  color: var(--td-success-color) !important;
}

.text-warning {
  color: var(--td-warning-color) !important;
}
</style>
