export class AppError extends Error {
  constructor(code, message, details = []) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(code, message, details = []) {
    super(code, message, details);
    this.name = 'ValidationError';
  }
}

export class NormalizationError extends AppError {
  constructor(code, message, details = []) {
    super(code, message, details);
    this.name = 'NormalizationError';
  }
}
