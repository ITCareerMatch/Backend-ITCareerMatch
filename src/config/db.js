require("dotenv").config(); // Load environment variables from .env file

const { Pool } = require("pg");

// Ambil URL dari .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase butuh SSL
});

module.exports = pool;
