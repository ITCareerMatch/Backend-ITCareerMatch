export const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,
  aiApiUrl: process.env.AI_API_URL || "http://localhost:8000",
  aiMatchJobLimit: Math.min(
    Math.max(parseInt(process.env.AI_MATCH_JOB_LIMIT || "20", 10) || 20, 1),
    100,
  ),
  aiMatchCandidatePoolLimit: Math.min(
    Math.max(
      parseInt(process.env.AI_MATCH_CANDIDATE_POOL_LIMIT || "600", 10) || 600,
      20,
    ),
    600,
  ),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  internalApiKey: process.env.INTERNAL_API_KEY,
};

export default config;
