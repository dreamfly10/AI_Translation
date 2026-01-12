/**
 * Helper function to upgrade a user from trial to paid
 * Transfers unused trial tokens to premium limit
 */

import { db } from './db';

const PREMIUM_TOKEN_LIMIT = 100000; // 100k tokens for paid users
const TRIAL_TOKEN_LIMIT = 5000; // 5k tokens for trial users

export interface UpgradeUserOptions {
  userId: string;
  subscriptionExpiresAt?: Date;
  paymentId?: string;
}

/**
 * Upgrades a user to paid status and transfers unused trial tokens
 * @param options - Upgrade options
 * @returns Updated user object
 */
export async function upgradeUserToPaid(options: UpgradeUserOptions) {
  const { userId, subscriptionExpiresAt, paymentId } = options;

  // Get current user to calculate token transfer
  const currentUser = await db.user.findById(userId);
  if (!currentUser) {
    throw new Error('User not found');
  }

  // Calculate token transfer:
  // If user is currently on trial, add unused tokens to premium limit
  // If user is already paid, just update subscription date
  let newTokenLimit = PREMIUM_TOKEN_LIMIT;
  let newTokensUsed = currentUser.tokensUsed;

  if (currentUser.userType === 'trial') {
    // Transfer unused tokens to premium
    // Use actual current limit (which may include purchased tokens), not just base trial limit
    const currentLimit = currentUser.tokenLimit;
    const unusedTokens = Math.max(0, currentLimit - currentUser.tokensUsed); // Ensure non-negative
    
    // Premium limit = 100k + unused tokens (includes both unused trial tokens and purchased tokens)
    newTokenLimit = PREMIUM_TOKEN_LIMIT + unusedTokens;
    
    // Tokens used stays the same (we're adding to the limit, not resetting usage)
    newTokensUsed = currentUser.tokensUsed;
    
    console.log(`[Upgrade] Transferring tokens for user ${userId}:`);
    console.log(`  - Current limit: ${currentLimit} (may include purchased tokens)`);
    console.log(`  - Tokens used: ${currentUser.tokensUsed}`);
    console.log(`  - Unused tokens: ${unusedTokens}`);
    console.log(`  - New premium limit: ${newTokenLimit}`);
    console.log(`  - Tokens used remains: ${newTokensUsed}`);
  } else {
    // User is already paid, just update subscription expiration
    // Keep existing token limit and usage (preserves purchased tokens)
    newTokenLimit = currentUser.tokenLimit || PREMIUM_TOKEN_LIMIT;
    newTokensUsed = currentUser.tokensUsed;
    
    console.log(`[Upgrade] Renewing subscription for paid user ${userId}:`);
    console.log(`  - Current limit: ${newTokenLimit} (preserved, may include purchased tokens)`);
    console.log(`  - Tokens used: ${newTokensUsed}`);
  }

  // Set subscription expiration (30 days from now if not provided)
  const expiresAt = subscriptionExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Update user to paid status
  const updatedUser = await db.user.update(userId, {
    userType: 'paid',
    tokenLimit: newTokenLimit,
    tokensUsed: newTokensUsed,
    subscriptionStatus: 'active',
    subscriptionExpiresAt: expiresAt,
    paymentId: paymentId || currentUser.paymentId,
  });

  if (!updatedUser) {
    throw new Error('Failed to upgrade user');
  }

  return updatedUser;
}
