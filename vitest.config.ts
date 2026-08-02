import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Keep unit tests in Node; component tests opt into jsdom with the
    // `@vitest-environment jsdom` file pragma.
    environment: "node",
  },
});
