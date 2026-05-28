export const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,
  aiApiUrl: process.env.AI_API_URL || "http://localhost:8000",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  internalApiKey: process.env.INTERNAL_API_KEY,
};

export default config;
