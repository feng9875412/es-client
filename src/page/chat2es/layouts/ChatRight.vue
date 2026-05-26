<template>
  <div class="chat-right abs-8 !left-0 flex flex-col">
    <!-- 顶部工具栏 -->
    <div class="chat-right__toolbar">
      <template v-if="configured">
        <t-select
          v-model="selectedModelId"
          :options="modelOptions"
          placeholder="模型"
          size="small"
          class="toolbar-select"
          :borderless="true"
        />
        <div class="toolbar-divider"/>
        <div class="toolbar-thinking">
          <t-tooltip v-for="opt in thinkingOptions" :key="opt.value" :content="opt.tip" :show-arrow="false">
            <div
              class="thinking-chip"
              :class="{'thinking-chip--active': currentThinkingLevel === opt.value}"
              @click="currentThinkingLevel = opt.value"
            >
              <component :is="opt.icon" size="14px"/>
            </div>
          </t-tooltip>
        </div>
        <div class="toolbar-divider"/>
        <t-tooltip content="模型设置" :show-arrow="false">
          <t-button variant="text" theme="default" shape="square" size="small" @click="goModelSetting">
            <setting-icon size="16px"/>
          </t-button>
        </t-tooltip>
      </template>
      <template v-else>
        <t-button size="small" theme="primary" variant="outline" @click="goModelSetting">
          <template #icon><setting-icon size="14px"/></template>
          配置模型
        </t-button>
      </template>
    </div>

    <!-- 可视化结果区域 -->
    <div class="chat-right__body">
      <template v-if="vizPanels.length === 0">
        <div class="empty-viz">
          <chart-icon size="40px" class="empty-viz__icon"/>
          <div class="empty-viz__title">操作结果将在这里展示</div>
          <div class="empty-viz__hint">AI 执行 ES 查询后，数据会自动可视化展示</div>
        </div>
      </template>
      <template v-else>
        <!-- Tab 切换 -->
        <div class="viz-tabs">
          <div
            v-for="panel in vizPanels"
            :key="panel.id"
            class="viz-tab"
            :class="{'viz-tab--active': panel.id === activeVizId}"
            @click="activeVizId = panel.id"
          >
            <span class="viz-tab__title">{{ panel.title }}</span>
            <span class="viz-tab__close" @click="(e: MouseEvent) => { e.stopPropagation(); removeVizPanel(panel.id); }">
              <close-icon size="12px"/>
            </span>
          </div>
        </div>

        <!-- 面板内容 -->
        <div class="viz-content" v-if="activePanel">
          <!-- 表格类型 - 使用 vxe-table -->
          <template v-if="activePanel.type === 'table'">
            <vxe-table
              :data="tableRows"
              :height="tableHeight"
              :column-config="vxeColumnConfig"
              :row-config="vxeRowConfig"
              :virtual-y-config="vxeVirtualYConfig"
              stripe
              show-overflow="tooltip"
              empty-text="无数据"
            >
              <vxe-column type="expand" width="80" title="详细" fixed="left">
                <template #content="{ row }">
                  <div class="expand-wrapper">
                    <MonacoView :value="row['_source']"/>
                  </div>
                </template>
              </vxe-column>
              <vxe-column
                v-for="col in tableColumns"
                :key="col"
                :field="col"
                :title="col"
                :width="calcColumnWidth(col)"
                show-overflow="tooltip"
              />
            </vxe-table>
            <div v-if="activePanel.data.length > 200" class="viz-table-info">
              显示前 200 条，共 {{ activePanel.data.length }} 条
            </div>
          </template>

          <!-- JSON 类型 -->
          <template v-else>
            <div class="viz-json-wrapper">
              <div class="viz-json-toolbar">
                <t-button variant="text" size="small" @click="copyJson">
                  <template #icon><file-copy-icon size="14px"/></template>
                  复制
                </t-button>
                <t-button variant="text" size="small" @click="jsonCollapsed = !jsonCollapsed">
                  {{ jsonCollapsed ? '展开全部' : '折叠' }}
                </t-button>
              </div>
              <pre class="viz-json"><code>{{ formatJson }}</code></pre>
            </div>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed, onMounted, watch, markRaw} from 'vue';
import {
  SettingIcon,
  CloseIcon,
  FileCopyIcon,
  ChartIcon,
  RocketIcon,
  ControlPlatformIcon,
  LightbulbIcon,
} from 'tdesign-icons-vue-next';
import {useModelSettingStore, type ThinkingLevel} from "@/store/components/ModelSettingStore";
import {useChat2esStore, type VizPanel} from "@/store/components/Chat2esStore";
import {columnConfig as vxeColumnConfig, rowConfig as vxeRowConfig, virtualYConfig as vxeVirtualYConfig} from "@/page/data-browse/component/DbContainer/args";
import MonacoView from "@/components/view/MonacoView/index.vue";
import MessageUtil from "@/utils/model/MessageUtil";

const router = useRouter();
const modelStore = useModelSettingStore();
const chatStore = useChat2esStore();

const configured = computed(() => modelStore.configured);
const selectedModelId = ref('');
const currentThinkingLevel = ref<ThinkingLevel>('medium');
const jsonCollapsed = ref(false);

const modelOptions = computed(() =>
  modelStore.models.map(m => ({label: m.name, value: m.id}))
);

const thinkingOptions = [
  {value: 'low' as ThinkingLevel, label: '精确', tip: '精确模式 (temperature: 0.2)', icon: markRaw(RocketIcon)},
  {value: 'medium' as ThinkingLevel, label: '平衡', tip: '平衡模式 (temperature: 0.6)', icon: markRaw(ControlPlatformIcon)},
  {value: 'high' as ThinkingLevel, label: '创造', tip: '创造模式 (temperature: 1.0)', icon: markRaw(LightbulbIcon)},
];

const vizPanels = computed(() => chatStore.vizPanels);
const activeVizId = computed({
  get: () => chatStore.activeVizId,
  set: (val: string) => { chatStore.activeVizId = val; },
});

const activePanel = computed(() => vizPanels.value.find(p => p.id === activeVizId.value));

const tableHeight = ref(400);

const tableColumns = computed(() => {
  if (!activePanel.value || activePanel.value.type !== 'table') return [];
  const data = activePanel.value.data as Record<string, any>[];
  if (data.length === 0) return [];
  const colSet = new Set<string>();
  data.slice(0, 30).forEach(row => Object.keys(row).forEach(k => colSet.add(k)));
  colSet.delete('_source');
  return Array.from(colSet);
});

const tableRows = computed(() => {
  if (!activePanel.value || activePanel.value.type !== 'table') return [];
  return (activePanel.value.data as Record<string, any>[]).slice(0, 200);
});

function calcColumnWidth(col: string): number {
  return Math.max(col.length * 12, 100);
}

const formatJson = computed(() => {
  if (!activePanel.value) return '';
  try {
    const indent = jsonCollapsed.value ? 0 : 2;
    const str = JSON.stringify(activePanel.value.data, null, indent);
    if (str.length > 50000) {
      return str.substring(0, 50000) + '\n\n... (数据过长，已截断)';
    }
    return str;
  } catch {
    return String(activePanel.value.data);
  }
});

function removeVizPanel(id: string) {
  const idx = chatStore.vizPanels.findIndex(p => p.id === id);
  if (idx !== -1) {
    chatStore.vizPanels.splice(idx, 1);
    if (activeVizId.value === id) {
      activeVizId.value = chatStore.vizPanels.length > 0 ? chatStore.vizPanels[chatStore.vizPanels.length - 1].id : '';
    }
  }
}

function copyJson() {
  navigator.clipboard.writeText(formatJson.value).then(() => {
    MessageUtil.success('已复制');
  });
}

onMounted(async () => {
  await modelStore.init();
  selectedModelId.value = modelStore.activeModelId;
  currentThinkingLevel.value = modelStore.thinkingLevel;
  updateTableHeight();
  window.addEventListener('resize', updateTableHeight);
});

function updateTableHeight() {
  tableHeight.value = Math.max(window.innerHeight - 140, 200);
}

watch(selectedModelId, (val) => {
  if (val) modelStore.setActiveModel(val);
});

watch(currentThinkingLevel, (val) => {
  modelStore.setThinkingLevel(val);
});

function goModelSetting() {
  router.push('/setting/model');
}
</script>

<style scoped lang="less">
.chat-right {
  display: flex;
  flex-direction: column;
  background: var(--td-bg-color-container);
  border-radius: 8px;
  overflow: hidden;
}

.chat-right__toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--td-component-border);
  background: var(--td-bg-color-secondarycontainer);
  flex-shrink: 0;
}

.toolbar-select {
  max-width: 160px;

  :deep(.t-input) {
    border: none !important;
    background: transparent !important;
  }
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: var(--td-component-border);
  margin: 0 2px;
}

.toolbar-thinking {
  display: flex;
  gap: 2px;
}

.thinking-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--td-text-color-placeholder);
  transition: all 0.15s;

  &:hover {
    background: var(--td-bg-color-container-hover);
    color: var(--td-text-color-secondary);
  }

  &--active {
    background: var(--td-brand-color-light);
    color: var(--td-brand-color);
  }
}

.chat-right__body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-viz {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--td-text-color-placeholder);

  &__icon {
    opacity: 0.2;
  }

  &__title {
    font-size: 14px;
    font-weight: 500;
    color: var(--td-text-color-secondary);
  }

  &__hint {
    font-size: 12px;
  }
}

.viz-tabs {
  display: flex;
  gap: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--td-component-border);
  flex-shrink: 0;

  &::-webkit-scrollbar {
    height: 2px;
  }
}

.viz-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  color: var(--td-text-color-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.15s;

  &:hover {
    background: var(--td-bg-color-container-hover);
  }

  &--active {
    color: var(--td-brand-color);
    border-bottom-color: var(--td-brand-color);
    font-weight: 500;
  }

  &__title {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.15s, background 0.15s;
    color: var(--td-text-color-placeholder);
    cursor: pointer;

    &:hover {
      color: var(--td-error-color);
      background: var(--td-error-color-1);
    }
  }

  &:hover &__close {
    opacity: 1;
  }
}

.viz-content {
  flex: 1;
  overflow: auto;
}

.expand-wrapper {
  height: 300px;
}

.viz-table-info {
  padding: 6px 12px;
  font-size: 11px;
  color: var(--td-text-color-placeholder);
  text-align: center;
  border-top: 1px solid var(--td-component-border);
}

.viz-json-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.viz-json-toolbar {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--td-component-border);
  flex-shrink: 0;
}

.viz-json {
  flex: 1;
  margin: 0;
  padding: 10px 12px;
  overflow: auto;
  background: var(--td-bg-color-page);

  code {
    font-family: Consolas, Monaco, 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>
