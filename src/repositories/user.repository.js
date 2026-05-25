import pool from "../config/db.js";

class UserRepository {
  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, name, email, gender, avatar_url, is_verified, created_at, updated_at FROM users WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  async updateById(id, update) {
    const fields = [];
    const values = [id];
    let idx = 2;

    const allowedColumns = ["name", "gender", "avatar_url"];

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
}

export default new UserRepository();
