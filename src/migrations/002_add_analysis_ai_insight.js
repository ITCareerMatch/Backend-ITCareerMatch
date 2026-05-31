export async function upWithPool(pool) {
  await pool.query(`
    ALTER TABLE analysis_history
    ADD COLUMN IF NOT EXISTS ai_insight TEXT
  `);
}
