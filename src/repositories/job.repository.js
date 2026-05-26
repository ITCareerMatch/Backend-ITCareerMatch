import pool from "../config/db.js";

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
    let baseWhere = ` WHERE j.is_active = true`;
    const values = [];

    // SEARCH
    if (search) {
      values.push(`%${search}%`);
      baseWhere += ` AND j.title ILIKE $${values.length}`;
    }

    // CITY
    if (city) {
      values.push(city);
      baseWhere += ` AND j.city ILIKE $${values.length}`;
    }

    // PROVINCE
    if (province) {
      values.push(province);
      baseWhere += ` AND j.province ILIKE $${values.length}`;
    }

    // MIN AGE
    if (minAge) {
      values.push(minAge);
      baseWhere += ` AND j.min_age >= $${values.length}`;
    }

    // MAX AGE
    if (maxAge) {
      values.push(maxAge);
      baseWhere += ` AND j.max_age <= $${values.length}`;
    }

    // EDUCATION LEVEL
    if (education_level) {
      values.push(education_level);
      baseWhere += ` AND j.education_level ILIKE $${values.length}`;
    }

    // GENDER
    if (gender) {
      values.push(gender);
      baseWhere += ` AND j.gender_required ILIKE $${values.length}`;
    }

    // SALARY RANGE
    if (minSalary) {
      values.push(minSalary);
      baseWhere += ` AND j.salary_min >= $${values.length}`;
    }

    if (maxSalary) {
      values.push(maxSalary);
      baseWhere += ` AND j.salary_max <= $${values.length}`;
    }

    // JOB TYPE
    if (job_type) {
      values.push(job_type);
      baseWhere += ` AND j.job_type ILIKE $${values.length}`;
    }

    // WORK SYSTEM
    if (work_system) {
      values.push(work_system);
      baseWhere += ` AND j.work_system ILIKE $${values.length}`;
    }

    const countQuery = `SELECT COUNT(*) FROM jobs j ${baseWhere}`;
    const countResult = await pool.query(countQuery, values);
    const total = Number(countResult.rows[0].count);

    const offset = (page - 1) * limit;

    values.push(limit);
    const limitParamIndex = values.length;

    values.push(offset);
    const offsetParamIndex = values.length;

    const mainQuery = `
      SELECT j.id, j.title, j.company_name, j.external_url, j.city, j.province, j.location, j.salary_raw, j.salary_min, j.salary_max, j.min_age, j.max_age, j.age_note, j.education_level, j.gender_required, j.job_type, j.work_system, j.requirements, j.created_at, j.updated_at,
      (
        SELECT json_agg(s.name)
        FROM job_skills js
        JOIN skills s ON s.id = js.skill_id
        WHERE js.job_id = j.id
      ) as skills
      FROM jobs j
      ${baseWhere}
      ORDER BY j.created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const data = await pool.query(mainQuery, values);

    return {
      data: data.rows,
      meta: {
        page,
        limit,
        total,
      },
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
