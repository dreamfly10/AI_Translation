import { db } from './db';

/**
 * Calculate approximate token usage for a text string
 * Rough estimation: ~4 characters = 1 token
 * For more accuracy, consider using tiktoken library
 */
export async function calculateTokensUsed(text: string): Promise<number> {
  // Rough estimation: ~4 characters = 1 token
  // This is a simplified calculation. For production, consider using tiktoken
  return Math.ceil(text.length / 4);
}

/**
 * Check if user has remaining tokens and return usage status
 */
export async function checkTokenLimit(userId: string): Promise<{
  allowed: boolean;
  tokensUsed: number;
  tokensRemaining: number;
  limit: number;
  userType: 'trial' | 'paid';
}> {
  const user = await db.user.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const tokensRemaining = user.tokenLimit - user.tokensUsed;
  
  // For trial users, strictly enforce the limit - no processing if limit is reached
  // For paid users, allow unlimited usage
  const isTrialUser = user.userType === 'trial';
  const hasRemainingTokens = tokensRemaining > 0;
  
  return {
    allowed: user.userType === 'paid' || (isTrialUser && hasRemainingTokens),
    tokensUsed: user.tokensUsed,
    tokensRemaining: Math.max(0, tokensRemaining),
    limit: user.tokenLimit,
    userType: user.userType,
  };
}

/**
 * Consume tokens for a user
 */
export async function consumeTokens(userId: string, tokens: number): Promise<void> {
  const user = await db.user.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // For paid users, we might want unlimited tokens or a higher limit
  // For now, we'll still track usage but allow it
  if (user.userType === 'paid') {
    // Paid users can have unlimited tokens, but we still track usage
    await db.user.update(userId, {
      tokensUsed: user.tokensUsed + tokens,
    });
  } else {
    // Trial users have a limit
    await db.user.update(userId, {
      tokensUsed: user.tokensUsed + tokens,
    });
  }
}

/**
 * Get token usage statistics for a user
 */
export async function getTokenUsage(userId: string) {
  return checkTokenLimit(userId);
}

