<template>
  <div class="option">
    <div>
      <t-tooltip content="执行 (F9)" placement="right">
        <t-button variant="text" theme="primary" shape="square" @click="emits('execute')">
          <template #icon>
            <play-circle-icon/>
          </template>
        </t-button>
      </t-tooltip>
      <t-tooltip :content="allowEdit ? '更新' : '保存'" placement="right">
        <t-button variant="text" :theme="allowEdit ? 'danger' : 'success'" shape="square" @click="saveHistory()">
          <template #icon>
            <save-icon/>
          </template>
        </t-button>
      </t-tooltip>
      <t-tooltip content="取消与历史记录的关联" v-if="allowEdit" placement="right">
        <t-button variant="text" theme="danger" shape="square" @click="clearHistory()">
          <template #icon>
            <close-icon/>
          </template>
        </t-button>
      </t-tooltip>
      <t-tooltip content="格式化" placement="right">
        <t-button variant="text" theme="default" shape="square" @click="formatDocument()">
          <template #icon>
            <code-icon/>
          </template>
        </t-button>
      </t-tooltip>
      <t-tooltip content="清空" placement="right">
        <t-button variant="text" theme="default" shape="square" @click="clearBody()">
          <template #icon>
            <format-icon/>
          </template>
        </t-button>
      </t-tooltip>
      <t-tooltip content="编辑器设置" placement="right">
        <t-button variant="text" theme="default" shape="square" @click="useSeniorSearchSetting()">
          <template #icon>
            <setting-icon/>
          </template>
        </t-button>
      </t-tooltip>
      <t-tooltip content="帮助" placement="right">
        <t-button variant="text" theme="default" shape="square" @click="openHelp()">
          <template #icon>
            <help-circle-icon/>
          </template>
        </t-button>
      </t-tooltip>
    </div>
    <div>
      <slot name="footer"/>
    </div>
  </div>
</template>
<script lang="ts" setup>
import FormatIcon from "@/icon/FormatIcon.vue";
import {useSeniorSearchStore} from "@/store/components/SeniorSearchStore";
import {
  useSeniorSearchSetting
} from "@/page/senior-search/layout/senior-search-editor/components/ss-option/SeniorSearchSetting";
import {openUrl} from "@/utils/BrowserUtil";
import {Constant} from "@/global/Constant";
import {
  CloseIcon, CodeIcon, HelpCircleIcon, PlayCircleIcon, SaveIcon, SettingIcon
} from "tdesign-icons-vue-next";

const emits = defineEmits<{ execute: [] }>();

const allowEdit = computed(() => useSeniorSearchStore().id !== 0);

const openHelp = () => openUrl(Constant.doc.rest);
const formatDocument = () => useSeniorSearchStore().formatDocument();
const clearBody = () => useSeniorSearchStore().clearBody();
const saveHistory = () => useSeniorSearchStore().saveHistory();
const clearHistory = () => useSeniorSearchStore().clearHistory();

</script>
<style lang="less">
.senior-search {
  .option {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 32px;
    border-right: 1px solid var(--td-border-level-2-color);
  }
}
</style>
