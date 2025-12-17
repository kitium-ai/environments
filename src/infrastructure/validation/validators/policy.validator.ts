import type {
  IValidator,
  ValidationResult,
} from "../../../shared/interfaces/validator.interface.js";
import type { EnvironmentSpec } from "../../../types.js";

/**
 * Validates policy configurations in environment spec
 */
export class PolicyValidator implements IValidator<EnvironmentSpec> {
  validate(spec: EnvironmentSpec): ValidationResult {
    const errors: Array<{ code: string; message: string; field?: string }> = [];

    if (!spec.policies) {
      return { isValid: true, errors: [] };
    }

    if (!Array.isArray(spec.policies)) {
      errors.push({
        code: "POLICIES_NOT_ARRAY",
        message: "Policies must be an array",
        field: "policies",
      });
      return { isValid: false, errors };
    }

    for (let index = 0; index < spec.policies.length; index++) {
      const policy = spec.policies[index];

      if (!policy || typeof policy !== "string") {
        errors.push({
          code: "POLICY_INVALID_TYPE",
          message: `Policy at index ${index} must be a string (file path)`,
          field: `policies[${index}]`,
        });
        continue;
      }

      if (policy.trim().length === 0) {
        errors.push({
          code: "POLICY_EMPTY",
          message: `Policy at index ${index} cannot be empty`,
          field: `policies[${index}]`,
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
