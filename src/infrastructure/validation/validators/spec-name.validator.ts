import type {
  IValidator,
  ValidationResult,
} from "../../../shared/interfaces/validator.interface.js";
import type { EnvironmentSpec } from "../../../types.js";

/**
 * Validates environment spec name field
 */
export class SpecNameValidator implements IValidator<EnvironmentSpec> {
  validate(spec: EnvironmentSpec): ValidationResult {
    const errors: Array<{ code: string; message: string; field?: string }> = [];

    if (!spec.name) {
      errors.push({
        code: "SPEC_NAME_REQUIRED",
        message: "Environment spec requires a name field",
        field: "name",
      });
    } else if (typeof spec.name !== "string") {
      errors.push({
        code: "SPEC_NAME_TYPE",
        message: "Environment spec name must be a string",
        field: "name",
      });
    } else if (spec.name.trim().length === 0) {
      errors.push({
        code: "SPEC_NAME_EMPTY",
        message: "Environment spec name cannot be empty",
        field: "name",
      });
    } else if (spec.name.length > 255) {
      errors.push({
        code: "SPEC_NAME_TOO_LONG",
        message: "Environment spec name must be less than 255 characters",
        field: "name",
      });
    } else if (!/^[a-zA-Z0-9_-]+$/.test(spec.name)) {
      errors.push({
        code: "SPEC_NAME_INVALID_CHARS",
        message:
          "Environment spec name can only contain alphanumeric characters, dashes, and underscores",
        field: "name",
      });
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
