<template>
  <div class="abs-0" ref="containerRef">
    <SplitPanel v-model="splitSize" v-model:animating="animating">
      <template #left>
        <chat-left/>
      </template>
      <template #right>
        <chat-right/>
      </template>
    </SplitPanel>
  </div>
</template>
<script lang="ts" setup>
import {ref, computed, watch, onMounted, nextTick} from 'vue';
import ChatLeft from "@/page/chat2es/layouts/ChatLeft.vue";
import ChatRight from "@/page/chat2es/layouts/ChatRight.vue";
import {useChat2esStore} from "@/store/components/Chat2esStore";

const chatStore = useChat2esStore();
const containerRef = ref<HTMLElement>();
const animating = ref(false);
const hasExpandedRight = ref(false);

const containerWidth = computed(() => containerRef.value?.clientWidth || 800);

const splitSize = ref(9999);

onMounted(() => {
  nextTick(() => {
    splitSize.value = containerWidth.value;
  });
});

watch(() => chatStore.vizPanels.length, (newLen, oldLen) => {
  if (newLen > 0 && (oldLen === 0 || !hasExpandedRight.value)) {
    animating.value = true;
    const targetLeft = Math.floor(containerWidth.value * 0.4);
    splitSize.value = targetLeft;
    hasExpandedRight.value = true;
    setTimeout(() => { animating.value = false; }, 400);
  }
});

watch(() => chatStore.vizPanels.length, (newLen) => {
  if (newLen === 0 && hasExpandedRight.value) {
    animating.value = true;
    splitSize.value = containerWidth.value;
    hasExpandedRight.value = false;
    setTimeout(() => { animating.value = false; }, 400);
  }
});
</script>
<style scoped lang="less">
</style>
