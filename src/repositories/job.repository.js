const pool = require("../config/db");

class JobRepository {
  async findAll() {
    const result = await pool.query("SELECT * FROM jobs");
    return result.rows;
  }

  async findById(id) {
    const result = await pool.query("SELECT * FROM jobs WHERE id = $1", [id]);
    return result.rows[0];
  }

  async create(data) {
    const {
      title,
      company_name,
      category,
      experience_level,
      job_type,
      requirements,
      location,
      gender_required,
      salary,
      external_url,
      source,
      is_active,
      scraped_at,
    } = data;

    const result = await pool.query(
      `INSERT INTO jobs (title, company_name, category, experience_level, job_type, requirements, location, gender_required, salary, external_url, source, is_active, scraped_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        title,
        company_name,
        category,
        experience_level,
        job_type,
        requirements,
        location,
        gender_required,
        salary,
        external_url,
        source,
        is_active,
        scraped_at,
      ],
    );
    return result.rows[0];
  }

  async update(id, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);

    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(", ");

    const result = await pool.query(
      `UPDATE jobs SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return result.rows[0];
  }

  async delete(id) {
    await pool.query("DELETE FROM jobs WHERE id = $1", [id]);
  }
}

module.exports = new JobRepository();
