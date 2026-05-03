import pool from "../config/db.js";

class JobRepository {
  async findAll({ page = 1, limit = 10, search, location }) {
    const values = [];
    let query = "SELECT * FROM jobs WHERE 1=1";

    // filtering
    if (search) {
      values.push(`%${search}%`);
      query += ` AND title ILIKE $${values.length}`;
    }

    if (location) {
      values.push(`%${location}%`);
      query += ` AND location ILIKE $${values.length}`;
    }

    // pagination
    const offset = (page - 1) * limit;
    values.push(limit);
    values.push(offset);

    query += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const data = await pool.query(query, values);

    // count (ikut filter)
    const countQuery = query
      .replace("SELECT *", "SELECT COUNT(*)")
      .split("LIMIT")[0];

    const countValues = values.slice(0, values.length - 2);

    const countResult = await pool.query(countQuery, countValues);

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
    const result = await pool.query("SELECT * FROM jobs WHERE id = $1", [id]);
    return result.rows[0];
  }
}

export default new JobRepository();
