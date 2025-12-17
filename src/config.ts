import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { NotFoundError, ValidationError } from "@kitiumai/error";
import { isObject } from "@kitiumai/utils-ts";
import { parse as parseYaml } from "yaml";

import type { EnvironmentSpec } from "./types.js";

const SOURCE = "@kitiumai/envkit";

export type LoadSpecOptions = {
  cwd?: string;
};

export function fingerprintSpec(spec: EnvironmentSpec): string {
  const stable = JSON.stringify(spec, Object.keys(spec).sort());
  return createHash("sha256").update(stable).digest("hex");
}

export async function loadSpec(
  specPath: string,
  options: LoadSpecOptions = {},
): Promise<EnvironmentSpec> {
  const cwd = options.cwd ?? process.cwd();
  const fullPath = path.isAbsolute(specPath)
    ? specPath
    : path.join(cwd, specPath);

  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    const parsed = parseContent(raw, specPath);
    validateSpec(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new NotFoundError({
        code: "envkit/spec_not_found",
        message: `Environment spec not found: ${fullPath}`,
        severity: "error",
        retryable: false,
        source: SOURCE,
        cause: error,
      });
    }
    throw error;
  }
}

function parseContent(raw: string, specPath: string): EnvironmentSpec {
  const extension = path.extname(specPath).toLowerCase();
  try {
    if (extension === ".json") {
      return JSON.parse(raw) as EnvironmentSpec;
    }
    return parseYaml(raw) as EnvironmentSpec;
  } catch (error) {
    throw new ValidationError({
      code: "envkit/spec_parse_error",
      message: `Failed to parse environment spec: ${specPath}`,
      severity: "error",
      retryable: false,
      source: SOURCE,
      cause: error as Error,
    });
  }
}

function validateSpec(spec: EnvironmentSpec): void {
  if (!isObject(spec)) {
    throw new ValidationError({
      code: "envkit/spec_invalid",
      message: "Environment spec must be an object.",
      severity: "error",
      retryable: false,
      source: SOURCE,
    });
  }
  if (!spec.name || typeof spec.name !== "string") {
    throw new ValidationError({
      code: "envkit/spec_invalid",
      message: "Environment spec requires a valid name string.",
      severity: "error",
      retryable: false,
      source: SOURCE,
    });
  }
}
