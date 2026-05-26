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
      baseWhere += ` AND (j.min_age IS NULL OR j.min_age >= $${values.length})`;
    }

    if (maxAge !== undefined) {
      values.push(maxAge);
      baseWhere += ` AND (j.max_age IS NULL OR j.max_age <= $${values.length})`;
    }

    // Education: translate dari enum key ke nilai DB
    if (education_level) {
      const dbValue = EDUCATION_LEVEL_MAP[education_level.toLowerCase()];
      if (dbValue) {
        values.push(dbValue);
        baseWhere += ` AND j.education_level = $${values.length}`;
      }
    }

    // Gender
    if (gender) {
      const genderMap = {
        "laki-laki": "Laki-laki saja",
        perempuan: "Perempuan saja",
        semua: "tanpa ketentuan",
      };
      const dbGender = genderMap[gender.toLowerCase()];
      if (dbGender) {
        values.push(dbGender);
        baseWhere += ` AND j.gender_required = $${values.length}`;
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

    // PAGINATION
    const offset = (page - 1) * limit;
    values.push(limit);
    const limitIdx = values.length;
    values.push(offset);
    const offsetIdx = values.length;

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
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const data = await pool.query(mainQuery, values);

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
