import IORedis from "ioredis";
import { v4 as uuidv4 } from "uuid";

const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

const SESSION_TTL = 30 * 60; // 30 minutes in seconds
const SESSION_PREFIX = "session:";

/**
 * Create a temporary guest session in Redis
 * @param {Object} sessionData - Data to store (raw_text, extracted_skills, skill_gap, ai_insight, preview_score)
 * @returns {String} temp_token
 */
export async function createGuestSession(sessionData) {
  try {
    const tempToken = uuidv4();
    const sessionKey = `${SESSION_PREFIX}${tempToken}`;

    // Store session with TTL 30 minutes
    await redis.setex(
      sessionKey,
      SESSION_TTL,
      JSON.stringify({
        ...sessionData,
        created_at: new Date().toISOString(),
      }),
    );

    return tempToken;
  } catch (error) {
    console.error("Error creating guest session:", error);
    throw error;
  }
}

/**
 * Get session data from Redis using temp_token
 * @param {String} tempToken
 * @returns {Object} Session data or null if expired/not found
 */
export async function getGuestSession(tempToken) {
  try {
    const sessionKey = `${SESSION_PREFIX}${tempToken}`;
    const data = await redis.get(sessionKey);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error("Error retrieving guest session:", error);
    throw error;
  }
}

/**
 * Delete session from Redis (after claim or expiration)
 * @param {String} tempToken
 */
export async function deleteGuestSession(tempToken) {
  try {
    const sessionKey = `${SESSION_PREFIX}${tempToken}`;
    await redis.del(sessionKey);
  } catch (error) {
    console.error("Error deleting guest session:", error);
    throw error;
  }
}

/**
 * Check if session exists and is still valid
 * @param {String} tempToken
 * @returns {Boolean}
 */
export async function sessionExists(tempToken) {
  try {
    const sessionKey = `${SESSION_PREFIX}${tempToken}`;
    const exists = await redis.exists(sessionKey);
    return exists === 1;
  } catch (error) {
    console.error("Error checking session existence:", error);
    throw error;
  }
}

export default {
  createGuestSession,
  getGuestSession,
  deleteGuestSession,
  sessionExists,
};
