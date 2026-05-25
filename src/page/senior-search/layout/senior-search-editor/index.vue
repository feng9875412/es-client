<template>
  <div class="senior-search-side material-card h-full">
    <!-- 编辑器 -->
    <div class="senior-search-editor h-full flex w-full">
      <!-- 操作栏 -->
      <ss-option @execute="handleExecute"/>
      <!-- rest客户端编辑器 -->
      <div style="width: calc(100% - 33px)">
        <rest-client-editor ref="editorInstance" class="editor h-full"/>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import {RestClientEditor} from "@/components/RestClientEditor";
import SsOption from "@/page/senior-search/layout/senior-search-editor/components/ss-option/index.vue";

const editorInstance = ref<InstanceType<typeof RestClientEditor>>();

const handleExecute = () => {
  editorInstance.value?.executeCurrent();
};

</script>
<style scoped>

</style>
