import {defineStore} from "pinia";
import {computed, ref} from "vue";
import {listByAsync, saveListByAsync, getItemByDefault, setItem} from "@/utils/utools/DbStorageUtil";
import LocalNameEnum from "@/enumeration/LocalNameEnum";

export interface ModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  maxContextTokens: number;
}

export type ThinkingLevel = 'low' | 'medium' | 'high';

const TEMPERATURE_MAP: Record<ThinkingLevel, number> = {
  low: 0.2,
  medium: 0.6,
  high: 1.0,
};

export const useModelSettingStore = defineStore('model-setting', () => {
  const models = ref<ModelConfig[]>([]);
  const activeModelId = ref<string>('');
  const thinkingLevel = ref<ThinkingLevel>('medium');

  const activeModel = computed(() => models.value.find(m => m.id === activeModelId.value));
  const temperatureValue = computed(() => TEMPERATURE_MAP[thinkingLevel.value]);
  const configured = computed(() => !!activeModel.value);

  async function init() {
    const wrap = await listByAsync<ModelConfig>(LocalNameEnum.SETTING_MODELS);
    models.value = wrap.list;
    activeModelId.value = getItemByDefault<string>(LocalNameEnum.KEY_ACTIVE_MODEL, '');
    thinkingLevel.value = getItemByDefault<ThinkingLevel>(LocalNameEnum.KEY_THINKING_LEVEL, 'medium');
    if (!activeModel.value && models.value.length > 0) {
      activeModelId.value = models.value[0].id;
      setItem(LocalNameEnum.KEY_ACTIVE_MODEL, activeModelId.value);
    }
  }

  async function saveModels() {
    await saveListByAsync(LocalNameEnum.SETTING_MODELS, models.value);
  }

  function setActiveModel(id: string) {
    activeModelId.value = id;
    setItem(LocalNameEnum.KEY_ACTIVE_MODEL, id);
  }

  function setThinkingLevel(level: ThinkingLevel) {
    thinkingLevel.value = level;
    setItem(LocalNameEnum.KEY_THINKING_LEVEL, level);
  }

  async function addModel(config: Omit<ModelConfig, 'id'>) {
    const id = `model_${Date.now()}`;
    models.value.push({...config, id});
    await saveModels();
    if (models.value.length === 1) {
      setActiveModel(id);
    }
  }

  async function updateModel(id: string, config: Omit<ModelConfig, 'id'>) {
    const idx = models.value.findIndex(m => m.id === id);
    if (idx !== -1) {
      models.value[idx] = {...config, id};
      await saveModels();
    }
  }

  async function removeModel(id: string) {
    models.value = models.value.filter(m => m.id !== id);
    await saveModels();
    if (activeModelId.value === id) {
      const newId = models.value.length > 0 ? models.value[0].id : '';
      setActiveModel(newId);
    }
  }

  return {
    models,
    activeModelId,
    thinkingLevel,
    activeModel,
    temperatureValue,
    configured,
    init,
    setActiveModel,
    setThinkingLevel,
    addModel,
    updateModel,
    removeModel,
  };
});
