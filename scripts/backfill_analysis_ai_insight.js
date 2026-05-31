import dotenv from "dotenv";
import axios from "axios";
import pool from "../src/config/db.js";

dotenv.config();

const batchLimit = Number.parseInt(process.env.BACKFILL_LIMIT || "0", 10);
const dryRun = (process.argv[2] || "").toLowerCase() === "--dry-run";

async function fetchMissingAnalyses() {
  const values = [];
  let query = `
    SELECT ah.id, ah.user_id, ah.cv_id, ah.job_id, ah.ai_insight,
           cv.raw_text AS cv_text,
           j.title AS job_title,
           j.company_name,
           j.requirements
    FROM analysis_history ah
    JOIN cv_archives cv ON cv.id = ah.cv_id
    JOIN jobs j ON j.id = ah.job_id
    WHERE ah.ai_insight IS NULL
      AND cv.raw_text IS NOT NULL
      AND cv.raw_text <> ''
    ORDER BY ah.analyzed_at DESC
  `;

  if (batchLimit > 0) {
    values.push(batchLimit);
    query += ` LIMIT $1`;
  }

  const { rows } = await pool.query(query, values);
  return rows;
}

async function computeInsight(row) {
  const payload = {
    cv_text: row.cv_text,
    job: {
      job_id: row.job_id,
      title: row.job_title || "",
      company_name: row.company_name || "",
      description: row.requirements || "",
    },
  };

  const { data } = await axios.post(
    `${process.env.AI_API_URL}/internal/ai/analyze-single`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Request": process.env.INTERNAL_API_KEY,
      },
    },
  );

  return data?.analysis?.ai_insight ?? null;
}

async function updateInsight(row, aiInsight) {
  await pool.query(
    `UPDATE analysis_history SET ai_insight = $1 WHERE id = $2`,
    [aiInsight, row.id],
  );

  await pool.query(
    `UPDATE analysis_details SET ai_insight = $1 WHERE analysis_id = $2 AND ai_insight IS NULL`,
    [aiInsight, row.id],
  );
}

async function main() {
  const rows = await fetchMissingAnalyses();
  console.log(`Found ${rows.length} analysis rows without ai_insight`);

  let updated = 0;

  for (const row of rows) {
    try {
      const aiInsight = await computeInsight(row);
      console.log(
        `[${updated + 1}/${rows.length}] ${row.id} -> ${aiInsight || "null"}`,
      );

      if (!dryRun && aiInsight) {
        await updateInsight(row, aiInsight);
        updated++;
      }
    } catch (error) {
      console.error(`Failed to backfill analysis ${row.id}:`, error.message);
    }
  }

  console.log(
    dryRun
      ? `Dry run completed for ${rows.length} rows`
      : `Backfill completed. Updated ${updated} rows`,
  );

  await pool.end();
}

main().catch(async (error) => {
  console.error("Backfill failed:", error);
  await pool.end();
  process.exit(1);
});
