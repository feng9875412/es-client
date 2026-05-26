<template>
  <div class="data-browser-right material-card abs-8 !left-0">
    <div class="abs-0">
      <!--    顶部tab-->

      <TabChrome v-model="tabId" :tabs="tabs" @remove="removeTab" :class="{'theme-dark': isDark}"/>

      <div class="dbr-container">
        <div v-for="tab in tabs" :key="tab.value" v-show="tabId === tab.value">
          <DataBrowserQueryTab v-if="tab.type === 'query'" :tab="tabMap.get(tab.value)! as UseDataBrowserQueryContent"/>
          <DataBrowserIndexTab v-else :tab="tabMap.get(tab.value)! as UseDataBrowserInstance"/>
        </div>
      </div>

      <empty-result v-if="tabs.length === 0" :title="$t('module.data_browse.please_select_index_double_click')"/>
    </div>
  </div>
</template>
<script lang="ts" setup>
import {onMounted} from "vue";
import {storeToRefs} from "pinia";
import {DataBrowseTab, encodeValue, useDataBrowseStore} from "@/store/components/DataBrowseStore";
import DataBrowserIndexTab from "@/page/data-browse/tab/DataBrowserIndexTab.vue";
import EmptyResult from "@/components/Result/EmptyResult.vue";
import {useGlobalStore} from "@/store/GlobalStore";
import DataBrowserQueryTab from "../tab/DataBrowserQueryTab.vue";
import {UseDataBrowserInstance, UseDataBrowserQueryContent} from "@/hooks";
import {useIndexStore} from "@/store";

const {tabMap} = useDataBrowseStore();
const {tabId} = storeToRefs(useDataBrowseStore());
const tabs = computed<Array<DataBrowseTab>>(() => useDataBrowseStore().tabs);
const isDark = computed(() => useGlobalStore().isDark);

const removeTab = ({value}: any) => {
  useDataBrowseStore().closeTab(`${value}`);
}

onMounted(() => {
  const idx = useIndexStore().currentIndex;
  if (idx && tabs.value.length === 0) {
    useDataBrowseStore().openTab(encodeValue('index', idx), idx);
  }
});

watch(() => useIndexStore().currentIndex, (idx) => {
  if (!idx) return;
  const value = encodeValue('index', idx);
  useDataBrowseStore().openTab(value, idx);
});
</script>
<style scoped lang="less">
.dbr-container {
  position: absolute;
  top: 32px;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>
