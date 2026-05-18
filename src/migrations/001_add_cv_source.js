/**
 * Migration: Add cv_source column to cv_archives table
 * Tracks whether CV came from file upload or manual input
 */

/**
 * Run this migration with database pool
 * @param {Pool} pool - PostgreSQL pool instance
 */
export async function upWithPool(pool) {
  try {
    const query = `
      ALTER TABLE cv_archives
      ADD COLUMN IF NOT EXISTS cv_source varchar DEFAULT 'upload';
    `;
    await pool.query(query);
  } catch (error) {
    throw new Error(`Migration failed: ${error.message}`);
  }
}
