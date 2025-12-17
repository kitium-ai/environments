import { describe, expect, it } from "vitest";

import { SecretsBroker } from "../secrets.js";
import type { EnvironmentSpec } from "../types.js";

describe("secrets", () => {
  describe("SecretsBroker", () => {
    it("should fetch all configured secrets", async () => {
      const spec: EnvironmentSpec = {
        name: "test-env",
        secrets: [
          { provider: "vault", path: "kv/prod/db" },
          { provider: "aws", path: "secrets/api-key" },
        ],
      };

      const broker = new SecretsBroker(spec);
      const secrets = await broker.fetchAll();

      expect(Object.keys(secrets)).toHaveLength(2);
      expect(secrets["vault:kv/prod/db"]).toBe(
        "placeholder-secret-for-vault:kv/prod/db",
      );
      expect(secrets["aws:secrets/api-key"]).toBe(
        "placeholder-secret-for-aws:secrets/api-key",
      );
    });

    it("should handle spec with no secrets", async () => {
      const spec: EnvironmentSpec = {
        name: "test-env",
      };

      const broker = new SecretsBroker(spec);
      const secrets = await broker.fetchAll();

      expect(Object.keys(secrets)).toHaveLength(0);
    });

    it("should handle secrets with rotation days", async () => {
      const spec: EnvironmentSpec = {
        name: "test-env",
        secrets: [{ provider: "vault", path: "kv/test", rotationDays: 30 }],
      };

      const broker = new SecretsBroker(spec);
      const secrets = await broker.fetchAll();

      expect(secrets["vault:kv/test"]).toBeDefined();
    });

    it("should generate unique keys for each secret", async () => {
      const spec: EnvironmentSpec = {
        name: "test-env",
        secrets: [
          { provider: "vault", path: "kv/prod" },
          { provider: "vault", path: "kv/staging" },
        ],
      };

      const broker = new SecretsBroker(spec);
      const secrets = await broker.fetchAll();

      expect(Object.keys(secrets)).toHaveLength(2);
      expect(secrets["vault:kv/prod"]).not.toBe(secrets["vault:kv/staging"]);
    });

    it("should accept custom cwd option", async () => {
      const spec: EnvironmentSpec = {
        name: "test-env",
        secrets: [{ provider: "test", path: "path" }],
      };

      const customCwd = "/custom/path";
      const broker = new SecretsBroker(spec, { cwd: customCwd });
      const secrets = await broker.fetchAll();

      expect(secrets["test:path"]).toBeDefined();
    });
  });
});
