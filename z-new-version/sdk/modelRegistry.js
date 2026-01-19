import { getSDKPlugin } from "./vitalStatsClient.js";
let plugin = null;

async function ensurePlugin() {
  if (!plugin) {
    plugin = await getSDKPlugin();
  }
  return plugin;
}

export async function switchPluginModel(modelName) {
  try {
    const sdkPlugin = await ensurePlugin();
    plugin = await sdkPlugin.switchTo(modelName);
    return plugin;
  } catch (err) {
    console.error(`Model registration failed for ${modelName}`, err);
  }
}

// backward-compatible alias in case other modules call switchPluginModal
export { switchPluginModel as switchPluginModal };
