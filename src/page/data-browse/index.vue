<template>
  <SplitPanel v-model="size">
    <template #left>
      <DataBrowserLeft/>
    </template>
    <template #right>
      <DataBrowserRight/>
    </template>
  </SplitPanel>
</template>
<script lang="ts" setup>
import LocalNameEnum from "@/enumeration/LocalNameEnum";
import DataBrowserLeft from "@/page/data-browse/layouts/DataBrowserLeft.vue";
import DataBrowserRight from "@/page/data-browse/layouts/DataBrowserRight.vue";

const size = useLocalStorage(LocalNameEnum.PAGE_DATA_BROWSER_SIZE, 220);
</script>
<style lang="less">

</style>
