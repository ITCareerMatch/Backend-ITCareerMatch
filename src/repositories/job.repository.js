import pool from "../config/db.js";
import {
  JOB_TYPE_MAP,
  WORK_SYSTEM_MAP,
  EDUCATION_LEVEL_MAP,
} from "../constants/jobFilters.js";

class JobRepository {
  async findAll({
    page,
    limit,
    search,
    city,
    province,
    minSalary,
    maxSalary,
    minAge,
    maxAge,
    education_level,
    gender,
    job_type,
    work_system,
  }) {
    let baseWhere = `WHERE j.is_active = true`;
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      baseWhere += ` AND (j.title ILIKE $${values.length} OR j.company_name ILIKE $${values.length})`;
    }

    if (city) {
      values.push(`%${city}%`);
      baseWhere += ` AND j.city ILIKE $${values.length}`;
    }

    if (province) {
      values.push(`%${province}%`);
      baseWhere += ` AND j.province ILIKE $${values.length}`;
    }

    if (minAge !== undefined) {
      values.push(minAge);
      baseWhere += ` AND (j.min_age IS NULL OR j.min_age <= $${values.length})`;
    }

    if (maxAge !== undefined) {
      values.push(maxAge);
      baseWhere += ` AND (j.max_age IS NULL OR j.max_age >= $${values.length})`;
    }

    if (education_level) {
      const educationHierarchy = {
        sma: 1,
        d3: 2,
        s1: 3,
        s2: 4,
      };

      const userEducationLevel =
        educationHierarchy[education_level.toLowerCase()] || 0;

      values.push(userEducationLevel);
      const educationParamIdx = values.length;

      baseWhere += ` AND (
        j.education_level = 'terbuka untuk semua jenjang dan jurusan' OR
        (CASE 
          WHEN j.education_level = 'Minimal SMA/SMK' THEN 1
          WHEN j.education_level = 'Minimal Diploma (D1 - D4)' THEN 2
          WHEN j.education_level = 'Minimal Sarjana (S1)' THEN 3
          WHEN j.education_level = 'Minimal Pasca Sarjana (S2)' THEN 4
          ELSE 0
        END) <= $${educationParamIdx}
      )`;
    }

    if (gender) {
      const genderLower = gender.toLowerCase();
      if (genderLower === "laki-laki") {
        baseWhere += ` AND (j.gender_required = 'Laki-laki saja' OR j.gender_required = 'tanpa ketentuan')`;
      } else if (genderLower === "perempuan") {
        baseWhere += ` AND (j.gender_required = 'Perempuan saja' OR j.gender_required = 'tanpa ketentuan')`;
      }
    }

    if (minSalary !== undefined) {
      values.push(minSalary);
      baseWhere += ` AND j.salary_min >= $${values.length}`;
    }

    if (maxSalary !== undefined) {
      values.push(maxSalary);
      baseWhere += ` AND (j.salary_max IS NULL OR j.salary_max <= $${values.length})`;
    }

    // Job type: translate dari enum key ke nilai DB
    if (job_type) {
      const dbJobType = JOB_TYPE_MAP[job_type.toLowerCase()];
      if (dbJobType) {
        values.push(dbJobType);
        baseWhere += ` AND j.job_type = $${values.length}`;
      }
    }

    // Work system: translate dari enum key ke nilai DB
    if (work_system) {
      const dbWorkSystem = WORK_SYSTEM_MAP[work_system.toLowerCase()];
      if (dbWorkSystem) {
        values.push(dbWorkSystem);
        baseWhere += ` AND j.work_system = $${values.length}`;
      }
    }

    // COUNT
    const countQuery = `SELECT COUNT(*) FROM jobs j ${baseWhere}`;
    const countResult = await pool.query(countQuery, values);
    const total = Number(countResult.rows[0].count);

    const offset = (page - 1) * limit;
    const selectValues = [...values, limit, offset];

    const mainQuery = `
      SELECT 
        j.id, j.title, j.company_name, j.external_url,
        j.city, j.province, j.location,
        j.salary_raw, j.salary_min, j.salary_max,
        j.min_age, j.max_age, j.age_note,
        j.education_level, j.gender_required,
        j.job_type, j.work_system,
        j.requirements, j.created_at, j.updated_at,
        (
          SELECT json_agg(s.name)
          FROM job_skills js
          JOIN skills s ON s.id = js.skill_id
          WHERE js.job_id = j.id
        ) AS skills
      FROM jobs j
      ${baseWhere}
      ORDER BY j.created_at DESC
      LIMIT $${selectValues.length - 1} OFFSET $${selectValues.length}
    `;

    const data = await pool.query(mainQuery, selectValues);

    return {
      data: data.rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id) {
    const query = `
      SELECT j.id, j.title, j.company_name, j.external_url, j.city, j.province, j.location, j.salary_raw, j.salary_min, j.salary_max, j.min_age, j.max_age, j.age_note, j.education_level, j.gender_required, j.job_type, j.work_system, j.requirements, j.created_at, j.updated_at,
      (
        SELECT json_agg(s.name)
        FROM job_skills js
        JOIN skills s ON s.id = js.skill_id
        WHERE js.job_id = j.id
      ) as skills
      FROM jobs j
      WHERE j.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

export default new JobRepository();
