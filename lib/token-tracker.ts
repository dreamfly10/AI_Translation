/**
 * ⚠️ IMPORTANT
 * Do not refactor or change behavior in this file.
 * Changes here must be minimal and error-driven only.
 */

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

  // Enforce correct token limits based on user type
  const isTrialUser = user.userType === 'trial';
  const isPaidUser = user.userType === 'paid';
  
  // Set the correct limit based on user type
  // For paid users, minimum is 100k, but allow higher limits (for transferred trial tokens)
  const minimumPaidLimit = 100000; // 100k minimum for paid users
  const trialLimit = 5000; // 5k for trial users
  
  let correctLimit: number;
  if (isPaidUser) {
    // For paid users, use stored limit if >= 100k, otherwise use 100k
    correctLimit = user.tokenLimit >= minimumPaidLimit ? user.tokenLimit : minimumPaidLimit;
    
    // Migrate existing paid users to minimum 100k if they have less
    if (user.tokenLimit < minimumPaidLimit) {
      try {
        await db.user.update(userId, {
          tokenLimit: minimumPaidLimit,
        });
        user.tokenLimit = minimumPaidLimit;
      } catch (error) {
        console.error('Error updating user token limit:', error);
      }
    }
  } else {
    // For trial users, minimum is 5k, but allow higher limits (for purchased tokens)
    correctLimit = user.tokenLimit >= trialLimit ? user.tokenLimit : trialLimit;
    
    // Migrate trial users to minimum 5k if they have less
    if (user.tokenLimit < trialLimit) {
      try {
        await db.user.update(userId, {
          tokenLimit: trialLimit,
        });
        user.tokenLimit = trialLimit;
        correctLimit = trialLimit;
      } catch (error) {
        console.error('Error updating user token limit:', error);
      }
    }
  }
  
  const tokensRemaining = correctLimit - user.tokensUsed;
  const hasRemainingTokens = tokensRemaining > 0;
  
  // Check if subscription is still active for paid users
  let subscriptionActive = true;
  if (isPaidUser && user.subscriptionExpiresAt) {
    subscriptionActive = new Date(user.subscriptionExpiresAt) > new Date();
  }
  
  // Paid users can use tokens if subscription is active and they have remaining tokens
  // Trial users can only use tokens if they have remaining tokens
  const allowed = (isPaidUser && subscriptionActive && hasRemainingTokens) || 
                  (isTrialUser && hasRemainingTokens);
  
  return {
    allowed,
    tokensUsed: user.tokensUsed,
    tokensRemaining: Math.max(0, tokensRemaining),
    limit: correctLimit, // Always return the correct limit
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
  
  // Track token usage for both trial and paid users
  // Paid users have a 100k token monthly limit that resets with subscription renewal
  // Trial users have a 1K token limit
  await db.user.update(userId, {
    tokensUsed: user.tokensUsed + tokens,
  });
}

/**
 * Get token usage statistics for a user
 */
export async function getTokenUsage(userId: string) {
  return checkTokenLimit(userId);
}

