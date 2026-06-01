import pool from "../src/config/db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Backfill job requirements yang kosong/invalid dengan template generik
 * Run: node scripts/backfill_job_requirements.js
 */

async function backfillRequirements() {
  try {
    console.log("[Backfill] Starting job requirements backfill...\n");

    // 1. Find jobs dengan requirements invalid (NULL, empty, atau < 100 chars)
    const findInvalidQuery = `
      SELECT id, title
      FROM jobs
      WHERE requirements IS NULL 
         OR requirements = ''
         OR length(COALESCE(requirements, '')) < 100
      ORDER BY created_at DESC
    `;

    const invalidJobs = await pool.query(findInvalidQuery);
    console.log(
      `[Backfill] Found ${invalidJobs.rows.length} jobs dengan requirements invalid\n`,
    );

    if (invalidJobs.rows.length === 0) {
      console.log("[Backfill] ✓ Semua jobs sudah memiliki requirements valid!");
      process.exit(0);
    }

    // 2. Generate template requirement berdasarkan job title
    const generateTemplate = (title) => {
      return `Lowongan: ${title}

Persyaratan Umum:
- Pendidikan minimal D3/S1 di bidang terkait
- Pengalaman kerja minimal 1-2 tahun
- Kemampuan komunikasi yang baik
- Dapat bekerja dalam tim
- Bersedia bekerja full-time

Syarat Teknis:
- Menguasai tools dan teknologi yang relevan untuk posisi ini
- Mampu menangani masalah teknis dengan baik
- Proaktif dan selalu ingin belajar

Bagian dari tim yang inovatif dan dinamis.`;
    };

    // 3. Update setiap job dengan template
    let successCount = 0;
    let failCount = 0;

    for (const job of invalidJobs.rows) {
      try {
        const template = generateTemplate(job.title);
        const updateQuery = `UPDATE jobs SET requirements = $1, updated_at = NOW() WHERE id = $2`;

        await pool.query(updateQuery, [template, job.id]);
        successCount++;
        console.log(`✓ Updated: ${job.title} (ID: ${job.id})`);
      } catch (error) {
        failCount++;
        console.error(`✗ Failed: ${job.title} (ID: ${job.id})`, error.message);
      }
    }

    console.log(
      `\n[Backfill] Hasil: ${successCount} berhasil, ${failCount} gagal`,
    );
    console.log("[Backfill] Selesai! ✓");
    process.exit(0);
  } catch (error) {
    console.error("[Backfill] Error:", error);
    process.exit(1);
  }
}

backfillRequirements();
