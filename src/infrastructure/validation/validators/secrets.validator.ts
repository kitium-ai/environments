import type {
  IValidator,
  ValidationResult,
} from "../../../shared/interfaces/validator.interface.js";
import type { EnvironmentSpec } from "../../../types.js";

/**
 * Validates secret provider configurations in environment spec
 */
export class SecretsValidator implements IValidator<EnvironmentSpec> {
  private validateSecret(
    secret: unknown,
    index: number,
  ): Array<{ code: string; message: string; field?: string }> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];

    if (!secret || typeof secret !== "object") {
      return [
        {
          code: "SECRET_INVALID_TYPE",
          message: `Secret at index ${index} must be an object`,
          field: `secrets[${index}]`,
        },
      ];
    }

    const typedSecret = secret as {
      provider?: unknown;
      path?: unknown;
      rotationDays?: unknown;
    };

    if (!typedSecret.provider || typeof typedSecret.provider !== "string") {
      errors.push({
        code: "SECRET_PROVIDER_REQUIRED",
        message: `Secret at index ${index} requires a provider field (string)`,
        field: `secrets[${index}].provider`,
      });
    }

    if (!typedSecret.path || typeof typedSecret.path !== "string") {
      errors.push({
        code: "SECRET_PATH_REQUIRED",
        message: `Secret at index ${index} requires a path field (string)`,
        field: `secrets[${index}].path`,
      });
    }

    if (
      typedSecret.rotationDays !== undefined &&
      typeof typedSecret.rotationDays !== "number"
    ) {
      errors.push({
        code: "SECRET_ROTATION_TYPE",
        message: `Secret at index ${index} rotationDays must be a number`,
        field: `secrets[${index}].rotationDays`,
      });
    }

    return errors;
  }

  validate(spec: EnvironmentSpec): ValidationResult {
    const errors: Array<{ code: string; message: string; field?: string }> = [];

    if (!spec.secrets) {
      return { isValid: true, errors: [] };
    }

    if (!Array.isArray(spec.secrets)) {
      errors.push({
        code: "SECRETS_NOT_ARRAY",
        message: "Secrets must be an array",
        field: "secrets",
      });
      return { isValid: false, errors };
    }

    for (const [index, secret] of spec.secrets.entries()) {
      errors.push(...this.validateSecret(secret, index));
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
