/**
 * Base Application Error class.
 * All domain-specific error classes inherit from this base class.
 */
export class AppError extends Error {
  /** The HTTP status code equivalent for the error. */
  public readonly statusCode: number;
  /** Custom operational flag distinguishing planned exceptions from system crashes. */
  public readonly isOperational: boolean;

  /**
   * Initializes a new AppError instance.
   * 
   * @param message - User-friendly detail message.
   * @param statusCode - HTTP status equivalent (default: 500).
   * @param isOperational - True if this is a handled domain constraint exception.
   */
  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error class.
 * Triggered on model/schema validation issues or form constraint check failures.
 */
export class ValidationError extends AppError {
  /** Details field mapping parameter checks to specific rules. */
  public readonly details?: Record<string, string>;

  /**
   * Initializes a ValidationError.
   * 
   * @param message - Description of the validation failure.
   * @param details - Optional dictionary of field errors.
   */
  constructor(message: string, details?: Record<string, string>) {
    super(message, 400);
    this.details = details;
  }
}

/**
 * Database Error class.
 * Triggered when a Supabase SDK query fails or raises relational constraints.
 */
export class DatabaseError extends AppError {
  /** The raw database error code from PostgreSQL. */
  public readonly code?: string;

  /**
   * Initializes a DatabaseError.
   * 
   * @param message - DB error description.
   * @param code - Raw Postgres error code.
   */
  constructor(message: string, code?: string) {
    super(message, 500);
    this.code = code;
  }
}

/**
 * Authentication Error class.
 * Triggered when verification details are missing or credentials fail.
 */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication verification failed.") {
    super(message, 401);
  }
}

/**
 * Authorization Error class.
 * Triggered when the current user claims lack the role privilege to access a module.
 */
export class AuthorizationError extends AppError {
  constructor(message = "Unauthorized access attempt blocked.") {
    super(message, 403);
  }
}

/**
 * Resource NotFound Error class.
 * Triggered when a requested record ID does not exist in database.
 */
export class NotFoundError extends AppError {
  constructor(message = "Requested resource not found.") {
    super(message, 404);
  }
}

/**
 * Storage Bucket Operations Error class.
 * Triggered when payment proof files uploads or deletes fail.
 */
export class StorageError extends AppError {
  constructor(message: string) {
    super(message, 500);
  }
}
