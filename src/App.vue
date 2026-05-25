<template>
  <t-layout class="w-100vw h-100vh m-0 p-0">
    <!-- 顶部菜单栏 -->
    <app-header/>
    <t-content>
      <!-- 主页面 -->
      <t-layout style="width: 100vw;height: calc(100vh - 41px);">
        <app-side/>
        <!-- 内容-->
        <t-content class="relative h-full w-full">
          <router-view/>
        </t-content>
      </t-layout>
    </t-content>
  </t-layout>
  <!-- 索引管理 -->
  <index-manage/>
</template>

<script lang="ts" setup>
// 引入状态管理
import {useGlobalSettingStore, useIndexStore, useUrlStore} from "@/store";
import {useColorMode} from "@/hooks";
import useEditorSettingStore from "@/store/setting/EditorSettingStore";
import PageNameEnum from "@/enumeration/PageNameEnum";
import LocalNameEnum from "@/enumeration/LocalNameEnum";
import {versionManager, VersionStatus} from "@/components/version-manager";
import {getItemByDefault} from "@/utils/utools/DbStorageUtil";
import Assert from "@/utils/Assert";
import {showVersionUpdateDialog} from "@/module/version-update";
import AppHeader from "@/module/app-header/index.vue";
import AppSide from "@/module/app-sider/index.vue";
import IndexManage from '@/module/index-manage/index.vue';

const router = useRouter();

async function initData(): Promise<void> {
  await Promise.all([
    // 设置
    useGlobalSettingStore().init(),
    useEditorSettingStore().init(),
    // 等待连接列表加载完成，否则恢复上次连接时 urls 可能为空
    useUrlStore().ready(),
  ]);
}

// 初始化数据
initData().then(() => {
  console.log("初始化完成");
  // 版本
  switch (versionManager()) {
    case VersionStatus.NEW:
      router.push(PageNameEnum.MORE_ABOUT);
      break;
    case VersionStatus.UPDATE:
      showVersionUpdateDialog()
      router.push(PageNameEnum.MORE_UPDATE);
      break;
  }
  // 最后的链接
  if (useGlobalSettingStore().getLastUrl) {
    const lastUrlId = getItemByDefault(LocalNameEnum.KEY_LAST_URL, 0);
    if (lastUrlId !== 0) {
      Assert.isTrue(useUrlStore().choose(lastUrlId), "链接未找到");
      useIndexStore().reset().then(() => {
        const lastIndex = getItemByDefault<string>(LocalNameEnum.KEY_LAST_INDEX, '');
        if (lastIndex && useIndexStore().indexOptions.some(o => o.value === lastIndex)) {
          useIndexStore().currentIndex = lastIndex;
        }
      });
    }
  }
});
// 初始化主题
useColorMode();


</script>

<style lang="less">
.app-feedback {
  width: calc(100vw - 40px);
  height: calc(100vh - 58px - 60px);
  border: none;
}
</style>
