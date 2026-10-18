/**
 * API Error Response
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Handle API errors and return consistent error response
 */
export function handleError(error: unknown) {
  console.error('[API Error]', error)
  
  if (error instanceof APIError) {
    return {
      status: error.statusCode,
      body: {
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
      },
    }
  }

  if (error instanceof Error) {
    return {
      status: 500,
      body: {
        error: process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : error.message,
        code: 'INTERNAL_ERROR',
      },
    }
  }

  return {
    status: 500,
    body: {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    },
  }
}

/**
 * Success response
 */
export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message: message || 'Success',
  }
}

/**
 * Validation error response
 */
export function validationError(message: string, errors?: Record<string, string>) {
  throw new APIError(400, message, 'VALIDATION_ERROR')
}

/**
 * Not found error response
 */
export function notFoundError(resource: string) {
  throw new APIError(404, `${resource} not found`, 'NOT_FOUND')
}

/**
 * Unauthorized error response
 */
export function unauthorizedError(message = 'Unauthorized') {
  throw new APIError(401, message, 'UNAUTHORIZED')
}
