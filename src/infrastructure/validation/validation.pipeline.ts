import type {
  IValidator,
  ValidationResult,
} from "../../shared/interfaces/validator.interface.js";

/**
 * Validation pipeline implementing Chain of Responsibility pattern
 * Executes validators in sequence and combines results
 * Enables extensible validation without modifying core validation logic
 */
export class ValidationPipeline<T> {
  private validators: Array<IValidator<T>> = [];

  /**
   * Add a validator to the pipeline
   */
  addValidator(validator: IValidator<T>): this {
    this.validators.push(validator);
    return this;
  }

  /**
   * Add multiple validators at once
   */
  addValidators(validators: Array<IValidator<T>>): this {
    this.validators.push(...validators);
    return this;
  }

  /**
   * Execute all validators against input
   * Returns combined result with all errors
   */
  validate(input: T): ValidationResult {
    const allErrors: Array<{ code: string; message: string; field?: string }> =
      [];

    for (const validator of this.validators) {
      const result = validator.validate(input);
      if (!result.isValid) {
        allErrors.push(...result.errors);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  /**
   * Get number of validators in pipeline
   */
  getValidatorCount(): number {
    return this.validators.length;
  }

  /**
   * Clear all validators
   */
  clear(): void {
    this.validators = [];
  }
}
