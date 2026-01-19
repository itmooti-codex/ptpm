import { ROUTES } from "./router.js";
import { config } from "../sdk/config.js";
import { VitalStatsSDK } from "../sdk/vitalStatsClient.js";

class App {
  controllers = {};
  services = {};
  started = false;

  constructor() {}

  async start() {
    if (this.started) return;
    this.started = true;
  }

  async initSDK() {
    try {
      const sdk = new VitalStatsSDK({
        slug: config.slug,
        apiKey: config.apiKey,
      });
      this.services.plugin = await sdk.initialize();
    } catch (err) {
      console.error("SDK init failed", err);
    }
  }

  async initPageController() {
    const page = document.body?.dataset?.page || "";
    const route = ROUTES[page];
    if (!route) return;

    const mvc = route();
  }
}
