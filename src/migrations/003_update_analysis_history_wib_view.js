export async function upWithPool(pool) {
  // Add ai_insight to the view so consumers can read it directly
  // Drop existing view, then create it with ai_insight included
  await pool.query(`
    DROP VIEW IF EXISTS public.analysis_history_wib CASCADE;
    CREATE VIEW public.analysis_history_wib AS
    SELECT
      id,
      user_id,
      cv_id,
      job_id,
      match_score,
      job_title_snapshot,
      company_snapshot,
      ai_insight,
      analyzed_at,
      to_char((analyzed_at AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD HH24:MI:SS') AS analyzed_at_wib
    FROM analysis_history ah;
  `);
}
