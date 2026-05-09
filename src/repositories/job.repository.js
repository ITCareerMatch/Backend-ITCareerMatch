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
    let query = `
      SELECT j.id, j.title, j.company_name, j.city, j.province, j.location, j.salary_raw, j.salary_min, j.salary_max, j.min_age, j.max_age, j.age_note, j.education_level, j.gender_required, j.job_type, j.work_system, j.requirements, j.created_at, j.updated_at,
      (
        SELECT json_agg(s.name)
        FROM job_skills js
        JOIN skills s ON s.id = js.skill_id
        WHERE js.job_id = j.id
      ) as skills
      FROM jobs j
      WHERE j.is_active = true
    `;

    const values = [];

    // SEARCH
    if (search) {
      values.push(`%${search}%`);
      query += ` AND j.title ILIKE $${values.length}`;
    }

    // CITY
    if (city) {
      values.push(city);
      query += ` AND j.city ILIKE $${values.length}`;
    }

    // PROVINCE
    if (province) {
      values.push(province);
      query += ` AND j.province ILIKE $${values.length}`;
    }

    // MIN AGE
    if (minAge) {
      values.push(minAge);
      query += ` AND j.min_age >= $${values.length}`;
    }

    // MAX AGE
    if (maxAge) {
      values.push(maxAge);
      query += ` AND j.max_age <= $${values.length}`;
    }

    // EDUCATION LEVEL
    if (education_level) {
      values.push(education_level);
      query += ` AND j.education_level ILIKE $${values.length}`;
    }

    // GENDER
    if (gender) {
      values.push(gender);
      query += ` AND j.gender_required ILIKE $${values.length}`;
    }

    // SALARY RANGE
    if (minSalary) {
      values.push(minSalary);
      query += ` AND j.salary_min >= $${values.length}`;
    }

    if (maxSalary) {
      values.push(maxSalary);
      query += ` AND j.salary_max <= $${values.length}`;
    }

    // JOB TYPE
    if (job_type) {
      values.push(job_type);
      query += ` AND j.job_type ILIKE $${values.length}`;
    }

    // WORK SYSTEM
    if (work_system) {
      values.push(work_system);
      query += ` AND j.work_system ILIKE $${values.length}`;
    }

    // PAGINATION
    const offset = (page - 1) * limit;
    values.push(limit, offset);

    query += ` ORDER BY j.created_at DESC`;
    query += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const data = await pool.query(query, values);

    // COUNT QUERY
    let countQuery = `
      SELECT COUNT(*) FROM jobs j WHERE j.is_active = true
    `;
    if (search) countQuery += ` AND j.title ILIKE '%${search}%'`;
    if (city) countQuery += ` AND j.city ILIKE '%${city}%'`;
    if (province) countQuery += ` AND j.province ILIKE '%${province}%'`;
    if (minSalary) countQuery += ` AND j.salary_min >= ${minSalary}`;
    if (maxSalary) countQuery += ` AND j.salary_max <= ${maxSalary}`;
    if (minAge) countQuery += ` AND j.min_age >= ${minAge}`;
    if (maxAge) countQuery += ` AND j.max_age <= ${maxAge}`;
    if (education_level)
      countQuery += ` AND j.education_level ILIKE '%${education_level}%'`;
    if (gender) countQuery += ` AND j.gender_required ILIKE '%${gender}%'`;
    if (job_type) countQuery += ` AND j.job_type ILIKE '%${job_type}%'`;
    if (work_system)
      countQuery += ` AND j.work_system ILIKE '%${work_system}%'`;

    const countResult = await pool.query(countQuery);

    return {
      data: data.rows,
      meta: {
        page,
        limit,
        total: Number(countResult.rows[0].count),
      },
    };
  }

  async findById(id) {
    const query = `
      SELECT j.id, j.title, j.company_name, j.city, j.province, j.location, j.salary_raw, j.salary_min, j.salary_max, j.min_age, j.max_age, j.age_note, j.education_level, j.gender_required, j.job_type, j.work_system, j.requirements, j.created_at, j.updated_at,
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
