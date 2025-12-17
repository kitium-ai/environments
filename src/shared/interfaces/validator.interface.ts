/**
 * Validation result from a validator
 */
export type ValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
};

/**
 * Individual validation error
 */
export type ValidationError = {
  code: string;
  message: string;
  field?: string;
};

/**
 * Validator interface for Chain of Responsibility pattern
 */
export type IValidator<T> = {
  /**
   * Validate input and return result
   */
  validate(input: T): ValidationResult;

  /**
   * Set next validator in chain
   */
  setNext(validator: IValidator<T>): IValidator<T>;
};
