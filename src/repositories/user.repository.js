import pool from "../config/db.js";

class UserRepository {
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, name, email, gender, avatar_url, is_verified, 
              birth_date, education_level, experience_level, city, province,
              min_salary_expect, max_salary_expect, bio, skills_overview,
              created_at, updated_at 
       FROM users WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  async updateById(id, update) {
    const fields = [];
    const values = [id];
    let idx = 2;

    const allowedColumns = [
      "name",
      "gender",
      "avatar_url",
      "birth_date",
      "education_level",
      "experience_level",
      "city",
      "province",
      "min_salary_expect",
      "max_salary_expect",
      "bio",
      "skills_overview",
    ];

    for (const key in update) {
      if (allowedColumns.includes(key) && update[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(update[key]);
        idx++;
      }
    }

    if (!fields.length) return this.findById(id);

    await pool.query(
      `UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $1`,
      values,
    );
    return this.findById(id);
  }

  async deleteById(id) {
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
  }

  async updateUserSkills(userId, cvId, skills) {
    if (!skills || skills.length === 0) {
      console.log(`No skills to update for user ${userId}`);
      return;
    }

    try {
      let skillsUpdated = 0;

      for (const skill of skills) {
        let skillId = null;
        let skillName = null;
        let confidence = 0.5;

        if (typeof skill === "string") {
          skillName = skill;
        } else if (skill.skill_id) {
          skillId = skill.skill_id;
          confidence = skill.confidence || 0.5;
        } else if (skill.name) {
          skillName = skill.name;
          confidence = skill.confidence || 0.5;
        }

        // If we don't have skill_id, lookup from master skills table
        if (!skillId && skillName) {
          const skillResult = await pool.query(
            `SELECT id FROM skills WHERE name ILIKE $1 LIMIT 1`,
            [skillName],
          );

          if (skillResult.rows.length > 0) {
            skillId = skillResult.rows[0].id;
          } else {
            const newSkillResult = await pool.query(
              `INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
              [skillName],
            );
            skillId = newSkillResult.rows[0].id;
            console.log(
              `[Skills] Created new skill in master table: ${skillName}`,
            );
          }
        }

        // Save to cv_skills
        if (skillId) {
          await pool.query(
            `INSERT INTO cv_skills (cv_id, skill_id, confidence)
             VALUES ($1, $2, $3)
             ON CONFLICT (cv_id, skill_id) DO UPDATE SET confidence = $3`,
            [cvId, skillId, confidence],
          );
          skillsUpdated++;
        }
      }

      console.log(`✓ Updated ${skillsUpdated} skills for CV ${cvId}`);
    } catch (error) {
      console.error(`Error updating skills for CV ${cvId}:`, error);
      throw error;
    }
  }
  async saveRecommendations(userId, cvId, recommendations) {
    if (!recommendations || recommendations.length === 0) {
      console.log(`No recommendations to save for user ${userId}`);
      return;
    }

    const normalizeSkills = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter(Boolean);
      return [];
    };

    const normalizeRecommendation = (rec) => {
      const analysis = rec?.analysis || rec?.result || rec;

      return {
        ...rec,
        skill_match: normalizeSkills(
          rec.skill_match ??
            rec.skillMatches ??
            rec.skills_match ??
            analysis?.skill_match ??
            analysis?.skillMatches ??
            analysis?.skills_match,
        ),
        skill_gap: normalizeSkills(
          rec.skill_gap ??
            rec.skillGaps ??
            rec.skills_gap ??
            analysis?.skill_gap ??
            analysis?.skillGaps ??
            analysis?.skills_gap,
        ),
        ai_insight:
          rec.ai_insight ??
          rec.aiInsight ??
          analysis?.ai_insight ??
          analysis?.aiInsight ??
          null,
        match_score:
          rec.match_score ??
          rec.matchScore ??
          analysis?.match_score ??
          analysis?.matchScore,
        job_title:
          rec.job_title ??
          rec.job_title_snapshot ??
          analysis?.job_title ??
          analysis?.job_title_snapshot,
        company:
          rec.company ??
          rec.company_snapshot ??
          analysis?.company ??
          analysis?.company_snapshot,
      };
    };

    try {
      console.log(
        `[AI Save] Saving ${recommendations.length} recommendations for user ${userId}, cv ${cvId}`,
      );
      const savedRecommendations = [];

      for (const rawRec of recommendations) {
        const rec = normalizeRecommendation(rawRec);
        console.log(
          `[AI Save] Processing recommendation for job ${rec.job_id} (score: ${rec.match_score})`,
        );

        const { rows } = await pool.query(
          `INSERT INTO analysis_history (user_id, cv_id, job_id, match_score, job_title_snapshot, company_snapshot)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            userId,
            cvId,
            rec.job_id,
            rec.match_score,
            rec.job_title,
            rec.company,
          ],
        );

        const analysisId = rows[0].id;
        console.log(`[AI Save] Created analysis_history id=${analysisId}`);

        if (rec.skill_match && rec.skill_match.length > 0) {
          for (const skillName of rec.skill_match) {
            let skillResult = await pool.query(
              `SELECT id FROM skills WHERE name ILIKE $1 LIMIT 1`,
              [skillName],
            );

            if (skillResult.rows.length === 0) {
              const newSkill = await pool.query(
                `INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
                [skillName],
              );
              skillResult = newSkill;
              console.log(`[AI Save] Created master skill: ${skillName}`);
            }

            const skillId = skillResult.rows[0].id;
            await pool.query(
              `INSERT INTO analysis_details (analysis_id, skill_id, skill_name_snapshot, status, ai_insight)
               VALUES ($1, $2, $3, $4, $5)`,
              [analysisId, skillId, skillName, "match", rec.ai_insight || null],
            );
            console.log(
              `[AI Save] Saved analysis_detail (match) for analysis ${analysisId}, skill ${skillName}`,
            );
          }
        }

        if (rec.skill_gap && rec.skill_gap.length > 0) {
          for (const skillName of rec.skill_gap) {
            let skillResult = await pool.query(
              `SELECT id FROM skills WHERE name ILIKE $1 LIMIT 1`,
              [skillName],
            );

            if (skillResult.rows.length === 0) {
              const newSkill = await pool.query(
                `INSERT INTO skills (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
                [skillName],
              );
              skillResult = newSkill;
              console.log(`[AI Save] Created master skill: ${skillName}`);
            }

            const skillId = skillResult.rows[0].id;
            await pool.query(
              `INSERT INTO analysis_details (analysis_id, skill_id, skill_name_snapshot, status, ai_insight)
               VALUES ($1, $2, $3, $4, $5)`,
              [analysisId, skillId, skillName, "gap", rec.ai_insight || null],
            );
            console.log(
              `[AI Save] Saved analysis_detail (gap) for analysis ${analysisId}, skill ${skillName}`,
            );
          }
        }

        savedRecommendations.push({
          analysis_id: analysisId,
          job_id: rec.job_id,
          match_score: rec.match_score,
        });
      }

      console.log(
        `✓ Saved ${savedRecommendations.length} recommendations + details for user ${userId}`,
      );
      return savedRecommendations;
    } catch (error) {
      console.error(`Error saving recommendations for user ${userId}:`, error);
      throw error;
    }
  }
}

export default new UserRepository();
