/* eslint-disable import/no-default-export, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
// @ts-check
import baseConfig from "@kitiumai/config/vitest.config.base.js";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    globals: true,
    environment: "node",
    alias: {
      "@kitiumai/logger": fileURLToPath(
        new URL("./vitest.logger.mock.ts", import.meta.url),
      ),
    },
    server: {
      deps: {
        inline: ["@kitiumai/error", "@kitiumai/logger"],
      },
    },
  },
});
