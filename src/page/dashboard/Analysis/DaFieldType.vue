<template>
  <t-loading :loading="loading">
    <div style="overflow-x: hidden" class="mt-8px">
      <t-form :data="config">
        <t-form-item label="字段">
          <t-select v-model="config.field" clearable filterable creatable :options="fields"/>
        </t-form-item>
        <t-form-item label="分析的字符串">
          <t-input v-model="config.text" allow-clear placeholder="请输入要分析的字符串"/>
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button theme="primary" :disabled="disabled" @click="exec()">开始分析</t-button>
            <t-button theme="primary" :disabled="disabled" variant="text" @click="jumpTo()"
            >跳转到开发者工具
            </t-button
            >
          </t-space>
        </t-form-item>
      </t-form>
      <t-table :columns :data="tokens" class="mt-8px"/>
    </div>
  </t-loading>
</template>
<script lang="ts" setup>
import {useIndexStore, useUrlStore} from "@/store";
import {Token} from "$/elasticsearch-client/domain/Analyze";
import MessageUtil from "@/utils/model/MessageUtil";
import {showJson} from "@/utils/model/DialogUtil";
import {stringifyJsonWithBigIntSupport} from "$/util";

const config = ref({
  field: "",
  text: ""
});
const currentIndex = computed(() => useIndexStore().currentIndex);
const tokens = ref<Array<Token>>(new Array<Token>());
const loading = ref(false);

const columns = [
  {
    title: "token",
    colKey: "token"
  },
  {
    title: "position",
    colKey: "position"
  },
  {
    title: "start_offset",
    colKey: "start_offset"
  },
  {
    title: "end_offset",
    colKey: "end_offset"
  },
  {
    title: "type",
    colKey: "type"
  }
];

const fields = computed(() => useIndexStore().fieldOptionMap[currentIndex.value]);
const disabled = computed(() => currentIndex.value === "" || config.value.field === "");

function exec() {
  tokens.value = [];
  loading.value = true;
  const {client} = useUrlStore();
  if (!client) return MessageUtil.error("请选择链接");
  client.indexAnalyze(currentIndex.value, config.value.field, config.value.text)
    .then((rsp) => (tokens.value = rsp.tokens))
    .catch((e) => MessageUtil.error("执行失败", e))
    .finally(() => (loading.value = false));
}

function jumpTo() {
  showJson(
    "查询语句",
    stringifyJsonWithBigIntSupport({
      method: "POST",
      link: `/${currentIndex.value}/_analyze`,
      body: `{
    "field": "${config.value.field}",
    "text": "${config.value.text}"
}`
    })
  );
}
</script>
<style scoped></style>
