<template>
  <div class="setting-model">
    <div style="overflow: auto; height: calc(100vh - 64px); padding: 16px;">
      <div class="flex justify-between items-center mb-16px">
        <div class="font-bold text-base">模型配置</div>
        <t-button theme="primary" @click="openDialog()">
          <template #icon>
            <add-icon/>
          </template>
          新增模型
        </t-button>
      </div>

      <div v-if="models.length === 0" class="empty-tip">
        <t-tag theme="warning" variant="light">暂无模型配置，请点击上方按钮新增</t-tag>
      </div>

      <div class="model-list">
        <t-card
          v-for="item in models"
          :key="item.id"
          class="model-card"
          :class="{'model-card--active': item.id === activeModelId}"
          size="small"
          hover-shadow
        >
          <div class="flex justify-between items-start">
            <div class="model-card__info" @click="store.setActiveModel(item.id)">
              <div class="flex items-center gap-8px mb-4px">
                <span class="font-bold text-14px">{{ item.name }}</span>
                <t-tag v-if="item.id === activeModelId" theme="primary" size="small" variant="light">使用中</t-tag>
              </div>
              <div class="text-12px text-secondary">{{ item.baseUrl }}</div>
              <div class="text-12px text-secondary">模型：{{ item.model }} · 上下文：{{ formatTokens(item.maxContextTokens) }}</div>
            </div>
            <div class="flex gap-4px">
              <t-button variant="text" theme="primary" size="small" shape="square" @click="openDialog(item)">
                <template #icon>
                  <edit-icon/>
                </template>
              </t-button>
              <t-popconfirm content="确定删除该模型配置？" @confirm="handleRemove(item.id)">
                <t-button variant="text" theme="danger" size="small" shape="square">
                  <template #icon>
                    <delete-icon/>
                  </template>
                </t-button>
              </t-popconfirm>
            </div>
          </div>
        </t-card>
      </div>
    </div>

    <t-dialog
      v-model:visible="dialogVisible"
      :header="editingModel ? '编辑模型' : '新增模型'"
      :confirm-btn="{ content: '保存', loading: saving }"
      @confirm="handleSave"
      :width="480"
    >
      <t-form :label-width="100" layout="vertical">
        <t-form-item label="配置名称">
          <t-input v-model="form.name" placeholder="如：MiniMax / DeepSeek / OpenAI" clearable/>
        </t-form-item>
        <t-form-item label="API Base URL">
          <t-input v-model="form.baseUrl" placeholder="https://api.minimax.io/v1" clearable/>
          <template #help>OpenAI 兼容接口地址</template>
        </t-form-item>
        <t-form-item label="API Key">
          <t-input
            v-model="form.apiKey"
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
          <t-input v-model="form.model" placeholder="MiniMax-M1" clearable/>
        </t-form-item>
        <t-form-item label="最大上下文窗口">
          <t-input-number
            v-model="form.maxContextTokens"
            :min="1024"
            :max="2000000"
            :step="1024"
            suffix="tokens"
            theme="normal"
            style="width: 100%"
          />
          <template #help>模型支持的最大上下文 token 数，超出时将截断早期对话并提示</template>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed, onMounted} from 'vue';
import {AddIcon, EditIcon, DeleteIcon, BrowseIcon, BrowseOffIcon} from 'tdesign-icons-vue-next';
import {useModelSettingStore, type ModelConfig} from '@/store/components/ModelSettingStore';
import MessageUtil from '@/utils/model/MessageUtil';

const store = useModelSettingStore();

const models = computed(() => store.models);
const activeModelId = computed(() => store.activeModelId);

const dialogVisible = ref(false);
const editingModel = ref<ModelConfig | null>(null);
const showKey = ref(false);
const saving = ref(false);

const form = ref({
  name: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  maxContextTokens: 32768,
});

onMounted(() => store.init());

function formatTokens(n: number): string {
  if (!n) return '32K';
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return String(n);
}

function openDialog(item?: ModelConfig) {
  if (item) {
    editingModel.value = item;
    form.value = {name: item.name, baseUrl: item.baseUrl, apiKey: item.apiKey, model: item.model, maxContextTokens: item.maxContextTokens || 32768};
  } else {
    editingModel.value = null;
    form.value = {name: '', baseUrl: '', apiKey: '', model: '', maxContextTokens: 32768};
  }
  showKey.value = false;
  dialogVisible.value = true;
}

async function handleSave() {
  const {name, baseUrl, apiKey, model, maxContextTokens} = form.value;
  if (!name || !baseUrl || !apiKey || !model) {
    MessageUtil.warning('请填写所有必填项');
    return;
  }
  saving.value = true;
  try {
    if (editingModel.value) {
      await store.updateModel(editingModel.value.id, {name, baseUrl, apiKey, model, maxContextTokens});
      MessageUtil.success('模型已更新');
    } else {
      await store.addModel({name, baseUrl, apiKey, model, maxContextTokens});
      MessageUtil.success('模型已添加');
    }
    dialogVisible.value = false;
  } catch {
    MessageUtil.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleRemove(id: string) {
  await store.removeModel(id);
  MessageUtil.success('已删除');
}
</script>

<style scoped lang="less">
.empty-tip {
  text-align: center;
  padding: 32px;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-card {
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;

  &--active {
    border-color: var(--td-brand-color);
  }

  &__info {
    flex: 1;
    min-width: 0;
  }
}

.text-secondary {
  color: var(--td-text-color-secondary);
}
</style>
