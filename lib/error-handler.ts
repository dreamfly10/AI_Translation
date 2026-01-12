/**
 * Centralized error handling with user-friendly messages
 * All backend errors are sanitized before reaching users
 * NEVER exposes technical details to end users
 */

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  actionable?: string;
  statusCode: number;
}

export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Token errors
  TOKEN_LIMIT_REACHED: 'TOKEN_LIMIT_REACHED',
  INSUFFICIENT_TOKENS: 'INSUFFICIENT_TOKENS',
  
  // Content errors
  CONTENT_EXTRACTION_FAILED: 'CONTENT_EXTRACTION_FAILED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  INVALID_URL: 'INVALID_URL',
  EMPTY_CONTENT: 'EMPTY_CONTENT',
  
  // API errors
  OPENAI_ERROR: 'OPENAI_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

const ErrorMessages: Record<string, AppError> = {
  [ErrorCodes.UNAUTHORIZED]: {
    code: ErrorCodes.UNAUTHORIZED,
    message: 'User is not authenticated',
    userMessage: 'Please sign in to continue',
    actionable: 'Sign in to access this feature',
    statusCode: 401,
  },
  [ErrorCodes.SESSION_EXPIRED]: {
    code: ErrorCodes.SESSION_EXPIRED,
    message: 'Session has expired',
    userMessage: 'Your session has expired. Please sign in again.',
    actionable: 'Sign in again',
    statusCode: 401,
  },
  [ErrorCodes.TOKEN_LIMIT_REACHED]: {
    code: ErrorCodes.TOKEN_LIMIT_REACHED,
    message: 'Token limit reached',
    userMessage: 'You\'ve used all your free tokens. Upgrade to continue translating articles.',
    actionable: 'Upgrade to paid plan',
    statusCode: 403,
  },
  [ErrorCodes.INSUFFICIENT_TOKENS]: {
    code: ErrorCodes.INSUFFICIENT_TOKENS,
    message: 'Insufficient tokens',
    userMessage: 'You don\'t have enough tokens for this article. Upgrade for unlimited access.',
    actionable: 'Upgrade to paid plan',
    statusCode: 403,
  },
  [ErrorCodes.CONTENT_EXTRACTION_FAILED]: {
    code: ErrorCodes.CONTENT_EXTRACTION_FAILED,
    message: 'Failed to extract content from URL',
    userMessage: 'We couldn\'t extract the article content. Please try again later or paste the text directly.',
    actionable: 'Try pasting the article text directly instead',
    statusCode: 400,
  },
  [ErrorCodes.SUBSCRIPTION_REQUIRED]: {
    code: ErrorCodes.SUBSCRIPTION_REQUIRED,
    message: 'Article requires subscription',
    userMessage: 'This article requires a subscription to the source website.',
    actionable: 'Sign in to the website and copy the article content',
    statusCode: 402,
  },
  [ErrorCodes.INVALID_URL]: {
    code: ErrorCodes.INVALID_URL,
    message: 'Invalid URL provided',
    userMessage: 'The URL you provided is invalid or not accessible.',
    actionable: 'Please check the URL and try again',
    statusCode: 400,
  },
  [ErrorCodes.EMPTY_CONTENT]: {
    code: ErrorCodes.EMPTY_CONTENT,
    message: 'No content found',
    userMessage: 'The article appears to be empty or we couldn\'t find any content.',
    actionable: 'Please check the URL or try pasting the text directly',
    statusCode: 400,
  },
  [ErrorCodes.OPENAI_ERROR]: {
    code: ErrorCodes.OPENAI_ERROR,
    message: 'AI processing error',
    userMessage: 'We encountered an error while processing your article. Please try again later.',
    actionable: 'Please try again in a few moments',
    statusCode: 500,
  },
  [ErrorCodes.NETWORK_ERROR]: {
    code: ErrorCodes.NETWORK_ERROR,
    message: 'Network error',
    userMessage: 'We couldn\'t connect to our servers. Please check your internet connection and try again.',
    actionable: 'Check your connection and try again',
    statusCode: 503,
  },
  [ErrorCodes.INVALID_INPUT]: {
    code: ErrorCodes.INVALID_INPUT,
    message: 'Invalid input provided',
    userMessage: 'The information you provided is invalid. Please check and try again.',
    actionable: 'Review your input and try again',
    statusCode: 400,
  },
  [ErrorCodes.UNKNOWN_ERROR]: {
    code: ErrorCodes.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
    userMessage: 'Something went wrong. Please try again later.',
    actionable: 'Please try again later',
    statusCode: 500,
  },
  [ErrorCodes.SERVER_ERROR]: {
    code: ErrorCodes.SERVER_ERROR,
    message: 'Server error',
    userMessage: 'Our servers are experiencing issues. Please try again later.',
    actionable: 'Try again in a few moments',
    statusCode: 500,
  },
};

/**
 * Sanitize error - converts any error to a user-friendly AppError
 * NEVER exposes backend details to users
 */
export function sanitizeError(error: any, context?: string): AppError {
  // Log full error details server-side only (for debugging)
  if (typeof window === 'undefined') {
    console.error(`[ERROR HANDLER] ${context || 'Unknown context'}:`, {
      error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
  }

  // If it's already a sanitized AppError, return it
  if (error?.code && ErrorMessages[error.code]) {
    return {
      ...ErrorMessages[error.code],
      userMessage: error.userMessage || ErrorMessages[error.code].userMessage,
    };
  }

  // If it's an API error response
  if (error?.error && typeof error.error === 'string') {
    const errorCode = Object.keys(ErrorCodes).find(
      (key) => ErrorCodes[key as keyof typeof ErrorCodes] === error.error
    );
    if (errorCode) {
      return ErrorMessages[errorCode];
    }
  }

  // Check error message for known patterns (but don't expose them)
  const errorMessage = error?.message || error?.error || String(error || 'Unknown error');
  
  // Map known error patterns to user-friendly messages
  if (errorMessage.includes('token') && (errorMessage.includes('limit') || errorMessage.includes('reached'))) {
    return ErrorMessages[ErrorCodes.TOKEN_LIMIT_REACHED];
  }
  if (errorMessage.includes('token') && errorMessage.includes('insufficient')) {
    return ErrorMessages[ErrorCodes.INSUFFICIENT_TOKENS];
  }
  if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication') || errorMessage.includes('session')) {
    return ErrorMessages[ErrorCodes.UNAUTHORIZED];
  }
  if (errorMessage.includes('subscription') || errorMessage.includes('paywall')) {
    return ErrorMessages[ErrorCodes.SUBSCRIPTION_REQUIRED];
  }
  if (errorMessage.includes('extract') || errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return ErrorMessages[ErrorCodes.NETWORK_ERROR];
  }
  if (errorMessage.includes('OpenAI') || errorMessage.includes('API key') || errorMessage.includes('GPT')) {
    return ErrorMessages[ErrorCodes.OPENAI_ERROR];
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return ErrorMessages[ErrorCodes.NETWORK_ERROR];
  }
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
    return ErrorMessages[ErrorCodes.NETWORK_ERROR];
  }

  // Default: return generic error (never expose actual error message)
  return ErrorMessages[ErrorCodes.UNKNOWN_ERROR];
}

/**
 * Parse error from API response or error object
 * @deprecated Use sanitizeError instead
 */
export function parseError(error: any): AppError {
  return sanitizeError(error);
}

/**
 * Create a safe API error response
 * Use this in all API routes to ensure consistent error format
 */
export function createErrorResponse(error: any, context?: string): Response {
  const sanitized = sanitizeError(error, context);
  
  return new Response(
    JSON.stringify({
      error: sanitized.code,
      message: sanitized.userMessage, // Only user-friendly message
      userMessage: sanitized.userMessage,
      actionable: sanitized.actionable,
    }),
    {
      status: sanitized.statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create a NextResponse error (for Next.js API routes)
 */
export function createNextErrorResponse(error: any, context?: string) {
  const sanitized = sanitizeError(error, context);
  
  return {
    error: sanitized.code,
    message: sanitized.userMessage,
    userMessage: sanitized.userMessage,
    actionable: sanitized.actionable,
    status: sanitized.statusCode,
  };
}
