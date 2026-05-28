import dotenv from "dotenv";
import pool from "../src/config/db.js";

dotenv.config();

async function main() {
  const userId = "38c6a311-74c3-4de6-bea2-6af72cd6463a";
  const cvId = "d82e220c-1b66-448d-8d13-a108810080d5";

  try {
    console.log("Checking analysis_history for user:", userId);
    const ah = await pool.query(
      `SELECT id, user_id, cv_id, job_id, match_score, job_title_snapshot, company_snapshot, analyzed_at
       FROM analysis_history WHERE user_id=$1 ORDER BY analyzed_at DESC LIMIT 20`,
      [userId],
    );

    console.log("analysis_history rows:", ah.rows.length);
    ah.rows.forEach((r) => console.log(r));

    console.log("\nChecking analysis_details for CV:", cvId);
    const ad = await pool.query(
      `SELECT ad.* FROM analysis_details ad
       JOIN analysis_history ah ON ah.id = ad.analysis_id
       WHERE ah.cv_id = $1 ORDER BY ad.id DESC LIMIT 50`,
      [cvId],
    );

    console.log("analysis_details rows:", ad.rows.length);
    ad.rows.forEach((r) => console.log(r));

    console.log("\nChecking cv_skills for CV:", cvId);
    const cs = await pool.query(
      `SELECT * FROM cv_skills WHERE cv_id = $1 LIMIT 50`,
      [cvId],
    );
    console.log("cv_skills rows:", cs.rows.length);
    cs.rows.forEach((r) => console.log(r));

    process.exit(0);
  } catch (err) {
    console.error("DB check error:", err);
    process.exit(1);
  }
}

main();
