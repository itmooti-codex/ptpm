import { config } from "./config.js";

let sdkInstance = null;
let pluginPromise = null;

class VitalStatsSDK {
  constructor({ slug, apiKey }) {
    this.slug = slug;
    this.apiKey = apiKey;
  }

  async loadScriptOnce() {
    if (window.initVitalStats || window.initVitalStatsSDK) return;

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://static-au03.vitalstats.app/static/sdk/v1/latest.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async init() {
    await this.loadScriptOnce();

    const initFn = window.initVitalStats || window.initVitalStatsSDK;
    if (!initFn) {
      throw new Error("VitalStats SDK init function missing");
    }

    const { plugin } = await initFn({
      slug: this.slug,
      apiKey: this.apiKey,
      isDefault: true,
    }).toPromise();

    return plugin;
  }
}

export async function getSDKPlugin() {
  if (pluginPromise) return pluginPromise;

  sdkInstance = new VitalStatsSDK({
    slug: config.slug,
    apiKey: config.apiKey,
  });

  pluginPromise = await sdkInstance.init();
  return pluginPromise;
}
