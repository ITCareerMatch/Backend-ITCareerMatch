import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js";

class AnalysisRepository {
  // Create analysis history record
  async createAnalysisHistory({
    userId,
    cvId,
    jobId,
    matchScore,
    jobTitleSnapshot,
    companySnapshot,
  }) {
    const id = uuidv4();
    const query = `
      INSERT INTO analysis_history (id, user_id, cv_id, job_id, match_score, job_title_snapshot, company_snapshot, analyzed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, user_id, cv_id, job_id, match_score, job_title_snapshot, company_snapshot, analyzed_at
    `;

    const { rows } = await pool.query(query, [
      id,
      userId,
      cvId,
      jobId,
      matchScore,
      jobTitleSnapshot,
      companySnapshot,
    ]);
    return rows[0];
  }

  // Create analysis details (skill match/gap)
  async createAnalysisDetails(analysisId, details) {
    // details format: [{ skill_id, skill_name_snapshot, status, ai_insight }, ...]
    if (!details || details.length === 0) return;

    const query = `
      INSERT INTO analysis_details (id, analysis_id, skill_id, skill_name_snapshot, status, ai_insight)
      VALUES ${details.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5}, $${i * 5 + 6})`).join(", ")}
    `;

    const values = [];
    details.forEach((detail) => {
      values.push(
        uuidv4(),
        analysisId,
        detail.skill_id,
        detail.skill_name_snapshot,
        detail.status,
        detail.ai_insight || null,
      );
    });

    await pool.query(query, values);
  }

  // Get analysis history for user
  async getAnalysisHistory(userId, limit = 100, offset = 0) {
    const query = `
      SELECT id, user_id, cv_id, job_id, match_score, job_title_snapshot, company_snapshot, analyzed_at
      FROM analysis_history
      WHERE user_id = $1
      ORDER BY analyzed_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await pool.query(query, [userId, limit, offset]);
    return rows;
  }

  // Get analysis history count for user
  async getAnalysisHistoryCount(userId) {
    const query = `SELECT COUNT(*) FROM analysis_history WHERE user_id = $1`;
    const { rows } = await pool.query(query, [userId]);
    return parseInt(rows[0].count);
  }

  // Get analysis detail by ID
  async getAnalysisById(analysisId) {
    const query = `
      SELECT id, user_id, cv_id, job_id, match_score, job_title_snapshot, company_snapshot, analyzed_at
      FROM analysis_history
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [analysisId]);
    return rows[0] || null;
  }

  // Get analysis details (skills breakdown)
  async getAnalysisDetails(analysisId) {
    const query = `
      SELECT id, analysis_id, skill_id, skill_name_snapshot, status, ai_insight
      FROM analysis_details
      WHERE analysis_id = $1
      ORDER BY status DESC
    `;
    const { rows } = await pool.query(query, [analysisId]);
    return rows;
  }

  // Check if analysis already exists for CV + Job combo
  async checkAnalysisExists(cvId, jobId) {
    const query = `
      SELECT id FROM analysis_history
      WHERE cv_id = $1 AND job_id = $2
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [cvId, jobId]);
    return rows[0] || null;
  }

  // Get top recommendations for user (Top-20 jobs with highest match scores)
  async getTopRecommendations(userId, limit = 20) {
    const query = `
      SELECT 
        ah.id as analysis_id,
        ah.job_id,
        ah.match_score,
        ah.job_title_snapshot,
        ah.company_snapshot,
        ah.analyzed_at,
        j.external_url,
        j.location,
        COUNT(CASE WHEN ad.status = 'match' THEN 1 END) as skill_match_count,
        COUNT(CASE WHEN ad.status = 'gap' THEN 1 END) as skill_gap_count
      FROM analysis_history ah
      JOIN jobs j ON j.id = ah.job_id
      LEFT JOIN analysis_details ad ON ad.analysis_id = ah.id
      WHERE ah.user_id = $1
      GROUP BY ah.id, ah.job_id, ah.match_score, ah.job_title_snapshot, ah.company_snapshot, ah.analyzed_at, j.external_url, j.location
      ORDER BY ah.match_score DESC
      LIMIT $2
    `;
    const { rows } = await pool.query(query, [userId, limit]);
    return rows;
  }
}

export default new AnalysisRepository();
