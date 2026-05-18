import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js";
import { supabase } from "../lib/supabase.js";

class CvRepository {
  // Upload file to Supabase Storage
  async uploadToSupabase(file) {
    try {
      const fileName = `${Date.now()}-${file.originalname}`;
      const { data, error } = await supabase.storage
        .from("cv-uploads")
        .upload(`cvs/${fileName}`, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) throw error;
      return data.path;
    } catch (error) {
      console.error("Supabase upload error:", error);
      throw error;
    }
  }

  // Save CV Archive to database
  async saveCvArchive({
    userId,
    fileName,
    fileUrl,
    rawText,
    cvSource = "upload",
    status = "processing",
  }) {
    const id = uuidv4();
    const query = `
      INSERT INTO cv_archives (id, user_id, file_url, file_name, raw_text, cv_source, status, uploaded_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, user_id, file_url, file_name, raw_text, cv_source, status, uploaded_at
    `;

    const { rows } = await pool.query(query, [
      id,
      userId,
      fileUrl || null,
      fileName || null,
      rawText,
      cvSource,
      status,
    ]);
    return rows[0];
  }

  // Get CV Archive by ID
  async getCvArchiveById(id) {
    const query = `
      SELECT id, user_id, file_url, file_name, raw_text, cv_source, status, uploaded_at
      FROM cv_archives
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  // Update CV Archive status
  async updateCvArchiveStatus(id, status) {
    const query = `
      UPDATE cv_archives
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, user_id, file_url, file_name, raw_text, cv_source, status, uploaded_at
    `;
    const { rows } = await pool.query(query, [status, id]);
    return rows[0];
  }

  // Save extracted skills from CV
  async saveCvSkills(cvId, skills) {
    // skills format: [{ skill_id, confidence }, ...]
    const query = `
      INSERT INTO cv_skills (cv_id, skill_id, confidence)
      VALUES ${skills.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(", ")}
      ON CONFLICT (cv_id, skill_id) DO UPDATE SET confidence = EXCLUDED.confidence
    `;

    const values = [cvId];
    skills.forEach((skill) => {
      values.push(skill.skill_id, skill.confidence || 0.5);
    });

    await pool.query(query, values);
  }

  // Get CV skills with skill details
  async getCvSkills(cvId) {
    const query = `
      SELECT cs.skill_id, s.name, cs.confidence
      FROM cv_skills cs
      JOIN skills s ON s.id = cs.skill_id
      WHERE cs.cv_id = $1
      ORDER BY cs.confidence DESC
    `;
    const { rows } = await pool.query(query, [cvId]);
    return rows;
  }

  // Get latest CV for user
  async getLatestCvByUserId(userId) {
    const query = `
      SELECT id, user_id, file_url, file_name, raw_text, cv_source, status, uploaded_at
      FROM cv_archives
      WHERE user_id = $1 AND status = 'active'
      ORDER BY uploaded_at DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0] || null;
  }

  // Get all CV archives for user
  async getCvArchivesByUserId(userId) {
    const query = `
      SELECT id, user_id, file_url, file_name, raw_text, cv_source, status, uploaded_at
      FROM cv_archives
      WHERE user_id = $1
      ORDER BY uploaded_at DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }
}

export default new CvRepository();
