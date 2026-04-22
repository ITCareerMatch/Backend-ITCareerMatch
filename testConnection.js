require("dotenv").config(); // Load environment variables from .env file
console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("DIRECT_URL:", process.env.DIRECT_URL);

const pool = new (require("pg").Pool)({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    const res = await pool.query("SELECT NOW() AS current_time");
    console.log("Koneksi berhasil! Waktu saat ini:", res.rows[0].current_time);
    process.exit(0);
  } catch (err) {
    console.error("Koneksi gagal:", err);
    process.exit(1);
  }
})();
