import type {
  IValidator,
  ValidationResult,
} from "../../../shared/interfaces/validator.interface.js";
import type { EnvironmentSpec } from "../../../types.js";

/**
 * Validates toolchain configurations in environment spec
 */
export class ToolchainValidator implements IValidator<EnvironmentSpec> {
  validate(spec: EnvironmentSpec): ValidationResult {
    const errors: Array<{ code: string; message: string; field?: string }> = [];

    if (!spec.toolchains) {
      return { isValid: true, errors: [] };
    }

    if (!Array.isArray(spec.toolchains)) {
      errors.push({
        code: "TOOLCHAINS_NOT_ARRAY",
        message: "Toolchains must be an array",
        field: "toolchains",
      });
      return { isValid: false, errors };
    }

    for (let index = 0; index < spec.toolchains.length; index++) {
      const toolchain = spec.toolchains[index];

      if (!toolchain || typeof toolchain !== "object") {
        errors.push({
          code: "TOOLCHAIN_INVALID_TYPE",
          message: `Toolchain at index ${index} must be an object`,
          field: `toolchains[${index}]`,
        });
        continue;
      }

      if (!toolchain.name || typeof toolchain.name !== "string") {
        errors.push({
          code: "TOOLCHAIN_NAME_REQUIRED",
          message: `Toolchain at index ${index} requires a name field (string)`,
          field: `toolchains[${index}].name`,
        });
      }

      if (!toolchain.version || typeof toolchain.version !== "string") {
        errors.push({
          code: "TOOLCHAIN_VERSION_REQUIRED",
          message: `Toolchain at index ${index} requires a version field (string)`,
          field: `toolchains[${index}].version`,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  setNext(): IValidator<EnvironmentSpec> {
    // Chain of Responsibility: allow chaining (not used in this implementation)
    return this;
  }
}
